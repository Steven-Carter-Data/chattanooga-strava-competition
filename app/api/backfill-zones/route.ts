import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAthleteAccessToken } from '@/lib/strava';
import { calculateHRZonesWithCustomBoundaries } from '@/lib/strava-zones';

/**
 * POST /api/backfill-zones
 *
 * Backfills the `corrected_zone_points` column for all activities.
 *
 * - Ride/Peloton activities: fetches HR stream from Strava, recalculates
 *   zone times using the athlete's DEFAULT HR zone boundaries, and writes
 *   corrected points. (~1 API call per ride activity)
 * - Swim activities: copies zone_points as-is (swim uses 4x time multiplier,
 *   not HR zone scoring, so zone boundaries don't affect them)
 * - All other activities: copies zone_points as-is (they already use default zones)
 *
 * DOES NOT modify zone_points, heart_rate_zones, or any other existing column.
 * Only writes to corrected_zone_points.
 *
 * Rate limited to ~80 API calls per 15-minute window to stay under Strava's
 * 100 req/15min limit. Total runtime ~70 min for ~372 ride activities.
 */

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// Bike sport types that use Strava's ride-specific zones
const RIDE_SPORT_TYPES = [
  'Ride', 'Peloton', 'VirtualRide', 'EBikeRide', 'EMountainBikeRide',
  'GravelRide', 'MountainBikeRide', 'Velomobile', 'Handcycle',
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calcPoints(zones: { zone_1: number; zone_2: number; zone_3: number; zone_4: number; zone_5: number }): number {
  return (zones.zone_1 / 60) * 1 + (zones.zone_2 / 60) * 2 + (zones.zone_3 / 60) * 3 + (zones.zone_4 / 60) * 4 + (zones.zone_5 / 60) * 5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST() {
  const startTime = Date.now();
  const report: any = {
    started_at: new Date().toISOString(),
    athletes: [],
    summary: {
      total_athletes: 0,
      total_ride_activities_corrected: 0,
      total_ride_activities_failed: 0,
      total_non_ride_activities_copied: 0,
      total_api_calls: 0,
      total_original_ride_points: 0,
      total_corrected_ride_points: 0,
      total_point_difference: 0,
    },
  };

  try {
    // Get all athletes with their default HR zones
    const { data: athletes, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('id, strava_athlete_id, firstname, lastname, hr_zones')
      .order('firstname');

    if (athleteError || !athletes) {
      return NextResponse.json({ error: 'Failed to fetch athletes', details: athleteError }, { status: 500 });
    }

    report.summary.total_athletes = athletes.length;

    for (const athlete of athletes) {
      const athleteReport: any = {
        name: `${athlete.firstname} ${athlete.lastname}`,
        ride_corrected: 0,
        ride_failed: 0,
        non_ride_copied: 0,
        original_ride_points: 0,
        corrected_ride_points: 0,
        ride_difference: 0,
        activities: [],
      };

      // ----------------------------------------------------------
      // Step 1: Copy zone_points → corrected_zone_points for ALL
      // non-ride activities (they already use default zones).
      // This is a DB-only operation, no API calls.
      // ----------------------------------------------------------
      const { data: nonRideActivities } = await supabaseAdmin
        .from('activities')
        .select('id, zone_points, sport_type')
        .eq('athlete_id', athlete.id)
        .eq('in_competition_window', true)
        .not('sport_type', 'in', `(${RIDE_SPORT_TYPES.map(t => `"${t}"`).join(',')})`)
        .is('corrected_zone_points', null);

      if (nonRideActivities && nonRideActivities.length > 0) {
        for (const act of nonRideActivities) {
          await supabaseAdmin
            .from('activities')
            .update({ corrected_zone_points: act.zone_points })
            .eq('id', act.id);
        }
        athleteReport.non_ride_copied = nonRideActivities.length;
        report.summary.total_non_ride_activities_copied += nonRideActivities.length;
      }

      // ----------------------------------------------------------
      // Step 2: Recalculate ride activities using default zones.
      // Requires HR stream from Strava API (1 call per activity).
      // ----------------------------------------------------------
      if (!athlete.hr_zones?.zones) {
        athleteReport.warning = 'No default zones in DB — ride activities cannot be corrected';
        report.athletes.push(athleteReport);
        continue;
      }

      const defaultZones = athlete.hr_zones.zones;

      const accessToken = await getAthleteAccessToken(athlete.strava_athlete_id);
      if (!accessToken) {
        athleteReport.warning = 'Could not get access token — ride activities skipped';
        report.athletes.push(athleteReport);
        continue;
      }

      // Get all ride activities that haven't been corrected yet
      const { data: rideActivities } = await supabaseAdmin
        .from('activities')
        .select('id, strava_activity_id, name, sport_type, moving_time_s, zone_points, average_heartrate, start_date')
        .eq('athlete_id', athlete.id)
        .eq('in_competition_window', true)
        .in('sport_type', RIDE_SPORT_TYPES)
        .is('corrected_zone_points', null)
        .order('start_date', { ascending: true });

      if (!rideActivities || rideActivities.length === 0) {
        athleteReport.info = 'No uncorrected ride activities';
        report.athletes.push(athleteReport);
        continue;
      }

      console.log(`[Backfill] ${athlete.firstname} ${athlete.lastname}: ${rideActivities.length} ride activities to process`);

      for (const activity of rideActivities) {
        // Rate limiting: ~5 seconds between calls = ~180 calls per 15 min
        // Strava allows 100/15min but many calls fail (no HR stream), so 5s is safe
        if (report.summary.total_api_calls > 0) {
          await delay(5000);
        }

        // Activities without HR data — use zone_points as-is (likely Zone 1 fallback)
        if (!activity.average_heartrate) {
          await supabaseAdmin
            .from('activities')
            .update({ corrected_zone_points: activity.zone_points })
            .eq('id', activity.id);

          athleteReport.activities.push({
            name: activity.name,
            sport_type: activity.sport_type,
            strava_id: activity.strava_activity_id,
            action: 'copied (no HR data)',
            original_points: activity.zone_points,
            corrected_points: activity.zone_points,
            difference: 0,
          });
          athleteReport.ride_corrected++;
          continue;
        }

        // Fetch HR stream from Strava
        let hrStream: number[] | null = null;
        let timeStream: number[] | null = null;

        try {
          const resp = await fetch(
            `${STRAVA_API_BASE}/activities/${activity.strava_activity_id}/streams?keys=heartrate,time&key_by_type=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          report.summary.total_api_calls++;

          if (resp.status === 429) {
            // Rate limited — wait 60 seconds and retry once
            console.log(`[Backfill] Rate limited at API call ${report.summary.total_api_calls}. Waiting 60s...`);
            await delay(60000);
            const retry = await fetch(
              `${STRAVA_API_BASE}/activities/${activity.strava_activity_id}/streams?keys=heartrate,time&key_by_type=true`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            report.summary.total_api_calls++;
            if (retry.ok) {
              const d = await retry.json();
              hrStream = d.heartrate?.data || null;
              timeStream = d.time?.data || null;
            }
          } else if (resp.ok) {
            const d = await resp.json();
            hrStream = d.heartrate?.data || null;
            timeStream = d.time?.data || null;
          }
        } catch (err) {
          console.error(`[Backfill] Error fetching stream for ${activity.strava_activity_id}:`, err);
        }

        if (!hrStream || !timeStream) {
          // Can't recalculate — leave corrected_zone_points as NULL
          athleteReport.ride_failed++;
          report.summary.total_ride_activities_failed++;
          athleteReport.activities.push({
            name: activity.name,
            sport_type: activity.sport_type,
            strava_id: activity.strava_activity_id,
            action: 'FAILED — could not fetch HR stream',
            original_points: activity.zone_points,
          });
          console.log(`[Backfill] Failed to get HR stream for ${activity.strava_activity_id}`);
          continue;
        }

        // Recalculate zones using default boundaries
        const correctedZones = calculateHRZonesWithCustomBoundaries(hrStream, timeStream, defaultZones);
        const correctedPoints = round2(calcPoints(correctedZones));
        const originalPoints = activity.zone_points || 0;
        const difference = round2(correctedPoints - originalPoints);

        // Write ONLY to corrected_zone_points — never touch zone_points
        await supabaseAdmin
          .from('activities')
          .update({ corrected_zone_points: correctedPoints })
          .eq('id', activity.id);

        athleteReport.ride_corrected++;
        athleteReport.original_ride_points += originalPoints;
        athleteReport.corrected_ride_points += correctedPoints;
        report.summary.total_ride_activities_corrected++;
        report.summary.total_original_ride_points += originalPoints;
        report.summary.total_corrected_ride_points += correctedPoints;

        athleteReport.activities.push({
          name: activity.name,
          sport_type: activity.sport_type,
          date: activity.start_date,
          strava_id: activity.strava_activity_id,
          action: 'corrected',
          original_points: round2(originalPoints),
          corrected_points: correctedPoints,
          difference: difference,
          corrected_zones: correctedZones,
        });

        console.log(`[Backfill] ${athlete.firstname} - ${activity.name}: ${originalPoints} → ${correctedPoints} (${difference >= 0 ? '+' : ''}${difference})`);
      }

      athleteReport.ride_difference = round2(athleteReport.corrected_ride_points - athleteReport.original_ride_points);
      report.athletes.push(athleteReport);
    }

    // Finalize report
    report.summary.total_point_difference = round2(
      report.summary.total_corrected_ride_points - report.summary.total_original_ride_points
    );
    report.completed_at = new Date().toISOString();
    report.runtime_minutes = round2((Date.now() - startTime) / 60000);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    report.error = String(error);
    report.completed_at = new Date().toISOString();
    report.runtime_minutes = round2((Date.now() - startTime) / 60000);
    return NextResponse.json(report, { status: 500 });
  }
}
