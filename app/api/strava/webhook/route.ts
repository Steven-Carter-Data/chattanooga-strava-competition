import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getActiveCompetitionConfig } from '@/lib/supabase';
import {
  fetchStravaActivity,
  getAthleteAccessToken,
} from '@/lib/strava';
import { fetchAthleteZones, calculateHRZonesWithCustomBoundaries } from '@/lib/strava-zones';
import { StravaWebhookEvent } from '@/lib/types';

// Activity types excluded from the competition
// These activities will not be synced or count toward points
const EXCLUDED_ACTIVITY_TYPES = ['Walk', 'AlpineSki'];

/**
 * GET handler for Strava webhook verification
 * Strava sends a GET request with hub.mode, hub.challenge, and hub.verify_token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  // Verify the token matches
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return NextResponse.json({ 'hub.challenge': challenge });
  } else {
    console.error('Webhook verification failed');
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    );
  }
}

/**
 * POST handler for Strava webhook events
 * Receives activity create/update/delete events
 */
export async function POST(request: NextRequest) {
  try {
    const event: StravaWebhookEvent = await request.json();

    console.log('Received webhook event:', event);

    // Only process activity events
    if (event.object_type !== 'activity') {
      console.log('Ignoring non-activity event');
      return NextResponse.json({ received: true });
    }

    // Handle different event types
    if (event.aspect_type === 'create' || event.aspect_type === 'update') {
      await handleActivityCreateOrUpdate(event);
    } else if (event.aspect_type === 'delete') {
      await handleActivityDelete(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
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

/**
 * Handle activity creation or update
 */
async function handleActivityCreateOrUpdate(event: StravaWebhookEvent) {
  const { object_id: activityId, owner_id: athleteId } = event;

  console.log(`Processing activity ${activityId} for athlete ${athleteId}`);

  // Get athlete's access token
  const accessToken = await getAthleteAccessToken(athleteId);

  if (!accessToken) {
    console.error(`No access token found for athlete ${athleteId}`);
    // TODO: For now, we'll skip this. Later we need OAuth flow to get tokens
    return;
  }

  // Fetch full activity data from Strava
  const activity = await fetchStravaActivity(activityId, accessToken);

  if (!activity) {
    console.error(`Failed to fetch activity ${activityId}`);
    return;
  }

  // Filter out excluded activity types (e.g., Walk)
  const activityType = activity.sport_type || activity.type;
  if (EXCLUDED_ACTIVITY_TYPES.includes(activityType)) {
    console.log(`Skipping activity ${activityId} - excluded type: ${activityType}`);
    return;
  }

  // Fetch athlete's HR zone configuration from Strava (for accurate zone calculation)
  const athleteZones = await fetchAthleteZones(accessToken);
  if (!athleteZones || !athleteZones.heart_rate || !athleteZones.heart_rate.zones) {
    console.warn(`Could not fetch athlete HR zones from Strava for athlete ${athleteId}`);
  } else {
    console.log(`Athlete ${athleteId} HR zones:`, athleteZones.heart_rate.custom_zones ? 'Custom' : 'Auto');
  }

  // Ensure athlete exists in database
  const { data: existingAthlete } = await supabaseAdmin
    .from('athletes')
    .select('id')
    .eq('strava_athlete_id', athleteId)
    .single();

  let athleteDbId: string;

  if (!existingAthlete) {
    // Create new athlete record
    const { data: newAthlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .insert({
        strava_athlete_id: athleteId,
        firstname: null, // Will be updated when we implement OAuth
        lastname: null,
        profile_image_url: null,
      })
      .select('id')
      .single();

    if (athleteError || !newAthlete) {
      console.error('Failed to create athlete:', athleteError);
      return;
    }

    athleteDbId = newAthlete.id;
  } else {
    athleteDbId = existingAthlete.id;
  }

  // Classify bike activities based on elevation
  const classifiedSportType = classifyBikeActivity(activity);

  // Check if this is a swim activity - uses special 4x time multiplier scoring
  const isSwim = classifiedSportType === 'Swim';

  // Calculate swim points using 4x time multiplier (moving_time in minutes * 4), rounded to whole number
  const swimPoints = isSwim ? Math.round(((activity.moving_time || 0) / 60) * 4) : 0;

  // Calculate Zone 1 fallback points (1 point per minute) for activities without HR data
  const zone1FallbackPoints = (activity.moving_time || 0) / 60;

  // Determine if activity has HR data (will be used to decide final points)
  const hasHRData = activity.average_heartrate != null || activity.max_heartrate != null;

  // Check if activity is within competition window
  // This is set explicitly to prevent issues with database trigger inconsistently setting this flag
  let inCompetitionWindow = false;
  const { data: config } = await getActiveCompetitionConfig(supabaseAdmin);
  if (config) {
    const activityDate = new Date(activity.start_date);
    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);
    inCompetitionWindow = activityDate >= startDate && activityDate <= endDate;
  }

  // Determine zone_points based on activity type and HR data availability
  // Priority: 1) Swim uses 4x time multiplier, 2) No HR data uses Zone 1 (1 pt/min), 3) Others use HR zone trigger
  let zonePoints = 0;
  if (isSwim) {
    zonePoints = swimPoints;
  } else if (!hasHRData) {
    zonePoints = zone1FallbackPoints;
  }

  // Upsert activity
  const { data: activityRecord, error: activityError } = await supabaseAdmin
    .from('activities')
    .upsert(
      {
        strava_activity_id: activity.id,
        athlete_id: athleteDbId,
        name: activity.name,
        sport_type: classifiedSportType,
        start_date: activity.start_date,
        distance_m: activity.distance,
        moving_time_s: activity.moving_time,
        elapsed_time_s: activity.elapsed_time,
        average_heartrate: activity.average_heartrate || null,
        max_heartrate: activity.max_heartrate || null,
        average_speed_mps: activity.average_speed,
        total_elevation_gain_m: activity.total_elevation_gain,
        raw_payload: activity,
        in_competition_window: inCompetitionWindow, // Explicitly set based on competition config
        // For swim: 4x time multiplier; For no HR data: Zone 1 (1 pt/min); Others: will be set by trigger
        zone_points: zonePoints,
      },
      { onConflict: 'strava_activity_id' }
    )
    .select('id')
    .single();

  if (activityError || !activityRecord) {
    console.error('Failed to upsert activity:', activityError);
    return;
  }

  // Log swim activity points (calculated from time, not HR zones)
  if (isSwim) {
    console.log(`Swim activity ${activityId}: ${(activity.moving_time / 60).toFixed(1)} min × 4 = ${swimPoints} points`);
    // Continue to store HR zone data for display purposes (if available)
  } else if (!hasHRData) {
    console.log(`Activity ${activityId} has no HR data - using Zone 1 fallback: ${zone1FallbackPoints.toFixed(1)} points (${(activity.moving_time / 60).toFixed(1)} min × 1)`);
  }

  // Fetch HR and time streams for zone calculation
  // This is done for ALL activities (including swim) so HR zone data can be displayed
  const streamsResponse = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (streamsResponse.ok) {
    const streams = await streamsResponse.json();

    if (streams.heartrate && streams.time) {
      const hrData = streams.heartrate.data;
      const timeData = streams.time.data;

      let zones;
      if (athleteZones?.heart_rate?.zones) {
        // Use athlete's custom HR zone boundaries from Strava (matches Strava exactly)
        zones = calculateHRZonesWithCustomBoundaries(hrData, timeData, athleteZones.heart_rate.zones);
        console.log(`Calculated zones for activity ${activityId} using custom boundaries`);
      } else if (activity.max_heartrate) {
        // Fallback to simple calculation if no custom zones available
        zones = calculateSimpleZones(hrData, timeData, activity.max_heartrate);
        console.log(`Calculated zones for activity ${activityId} using max HR fallback`);
      } else {
        console.warn(`Skipping HR zones for activity ${activityId} - no zone config or max HR`);
        return;
      }

      const { error: zonesError } = await supabaseAdmin
        .from('heart_rate_zones')
        .upsert(
          {
            activity_id: activityRecord.id,
            zone_1_time_s: zones.zone_1,
            zone_2_time_s: zones.zone_2,
            zone_3_time_s: zones.zone_3,
            zone_4_time_s: zones.zone_4,
            zone_5_time_s: zones.zone_5,
          },
          { onConflict: 'activity_id' }
        );

      if (zonesError) {
        console.error('Failed to upsert HR zones:', zonesError);
      } else {
        console.log(`Successfully processed activity ${activityId} with HR zones`);
      }
    } else {
      console.log(`Activity ${activityId} has no HR stream data`);
    }
  } else {
    console.log(`Failed to fetch streams for activity ${activityId}: ${streamsResponse.statusText}`);
  }
}

/**
 * Calculate zones using max HR percentage (fallback method)
 */
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

/**
 * Handle activity deletion
 */
async function handleActivityDelete(event: StravaWebhookEvent) {
  const { object_id: activityId } = event;

  console.log(`Deleting activity ${activityId}`);

  const { error } = await supabaseAdmin
    .from('activities')
    .delete()
    .eq('strava_activity_id', activityId);

  if (error) {
    console.error('Failed to delete activity:', error);
  } else {
    console.log(`Successfully deleted activity ${activityId}`);
  }
}
