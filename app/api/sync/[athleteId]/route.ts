import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAthleteAccessToken } from '@/lib/strava';

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

    // Get competition config
    const { data: config } = await supabaseAdmin
      .from('competition_config')
      .select('*')
      .single();

    if (!config) {
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

    let syncedCount = 0;
    let errorCount = 0;

    // Process each activity
    for (const activity of activities) {
      try {
        // Check if activity already exists
        const { data: existingActivity } = await supabaseAdmin
          .from('activities')
          .select('id')
          .eq('strava_activity_id', activity.id)
          .single();

        if (existingActivity) {
          // Activity already exists, update it
          await updateActivity(activity, athlete.id, accessToken);
          syncedCount++;
        } else {
          // New activity, insert it
          await insertActivity(activity, athlete.id, accessToken);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error processing activity ${activity.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} activities`,
      synced: syncedCount,
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

async function insertActivity(activity: any, athleteId: string, accessToken: string) {
  // Insert activity
  const { data: newActivity, error: activityError } = await supabaseAdmin
    .from('activities')
    .insert({
      athlete_id: athleteId,
      strava_activity_id: activity.id,
      name: activity.name,
      sport_type: activity.sport_type || activity.type,
      start_date: activity.start_date,
      distance_m: activity.distance,
      moving_time_s: activity.moving_time,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
    })
    .select()
    .single();

  if (activityError || !newActivity) {
    throw new Error(`Failed to insert activity: ${activityError?.message}`);
  }

  // Fetch detailed activity data for HR streams
  const detailedResponse = await fetch(
    `https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=heartrate,time&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (detailedResponse.ok) {
    const streams = await detailedResponse.json();

    if (streams.heartrate && streams.time && activity.max_heartrate) {
      // Calculate HR zones
      const hrData = streams.heartrate.data;
      const timeData = streams.time.data;

      // Simple zone calculation (you might want to use the more sophisticated one from lib/strava.ts)
      const zones = calculateSimpleZones(hrData, timeData, activity.max_heartrate);

      // Insert HR zones
      await supabaseAdmin
        .from('heart_rate_zones')
        .insert({
          activity_id: newActivity.id,
          zone_1_time_s: zones.zone_1,
          zone_2_time_s: zones.zone_2,
          zone_3_time_s: zones.zone_3,
          zone_4_time_s: zones.zone_4,
          zone_5_time_s: zones.zone_5,
        });
    }
  }
}

async function updateActivity(activity: any, athleteId: string, accessToken: string) {
  // Get existing activity
  const { data: existingActivity } = await supabaseAdmin
    .from('activities')
    .select('id')
    .eq('strava_activity_id', activity.id)
    .single();

  if (!existingActivity) return;

  // Update activity
  await supabaseAdmin
    .from('activities')
    .update({
      name: activity.name,
      sport_type: activity.sport_type || activity.type,
      start_date: activity.start_date,
      distance_m: activity.distance,
      moving_time_s: activity.moving_time,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
    })
    .eq('id', existingActivity.id);

  // Fetch and update HR streams if available
  const detailedResponse = await fetch(
    `https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=heartrate,time&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (detailedResponse.ok) {
    const streams = await detailedResponse.json();

    if (streams.heartrate && streams.time && activity.max_heartrate) {
      const hrData = streams.heartrate.data;
      const timeData = streams.time.data;

      const zones = calculateSimpleZones(hrData, timeData, activity.max_heartrate);

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
