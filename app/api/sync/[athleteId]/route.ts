import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getActiveCompetitionConfig } from '@/lib/supabase';
import { getAthleteAccessToken } from '@/lib/strava';
import { fetchAthleteZones, fetchActivityZones, extractHRZoneTimes, calculateHRZonesWithCustomBoundaries } from '@/lib/strava-zones';
import {
  getActivityWeekNumber,
  isSwimCapWeek,
  getWeekDateRange,
  calculateCappedSwimPoints,
} from '@/lib/swim-cap';

// Activity types excluded from the competition
// These activities will not be synced or count toward points
const EXCLUDED_ACTIVITY_TYPES = ['Walk', 'AlpineSki', 'Golf'];

// Specific Strava activity IDs to exclude (e.g., watch malfunctions, bad data)
// These activities will be skipped during sync even if they exist in Strava
const EXCLUDED_STRAVA_ACTIVITY_IDS: number[] = [
  17285332190, // Matt Piunti - watch malfunction swim 1
  17285088903, // Matt Piunti - watch malfunction swim 2
  17398044743, // Golf activity - excluded activity type
  17441898611, // Manual correction - watch not started for first 8 min of run
  17997953649, // ROUVY ride - removed per user request
];

/**
 * POST /api/sync/[athleteId]
 * Manually sync activities for a specific athlete from Strava
 * This is a workaround for webhook subscription issues
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { athleteId } = await params;

    // Get athlete
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Get access token
    console.log('Fetching access token for strava_athlete_id:', athlete.strava_athlete_id);
    const accessToken = await getAthleteAccessToken(athlete.strava_athlete_id);
    if (!accessToken) {
      console.error('Failed to get access token for athlete:', athlete.strava_athlete_id);
      return NextResponse.json(
        { error: 'Failed to get access token. Please reconnect with Strava.' },
        { status: 401 }
      );
    }
    console.log('Access token retrieved successfully');

    // Fetch athlete's HR zone configuration from Strava
    const athleteZones = await fetchAthleteZones(accessToken);
    if (!athleteZones || !athleteZones.heart_rate || !athleteZones.heart_rate.zones) {
      console.warn('Could not fetch athlete HR zones from Strava, will use fallback calculation');
    } else {
      console.log('Athlete HR zones:', athleteZones.heart_rate.custom_zones ? 'Custom' : 'Auto', athleteZones.heart_rate.zones);

      // Store HR zones in athlete record for verification
      await supabaseAdmin
        .from('athletes')
        .update({
          hr_zones: {
            custom_zones: athleteZones.heart_rate.custom_zones,
            zones: athleteZones.heart_rate.zones,
          },
        })
        .eq('id', athleteId);
    }

    // Get competition config (automatically selects based on current date)
    const { data: config, error: configError } = await getActiveCompetitionConfig(supabaseAdmin);

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Competition config not found' },
        { status: 500 }
      );
    }

    const competitionStartDate = new Date(config.start_date);
    const competitionEndDate = new Date(config.end_date);
    const now = new Date();

    // Use the later of: competition start date or 90 days ago
    // This prevents querying future dates and limits historical data
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const queryStartDate = competitionStartDate > now ? ninetyDaysAgo : competitionStartDate;

    console.log('Fetching activities after:', queryStartDate.toISOString());

    // Fetch activities from Strava (after query start date)
    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(queryStartDate.getTime() / 1000)}&per_page=200`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      console.error('Strava API error:', {
        status: stravaResponse.status,
        statusText: stravaResponse.statusText,
        body: errorText,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch activities from Strava',
          details: `Status ${stravaResponse.status}: ${stravaResponse.statusText}`,
          stravaError: errorText,
        },
        { status: 500 }
      );
    }

    const activities = await stravaResponse.json();

    let newCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log(`Processing ${activities.length} activities from Strava`);
    console.log(`Competition window: ${competitionStartDate.toISOString()} to ${competitionEndDate.toISOString()}`);

    // Process each activity
    for (const activity of activities) {
      try {
        // Log activity details for debugging
        const activityType = activity.sport_type || activity.type;
        console.log(`Processing activity: ${activity.id} - ${activity.name} (${activityType}) on ${activity.start_date}`);

        // Filter out excluded activity types (e.g., Walk)
        if (EXCLUDED_ACTIVITY_TYPES.includes(activityType)) {
          console.log(`Skipping activity ${activity.id} - excluded type: ${activityType}`);
          skippedCount++;
          continue;
        }

        // Filter out specific excluded activity IDs (e.g., watch malfunctions)
        if (EXCLUDED_STRAVA_ACTIVITY_IDS.includes(activity.id)) {
          console.log(`Skipping activity ${activity.id} - in exclusion list (bad data)`);
          skippedCount++;
          continue;
        }

        // Filter activities by competition date range
        const activityDate = new Date(activity.start_date);
        if (activityDate < competitionStartDate || activityDate > competitionEndDate) {
          console.log(`Skipping activity ${activity.id} - outside competition dates (activity: ${activityDate.toISOString()})`);
          skippedCount++;
          continue;
        }

        // Check if activity already exists
        const { data: existingActivity } = await supabaseAdmin
          .from('activities')
          .select('id')
          .eq('strava_activity_id', activity.id)
          .single();

        if (existingActivity) {
          // Activity already exists, skip it (no need to re-sync)
          console.log(`Activity ${activity.id} already exists in database, skipping`);
          existingCount++;
          continue;
        } else {
          // New activity, insert it
          console.log(`Inserting new activity: ${activity.id} - ${activity.name}`);
          await insertActivity(activity, athlete.id, accessToken, athleteZones, competitionStartDate, competitionEndDate);
          newCount++;
        }
      } catch (error) {
        console.error(`Error processing activity ${activity.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: newCount > 0
        ? `Synced ${newCount} new activities`
        : 'All activities up to date',
      synced: newCount,
      existing: existingCount,
      skipped: skippedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Classify bike-related activities based on elevation data
 * - Activities with elevation gain → "Ride" (outdoor biking)
 * - Activities without elevation gain → "Peloton" (indoor biking)
 */
function classifyBikeActivity(activity: any): string {
  const sportType = activity.sport_type || activity.type;

  // List of ALL bike-related activity types from Strava API
  // Includes: Ride, VirtualRide, EBikeRide, EMountainBikeRide, GravelRide, MountainBikeRide, Velomobile, Handcycle
  const bikeTypes = [
    'Ride',
    'VirtualRide',
    'EBikeRide',
    'EMountainBikeRide',
    'GravelRide',
    'MountainBikeRide',
    'Velomobile',
    'Handcycle',
  ];

  // Check if this is a bike-related activity
  if (bikeTypes.includes(sportType)) {
    const elevation = activity.total_elevation_gain || 0;
    console.log(`Bike activity classification: ${sportType} with ${elevation}m elevation`);

    // If there's any elevation gain, it's an outdoor ride
    if (elevation > 0) {
      return 'Ride';
    } else {
      // No elevation = indoor/virtual = Peloton
      return 'Peloton';
    }
  }

  // Not a bike activity, return original type
  return sportType;
}

async function insertActivity(activity: any, athleteId: string, accessToken: string, athleteZones: any, competitionStart: Date, competitionEnd: Date) {
  // Fetch detailed activity data to get cadence (not included in list endpoint)
  let detailedActivity = activity;
  try {
    const detailResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (detailResponse.ok) {
      detailedActivity = await detailResponse.json();
      if (detailedActivity.average_cadence) {
        console.log(`Activity ${activity.id} cadence: ${detailedActivity.average_cadence} spm`);
      }
    }
  } catch (err) {
    console.warn(`Could not fetch detailed activity ${activity.id} for cadence:`, err);
  }

  // Classify bike activities based on elevation
  const classifiedSportType = classifyBikeActivity(activity);

  // Check if this is a swim activity - uses special 4x time multiplier scoring
  const isSwim = classifiedSportType === 'Swim';

  // Calculate Zone 1 fallback points (1 point per minute) for activities without HR data
  const zone1FallbackPoints = (activity.moving_time || 0) / 60;

  // Determine if activity has HR data (will be used to decide final points)
  const hasHRData = activity.average_heartrate != null || activity.max_heartrate != null;

  // Bike sport types that Strava applies ride-specific zones to
  const RIDE_SPORT_TYPES = ['Ride', 'Peloton', 'VirtualRide', 'EBikeRide', 'EMountainBikeRide',
    'GravelRide', 'MountainBikeRide', 'Velomobile', 'Handcycle'];
  const isRideActivity = RIDE_SPORT_TYPES.includes(classifiedSportType);

  // Fetch activity zones from Strava API (needed for HR zone scoring and swim cap overflow)
  const activityZones = await fetchActivityZones(activity.id, accessToken);
  let hrZones: { zone_1: number; zone_2: number; zone_3: number; zone_4: number; zone_5: number } | null = null;

  if (activityZones) {
    hrZones = extractHRZoneTimes(activityZones, activity.moving_time);
    if (hrZones) {
      console.log(`Fetched zones directly from Strava for activity ${activity.id}:`, hrZones);
    }
  }

  // For ride activities, also calculate zones using DEFAULT boundaries
  // This corrects for Strava's sport-specific ride zones being different from default
  let correctedZonePoints: number | undefined;
  if (isRideActivity && hasHRData && athleteZones?.heart_rate?.zones) {
    try {
      const streamResp = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=heartrate,time&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (streamResp.ok) {
        const streamData = await streamResp.json();
        const hrStream = streamData.heartrate?.data;
        const timeStream = streamData.time?.data;
        if (hrStream && timeStream) {
          const defaultCalc = calculateHRZonesWithCustomBoundaries(hrStream, timeStream, athleteZones.heart_rate.zones);
          correctedZonePoints = Math.round(
            ((defaultCalc.zone_1 / 60) * 1 + (defaultCalc.zone_2 / 60) * 2 + (defaultCalc.zone_3 / 60) * 3 +
             (defaultCalc.zone_4 / 60) * 4 + (defaultCalc.zone_5 / 60) * 5) * 100
          ) / 100;
          console.log(`Activity ${activity.id}: corrected points using default zones: ${correctedZonePoints}`);
        }
      }
    } catch (err) {
      console.warn(`Could not fetch HR stream for default zone correction on activity ${activity.id}:`, err);
    }
  }

  // Calculate swim points (with weekly cap logic for last 4 weeks)
  let zonePoints: number | undefined;
  if (isSwim) {
    const movingTimeS = activity.moving_time || 0;
    const activityDate = new Date(activity.start_date);
    const weekNum = getActivityWeekNumber(activityDate, competitionStart);
    const useSwimCap = isSwimCapWeek(weekNum, competitionStart, competitionEnd);

    if (useSwimCap) {
      // Get prior swim time for this athlete this week
      const { weekStart } = getWeekDateRange(weekNum, competitionStart);
      const weekEndQuery = new Date(weekStart);
      weekEndQuery.setDate(weekStart.getDate() + 7);

      const { data: priorSwims } = await supabaseAdmin
        .from('activities')
        .select('moving_time_s, strava_activity_id')
        .eq('athlete_id', athleteId)
        .eq('sport_type', 'Swim')
        .eq('in_competition_window', true)
        .neq('strava_activity_id', activity.id)
        .gte('start_date', weekStart.toISOString())
        .lt('start_date', weekEndQuery.toISOString());

      const priorSwimTimeS = (priorSwims || [])
        .filter((s: any) => s.hidden !== true)
        .reduce((sum: number, s: any) => sum + (s.moving_time_s || 0), 0);

      zonePoints = calculateCappedSwimPoints(movingTimeS, priorSwimTimeS, hrZones);
      console.log(`Swim cap week ${weekNum}: prior swim time ${(priorSwimTimeS / 60).toFixed(1)}min, this swim ${(movingTimeS / 60).toFixed(1)}min, points=${zonePoints}`);
    } else {
      // Standard 4x multiplier (no cap)
      zonePoints = Math.round((movingTimeS / 60) * 4);
      console.log(`Swim activity ${activity.id}: ${(movingTimeS / 60).toFixed(1)} min × 4 = ${zonePoints} points`);
    }
  } else if (!hasHRData) {
    zonePoints = Math.round(zone1FallbackPoints * 100) / 100;
    console.log(`Activity ${activity.id} has no HR data - using Zone 1 fallback: ${zone1FallbackPoints.toFixed(1)} points (${(activity.moving_time / 60).toFixed(1)} min × 1)`);
  }

  // For non-ride activities, corrected_zone_points equals zone_points (default zones already used)
  // For ride activities, corrected_zone_points uses default zone calculation
  // For swims/no-HR, corrected_zone_points equals zone_points (not HR-zone dependent)
  const finalCorrectedPoints = isRideActivity && correctedZonePoints !== undefined
    ? correctedZonePoints
    : zonePoints;

  // Insert activity
  const { data: newActivity, error: activityError } = await supabaseAdmin
    .from('activities')
    .insert({
      athlete_id: athleteId,
      strava_activity_id: activity.id,
      name: activity.name,
      sport_type: classifiedSportType,
      start_date: activity.start_date,
      distance_m: activity.distance,
      moving_time_s: activity.moving_time,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      average_cadence: detailedActivity.average_cadence || null,
      in_competition_window: true,
      ...(zonePoints !== undefined ? { zone_points: zonePoints } : {}),
      ...(finalCorrectedPoints !== undefined ? { corrected_zone_points: finalCorrectedPoints } : {}),
    })
    .select()
    .single();

  if (activityError || !newActivity) {
    throw new Error(`Failed to insert activity: ${activityError?.message}`);
  }

  // Store HR zone data
  if (hrZones) {
    await supabaseAdmin
      .from('heart_rate_zones')
      .insert({
        activity_id: newActivity.id,
        zone_1_time_s: hrZones.zone_1,
        zone_2_time_s: hrZones.zone_2,
        zone_3_time_s: hrZones.zone_3,
        zone_4_time_s: hrZones.zone_4,
        zone_5_time_s: hrZones.zone_5,
      });
  } else {
    console.log(`Activity ${activity.id}: No HR zone data available from Strava`);
  }
}

async function updateActivity(activity: any, athleteId: string, accessToken: string, athleteZones: any) {
  // Get existing activity
  const { data: existingActivity } = await supabaseAdmin
    .from('activities')
    .select('id')
    .eq('strava_activity_id', activity.id)
    .single();

  if (!existingActivity) return;

  // Fetch detailed activity data to get cadence
  let detailedActivity = activity;
  try {
    const detailResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (detailResponse.ok) {
      detailedActivity = await detailResponse.json();
    }
  } catch (err) {
    console.warn(`Could not fetch detailed activity ${activity.id} for cadence:`, err);
  }

  // Classify bike activities based on elevation
  const classifiedSportType = classifyBikeActivity(activity);

  // Update activity
  await supabaseAdmin
    .from('activities')
    .update({
      name: activity.name,
      sport_type: classifiedSportType,
      start_date: activity.start_date,
      distance_m: activity.distance,
      moving_time_s: activity.moving_time,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      average_cadence: detailedActivity.average_cadence || null,
    })
    .eq('id', existingActivity.id);

  // Fetch activity zones directly from Strava API
  const activityZones = await fetchActivityZones(activity.id, accessToken);

  if (activityZones) {
    // Pass moving_time to detect and correct inflated zone times (Strava bug)
    const zones = extractHRZoneTimes(activityZones, activity.moving_time);

    if (zones) {
      console.log(`Fetched zones directly from Strava for activity ${activity.id}:`, zones);

      // Check if HR zones exist
      const { data: existingZones } = await supabaseAdmin
        .from('heart_rate_zones')
        .select('id')
        .eq('activity_id', existingActivity.id)
        .single();

      if (existingZones) {
        // Update existing zones
        await supabaseAdmin
          .from('heart_rate_zones')
          .update({
            zone_1_time_s: zones.zone_1,
            zone_2_time_s: zones.zone_2,
            zone_3_time_s: zones.zone_3,
            zone_4_time_s: zones.zone_4,
            zone_5_time_s: zones.zone_5,
          })
          .eq('id', existingZones.id);
      } else {
        // Insert new zones
        await supabaseAdmin
          .from('heart_rate_zones')
          .insert({
            activity_id: existingActivity.id,
            zone_1_time_s: zones.zone_1,
            zone_2_time_s: zones.zone_2,
            zone_3_time_s: zones.zone_3,
            zone_4_time_s: zones.zone_4,
            zone_5_time_s: zones.zone_5,
          });
      }
    }
  }
}

function calculateSimpleZones(
  hrData: number[],
  timeData: number[],
  maxHR: number
): {
  zone_1: number;
  zone_2: number;
  zone_3: number;
  zone_4: number;
  zone_5: number;
} {
  const zones = {
    zone_1: 0,
    zone_2: 0,
    zone_3: 0,
    zone_4: 0,
    zone_5: 0,
  };

  for (let i = 0; i < hrData.length - 1; i++) {
    const hr = hrData[i];
    const duration = timeData[i + 1] - timeData[i]; // seconds between readings
    const hrPercent = (hr / maxHR) * 100;

    if (hrPercent < 60) {
      zones.zone_1 += duration;
    } else if (hrPercent < 70) {
      zones.zone_2 += duration;
    } else if (hrPercent < 80) {
      zones.zone_3 += duration;
    } else if (hrPercent < 90) {
      zones.zone_4 += duration;
    } else {
      zones.zone_5 += duration;
    }
  }

  return zones;
}
