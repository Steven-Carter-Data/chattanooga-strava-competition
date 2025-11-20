import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchStravaActivity,
  fetchHeartRateStream,
  calculateHRZones,
  calculateZonePoints,
  getAthleteAccessToken,
} from '@/lib/strava';
import { StravaWebhookEvent } from '@/lib/types';

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

  // List of bike-related activity types from Strava
  const bikeTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'Velomobile', 'Handcycle'];

  // Check if this is a bike-related activity
  if (bikeTypes.includes(sportType)) {
    const elevation = activity.total_elevation_gain || 0;

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

  // Fetch heart rate stream
  const hrStream = await fetchHeartRateStream(activityId, accessToken);

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
        zone_points: 0, // Will be updated by trigger
      },
      { onConflict: 'strava_activity_id' }
    )
    .select('id')
    .single();

  if (activityError || !activityRecord) {
    console.error('Failed to upsert activity:', activityError);
    return;
  }

  // If we have HR data, calculate zones and upsert
  if (hrStream && hrStream.length > 0 && activity.max_heartrate) {
    const zones = calculateHRZones(hrStream, activity.max_heartrate);

    const { error: zonesError } = await supabaseAdmin
      .from('heart_rate_zones')
      .upsert(
        {
          activity_id: activityRecord.id,
          ...zones,
        },
        { onConflict: 'activity_id' }
      );

    if (zonesError) {
      console.error('Failed to upsert HR zones:', zonesError);
    } else {
      console.log(`Successfully processed activity ${activityId} with HR zones`);
    }
  } else {
    console.log(`Activity ${activityId} has no HR data`);
  }
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
