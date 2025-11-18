// Strava API helper functions

import { StravaActivity, StravaHeartRateStream } from './types';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

/**
 * Fetch detailed activity data from Strava API
 */
export async function fetchStravaActivity(
  activityId: number,
  accessToken: string
): Promise<StravaActivity | null> {
  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch activity ${activityId}:`, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching activity ${activityId}:`, error);
    return null;
  }
}

/**
 * Fetch heart rate stream data for an activity
 */
export async function fetchHeartRateStream(
  activityId: number,
  accessToken: string
): Promise<number[] | null> {
  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=heartrate&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch HR stream for activity ${activityId}:`, response.statusText);
      return null;
    }

    const data = await response.json();

    // Check if heartrate stream exists
    if (data.heartrate && data.heartrate.data) {
      return data.heartrate.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching HR stream for activity ${activityId}:`, error);
    return null;
  }
}

/**
 * Calculate time spent in each HR zone based on athlete's max heart rate
 * Zones are based on % of max HR:
 * Zone 1: 50-60%
 * Zone 2: 60-70%
 * Zone 3: 70-80%
 * Zone 4: 80-90%
 * Zone 5: 90-100%
 */
export function calculateHRZones(
  hrData: number[],
  maxHR: number
): {
  zone_1_time_s: number;
  zone_2_time_s: number;
  zone_3_time_s: number;
  zone_4_time_s: number;
  zone_5_time_s: number;
} {
  const zones = {
    zone_1_time_s: 0,
    zone_2_time_s: 0,
    zone_3_time_s: 0,
    zone_4_time_s: 0,
    zone_5_time_s: 0,
  };

  // HR data points are typically 1 per second
  // Each data point represents approximately 1 second
  hrData.forEach((hr) => {
    const percentMax = (hr / maxHR) * 100;

    if (percentMax >= 90) {
      zones.zone_5_time_s += 1;
    } else if (percentMax >= 80) {
      zones.zone_4_time_s += 1;
    } else if (percentMax >= 70) {
      zones.zone_3_time_s += 1;
    } else if (percentMax >= 60) {
      zones.zone_2_time_s += 1;
    } else if (percentMax >= 50) {
      zones.zone_1_time_s += 1;
    }
    // Below 50% is not counted
  });

  return zones;
}

/**
 * Calculate zone points based on time in each zone
 * Formula: (zone_time_minutes * zone_weight)
 */
export function calculateZonePoints(zones: {
  zone_1_time_s: number;
  zone_2_time_s: number;
  zone_3_time_s: number;
  zone_4_time_s: number;
  zone_5_time_s: number;
}): number {
  const z1_min = zones.zone_1_time_s / 60;
  const z2_min = zones.zone_2_time_s / 60;
  const z3_min = zones.zone_3_time_s / 60;
  const z4_min = zones.zone_4_time_s / 60;
  const z5_min = zones.zone_5_time_s / 60;

  return (
    z1_min * 1 +
    z2_min * 2 +
    z3_min * 3 +
    z4_min * 4 +
    z5_min * 5
  );
}

/**
 * Get athlete's access token from Supabase
 * Handles token refresh if expired
 */
export async function getAthleteAccessToken(
  stravaAthleteId: number
): Promise<string | null> {
  const { supabaseAdmin } = await import('./supabase');

  // Get athlete from database
  const { data: athlete, error: athleteError } = await supabaseAdmin
    .from('athletes')
    .select('id')
    .eq('strava_athlete_id', stravaAthleteId)
    .single();

  if (athleteError || !athlete) {
    console.error('Athlete not found:', stravaAthleteId);
    return null;
  }

  // Get tokens
  const { data: tokens, error: tokensError } = await supabaseAdmin
    .from('athlete_tokens')
    .select('*')
    .eq('athlete_id', athlete.id)
    .single();

  if (tokensError || !tokens) {
    console.error('Tokens not found for athlete:', stravaAthleteId);
    return null;
  }

  // Check if token is expired (refresh if expires in < 1 hour)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < oneHour) {
    // Refresh token
    const refreshed = await refreshAccessToken(tokens.refresh_token, athlete.id);
    return refreshed ? refreshed.access_token : null;
  }

  return tokens.access_token;
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(
  refreshToken: string,
  athleteId: string
): Promise<{ access_token: string } | null> {
  const { supabaseAdmin } = await import('./supabase');

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token');
      return null;
    }

    const data = await response.json();

    // Update tokens in database
    const expiresAt = new Date(data.expires_at * 1000).toISOString();

    await supabaseAdmin
      .from('athlete_tokens')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', athleteId);

    return { access_token: data.access_token };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}
