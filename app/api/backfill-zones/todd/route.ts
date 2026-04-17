import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAthleteAccessToken } from '@/lib/strava';
import { calculateHRZonesWithCustomBoundaries } from '@/lib/strava-zones';

/**
 * POST /api/backfill-zones/todd
 *
 * Focused backfill for Todd Allen's remaining uncorrected rides only.
 * Retries each failed activity up to 3 times with increasing delays
 * to handle Strava ECONNRESET errors.
 *
 * READ-ONLY on existing data — only writes to corrected_zone_points.
 */

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calcPoints(zones: { zone_1: number; zone_2: number; zone_3: number; zone_4: number; zone_5: number }): number {
  return (zones.zone_1 / 60) * 1 + (zones.zone_2 / 60) * 2 + (zones.zone_3 / 60) * 3 + (zones.zone_4 / 60) * 4 + (zones.zone_5 / 60) * 5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function fetchStreamWithRetry(
  activityId: number,
  accessToken: string,
  maxRetries: number = 3
): Promise<{ hr: number[]; time: number[] } | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (resp.status === 429) {
        console.log(`[Todd] Rate limited on attempt ${attempt}/${maxRetries} for ${activityId}. Waiting 60s...`);
        await delay(60000);
        continue;
      }

      if (resp.ok) {
        const d = await resp.json();
        const hr = d.heartrate?.data;
        const time = d.time?.data;
        if (hr && time) return { hr, time };
        console.log(`[Todd] Activity ${activityId}: no HR/time data in response`);
        return null;
      }

      console.log(`[Todd] Activity ${activityId}: HTTP ${resp.status} on attempt ${attempt}`);
    } catch (err: any) {
      console.log(`[Todd] Activity ${activityId}: ${err.cause?.code || err.message} on attempt ${attempt}/${maxRetries}`);
    }

    // Wait before retry: 5s, 10s, 20s
    if (attempt < maxRetries) {
      const waitMs = 5000 * Math.pow(2, attempt - 1);
      console.log(`[Todd] Retrying in ${waitMs / 1000}s...`);
      await delay(waitMs);
    }
  }

  return null;
}

export async function POST() {
  try {
    // Get Todd Allen
    const { data: todd } = await supabaseAdmin
      .from('athletes')
      .select('id, strava_athlete_id, hr_zones')
      .eq('firstname', 'Todd')
      .eq('lastname', 'Allen')
      .single();

    if (!todd || !todd.hr_zones?.zones) {
      return NextResponse.json({ error: 'Todd Allen not found or missing HR zones' }, { status: 404 });
    }

    const accessToken = await getAthleteAccessToken(todd.strava_athlete_id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Could not get access token' }, { status: 401 });
    }

    const defaultZones = todd.hr_zones.zones;

    // Get uncorrected rides
    const { data: rides } = await supabaseAdmin
      .from('activities')
      .select('id, strava_activity_id, name, sport_type, moving_time_s, zone_points, start_date')
      .eq('athlete_id', todd.id)
      .eq('in_competition_window', true)
      .in('sport_type', ['Ride', 'Peloton', 'VirtualRide'])
      .is('corrected_zone_points', null)
      .order('start_date', { ascending: true });

    if (!rides || rides.length === 0) {
      return NextResponse.json({ message: 'All Todd Allen rides already corrected', remaining: 0 });
    }

    console.log(`[Todd] ${rides.length} uncorrected rides to process`);

    const results: any[] = [];
    let corrected = 0;
    let failed = 0;

    for (const ride of rides) {
      // 6 second gap between activities
      if (corrected + failed > 0) {
        await delay(6000);
      }

      const stream = await fetchStreamWithRetry(ride.strava_activity_id, accessToken);

      if (!stream) {
        failed++;
        results.push({
          name: ride.name,
          strava_id: ride.strava_activity_id,
          action: 'FAILED after 3 retries',
          original_points: ride.zone_points,
        });
        continue;
      }

      const correctedZones = calculateHRZonesWithCustomBoundaries(stream.hr, stream.time, defaultZones);
      const correctedPoints = round2(calcPoints(correctedZones));
      const diff = round2(correctedPoints - (ride.zone_points || 0));

      await supabaseAdmin
        .from('activities')
        .update({ corrected_zone_points: correctedPoints })
        .eq('id', ride.id);

      corrected++;
      results.push({
        name: ride.name,
        date: ride.start_date,
        strava_id: ride.strava_activity_id,
        original_points: round2(ride.zone_points || 0),
        corrected_points: correctedPoints,
        difference: diff,
      });

      console.log(`[Todd] ${ride.name}: ${ride.zone_points} → ${correctedPoints} (${diff >= 0 ? '+' : ''}${diff})`);
    }

    return NextResponse.json({
      athlete: 'Todd Allen',
      total_rides: rides.length,
      corrected,
      failed,
      results,
    });
  } catch (error) {
    console.error('[Todd] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
