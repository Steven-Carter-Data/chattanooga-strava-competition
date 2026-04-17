import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAthleteAccessToken } from '@/lib/strava';
import {
  fetchActivityZones,
  extractHRZoneTimes,
  calculateHRZonesWithCustomBoundaries,
} from '@/lib/strava-zones';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

/** Small delay to avoid Strava rate limits (100 req / 15 min = ~9s per request) */
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/investigate-zones
 *
 * READ-ONLY investigation — NO database writes.
 *
 * Processes ALL ride/Peloton activities for each athlete to quantify the
 * point impact of Strava applying sport-specific "Ride" zones instead of
 * default zones. Includes rate limiting delays.
 *
 * Query params:
 *   ?athlete=firstname  — process only one athlete (for retrying after rate limit)
 */
export async function GET(request: NextRequest) {
  try {
    const athleteFilter = request.nextUrl.searchParams.get('athlete');

    // Get all athletes
    let query = supabaseAdmin
      .from('athletes')
      .select('id, strava_athlete_id, firstname, lastname, hr_zones')
      .order('firstname');

    const { data: athletes, error: athleteError } = await query;

    if (athleteError || !athletes) {
      return NextResponse.json({ error: 'Failed to fetch athletes', details: athleteError }, { status: 500 });
    }

    const filteredAthletes = athleteFilter
      ? athletes.filter(a => a.firstname?.toLowerCase().includes(athleteFilter.toLowerCase()))
      : athletes;

    // The bike sport types we classify as "Ride" or "Peloton"
    const rideTypes = ['Ride', 'Peloton', 'VirtualRide', 'EBikeRide', 'EMountainBikeRide',
      'GravelRide', 'MountainBikeRide', 'Velomobile', 'Handcycle'];

    const athleteResults: any[] = [];
    let grandTotalCurrentRidePoints = 0;
    let grandTotalDefaultRidePoints = 0;
    let grandTotalRideActivities = 0;
    let apiCallCount = 0;

    for (const athlete of filteredAthletes) {
      if (!athlete.hr_zones?.zones) {
        athleteResults.push({
          name: `${athlete.firstname} ${athlete.lastname}`,
          warning: 'No default zones stored — skipped',
        });
        continue;
      }

      const accessToken = await getAthleteAccessToken(athlete.strava_athlete_id);
      if (!accessToken) {
        athleteResults.push({
          name: `${athlete.firstname} ${athlete.lastname}`,
          warning: 'Could not get access token — skipped',
        });
        continue;
      }

      const defaultZones = athlete.hr_zones.zones;

      // Get ALL ride/Peloton activities for this athlete
      const { data: rideActivities } = await supabaseAdmin
        .from('activities')
        .select('id, strava_activity_id, name, sport_type, moving_time_s, average_heartrate, zone_points, start_date')
        .eq('athlete_id', athlete.id)
        .eq('in_competition_window', true)
        .in('sport_type', rideTypes)
        .not('average_heartrate', 'is', null)
        .order('start_date', { ascending: false });

      // Also get total non-ride points from DB for context
      const { data: nonRideActivities } = await supabaseAdmin
        .from('activities')
        .select('zone_points, sport_type')
        .eq('athlete_id', athlete.id)
        .eq('in_competition_window', true)
        .not('sport_type', 'in', `(${rideTypes.map(t => `"${t}"`).join(',')})`)
        .not('zone_points', 'is', null);

      const nonRideTotalPoints = (nonRideActivities || []).reduce((sum, a) => sum + (a.zone_points || 0), 0);

      if (!rideActivities || rideActivities.length === 0) {
        athleteResults.push({
          name: `${athlete.firstname} ${athlete.lastname}`,
          ride_activities: 0,
          non_ride_points: round2(nonRideTotalPoints),
          warning: 'No ride activities with HR data',
        });
        continue;
      }

      let athleteCurrentRidePoints = 0;
      let athleteDefaultRidePoints = 0;
      let athleteAnalyzed = 0;
      let athleteFailed = 0;

      // Per sport_type breakdown
      const sportBreakdown: Record<string, {
        count: number;
        currentPoints: number;
        defaultPoints: number;
        difference: number;
        activities: any[];
      }> = {};

      for (const activity of rideActivities) {
        const sportType = activity.sport_type;
        if (!sportBreakdown[sportType]) {
          sportBreakdown[sportType] = { count: 0, currentPoints: 0, defaultPoints: 0, difference: 0, activities: [] };
        }

        // Rate limit: wait between API calls
        if (apiCallCount > 0 && apiCallCount % 2 === 0) {
          await delay(1200); // ~1.2s between pairs of calls
        }

        // Fetch Strava activity zones
        const stravaActivityZones = await fetchActivityZones(activity.strava_activity_id, accessToken);
        apiCallCount++;

        if (!stravaActivityZones) {
          athleteFailed++;
          sportBreakdown[sportType].activities.push({
            name: activity.name, strava_id: activity.strava_activity_id,
            error: 'Failed to fetch activity zones',
          });
          continue;
        }

        const stravaZoneTimes = extractHRZoneTimes(stravaActivityZones, activity.moving_time_s);
        if (!stravaZoneTimes) { athleteFailed++; continue; }

        // Get boundaries Strava applied
        const hrZoneData = stravaActivityZones.find(z => z.type === 'heartrate');
        const activityBoundaries = hrZoneData?.distribution_buckets?.map(b => ({ min: b.min, max: b.max }));

        // Fetch HR stream for default-zone recalculation
        await delay(600);
        let hrStream: number[] | null = null;
        let timeStream: number[] | null = null;
        try {
          const resp = await fetch(
            `${STRAVA_API_BASE}/activities/${activity.strava_activity_id}/streams?keys=heartrate,time&key_by_type=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          apiCallCount++;
          if (resp.ok) {
            const d = await resp.json();
            hrStream = d.heartrate?.data || null;
            timeStream = d.time?.data || null;
          } else if (resp.status === 429) {
            // Rate limited — wait 60s and retry once
            console.log('Rate limited, waiting 60s...');
            await delay(60000);
            const retry = await fetch(
              `${STRAVA_API_BASE}/activities/${activity.strava_activity_id}/streams?keys=heartrate,time&key_by_type=true`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            apiCallCount++;
            if (retry.ok) {
              const d = await retry.json();
              hrStream = d.heartrate?.data || null;
              timeStream = d.time?.data || null;
            }
          }
        } catch { /* ignore */ }

        if (!hrStream || !timeStream) {
          athleteFailed++;
          sportBreakdown[sportType].activities.push({
            name: activity.name, strava_id: activity.strava_activity_id,
            error: 'Failed to fetch HR stream',
          });
          continue;
        }

        // Calculate with default zones
        const defaultCalc = calculateHRZonesWithCustomBoundaries(hrStream, timeStream, defaultZones);
        const currentPoints = calcPoints(stravaZoneTimes);
        const defaultPoints = calcPoints(defaultCalc);
        const diff = currentPoints - defaultPoints;

        athleteCurrentRidePoints += currentPoints;
        athleteDefaultRidePoints += defaultPoints;
        athleteAnalyzed++;

        sportBreakdown[sportType].count++;
        sportBreakdown[sportType].currentPoints += currentPoints;
        sportBreakdown[sportType].defaultPoints += defaultPoints;
        sportBreakdown[sportType].difference += diff;
        sportBreakdown[sportType].activities.push({
          name: activity.name,
          date: activity.start_date,
          strava_id: activity.strava_activity_id,
          strava_boundaries: activityBoundaries,
          current_points: round2(currentPoints),
          default_points: round2(defaultPoints),
          difference: round2(diff),
          pct_diff: round2(defaultPoints > 0 ? (diff / defaultPoints) * 100 : 0),
        });
      }

      // Round sport breakdown
      for (const data of Object.values(sportBreakdown)) {
        data.currentPoints = round2(data.currentPoints);
        data.defaultPoints = round2(data.defaultPoints);
        data.difference = round2(data.difference);
      }

      const storedRideTotalPoints = (rideActivities || []).reduce((sum, a) => sum + (a.zone_points || 0), 0);

      grandTotalCurrentRidePoints += athleteCurrentRidePoints;
      grandTotalDefaultRidePoints += athleteDefaultRidePoints;
      grandTotalRideActivities += athleteAnalyzed;

      athleteResults.push({
        name: `${athlete.firstname} ${athlete.lastname}`,
        default_zones: defaultZones,
        ride_activities_total: rideActivities.length,
        ride_activities_analyzed: athleteAnalyzed,
        ride_activities_failed: athleteFailed,
        stored_ride_points: round2(storedRideTotalPoints),
        current_ride_points: round2(athleteCurrentRidePoints),
        default_ride_points: round2(athleteDefaultRidePoints),
        ride_point_difference: round2(athleteCurrentRidePoints - athleteDefaultRidePoints),
        ride_pct_difference: round2(
          athleteDefaultRidePoints > 0
            ? ((athleteCurrentRidePoints - athleteDefaultRidePoints) / athleteDefaultRidePoints) * 100
            : 0
        ),
        non_ride_points: round2(nonRideTotalPoints),
        total_with_current_rides: round2(nonRideTotalPoints + athleteCurrentRidePoints),
        total_with_default_rides: round2(nonRideTotalPoints + athleteDefaultRidePoints),
        sport_breakdown: sportBreakdown,
      });
    }

    return NextResponse.json({
      investigation: 'Full Ride Zone Impact Analysis',
      description: 'Quantifies the point difference between Strava ride-specific zones (currently used) vs default zones for ALL ride/Peloton activities per athlete.',
      api_calls_made: apiCallCount,
      overall_ride_impact: {
        athletes_processed: athleteResults.filter(a => !a.warning).length,
        total_ride_activities_analyzed: grandTotalRideActivities,
        total_current_ride_points: round2(grandTotalCurrentRidePoints),
        total_default_ride_points: round2(grandTotalDefaultRidePoints),
        total_ride_point_difference: round2(grandTotalCurrentRidePoints - grandTotalDefaultRidePoints),
        percent_ride_difference: round2(
          grandTotalDefaultRidePoints > 0
            ? ((grandTotalCurrentRidePoints - grandTotalDefaultRidePoints) / grandTotalDefaultRidePoints) * 100
            : 0
        ),
      },
      athletes: athleteResults,
    }, { status: 200 });
  } catch (error) {
    console.error('Investigation error:', error);
    return NextResponse.json({ error: 'Investigation failed', details: String(error) }, { status: 500 });
  }
}

function calcPoints(zones: { zone_1: number; zone_2: number; zone_3: number; zone_4: number; zone_5: number }): number {
  return (zones.zone_1 / 60) * 1 + (zones.zone_2 / 60) * 2 + (zones.zone_3 / 60) * 3 + (zones.zone_4 / 60) * 4 + (zones.zone_5 / 60) * 5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
