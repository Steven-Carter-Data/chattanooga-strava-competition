// Strava Heart Rate Zones API helpers

export interface StravaHRZones {
  heart_rate: {
    custom_zones: boolean;
    zones: Array<{
      min: number;
      max: number;
    }>;
  };
}

export interface StravaActivityZone {
  score: number;
  sensor_based: boolean;
  custom_zones: boolean;
  max: number;
  distribution_buckets: Array<{
    max: number;
    min: number;
    time: number; // Time in seconds spent in this zone
  }>;
  type: string; // "heartrate" or "power"
  points: number;
}

/**
 * Fetch athlete's heart rate zone configuration from Strava
 * GET /athlete/zones
 */
export async function fetchAthleteZones(
  accessToken: string
): Promise<StravaHRZones | null> {
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/zones', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch athlete zones:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching athlete zones:', error);
    return null;
  }
}

/**
 * Fetch activity zones directly from Strava
 * GET /activities/{id}/zones
 * This returns the exact zone distribution that Strava displays
 */
export async function fetchActivityZones(
  activityId: number,
  accessToken: string
): Promise<StravaActivityZone[] | null> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/zones`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch activity zones for ${activityId}:`, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching activity zones for ${activityId}:`, error);
    return null;
  }
}

/**
 * Extract HR zone times from Strava's activity zones response
 * Returns zone times in seconds, matching Strava exactly
 *
 * If movingTimeSeconds is provided, will detect and correct inflated zone times
 * caused by a Strava bug (zone times 1000-2000x higher than actual).
 * The correction uses the fact that percentages remain correct even when
 * absolute times are inflated.
 */
export function extractHRZoneTimes(
  activityZones: StravaActivityZone[],
  movingTimeSeconds?: number
): {
  zone_1: number;
  zone_2: number;
  zone_3: number;
  zone_4: number;
  zone_5: number;
} | null {
  // Find the heartrate zone data
  const hrZone = activityZones.find(z => z.type === 'heartrate');

  if (!hrZone || !hrZone.distribution_buckets || hrZone.distribution_buckets.length < 5) {
    console.warn('No valid HR zone distribution found');
    return null;
  }

  // distribution_buckets contains time in seconds for each zone
  // Strava returns 5 buckets for zones 1-5
  let zoneTimes = {
    zone_1: hrZone.distribution_buckets[0]?.time || 0,
    zone_2: hrZone.distribution_buckets[1]?.time || 0,
    zone_3: hrZone.distribution_buckets[2]?.time || 0,
    zone_4: hrZone.distribution_buckets[3]?.time || 0,
    zone_5: hrZone.distribution_buckets[4]?.time || 0,
  };

  // Check for and correct inflated zone times (Strava bug)
  if (movingTimeSeconds && movingTimeSeconds > 0) {
    zoneTimes = correctInflatedZoneTimes(zoneTimes, movingTimeSeconds);
  }

  return zoneTimes;
}

/**
 * Detect and correct inflated HR zone times caused by Strava bug.
 *
 * The bug causes zone times to be inflated by ~1000-2000x, but the
 * PERCENTAGES remain correct. This function:
 * 1. Detects if total zone time significantly exceeds moving time (ratio > 1.5)
 * 2. If inflated, recalculates zone times using: moving_time × (zone_time / total_zone_time)
 *
 * Example:
 * - Moving time: 2700s (45 min)
 * - Strava returns: z2=3537037s, z3=109393s (total=3646430s, ratio=1350x)
 * - Percentages: z2=97.0%, z3=3.0% (correct!)
 * - Corrected: z2=2700×0.97=2619s, z3=2700×0.03=81s
 */
export function correctInflatedZoneTimes(
  zoneTimes: {
    zone_1: number;
    zone_2: number;
    zone_3: number;
    zone_4: number;
    zone_5: number;
  },
  movingTimeSeconds: number
): {
  zone_1: number;
  zone_2: number;
  zone_3: number;
  zone_4: number;
  zone_5: number;
} {
  const totalZoneTime =
    zoneTimes.zone_1 +
    zoneTimes.zone_2 +
    zoneTimes.zone_3 +
    zoneTimes.zone_4 +
    zoneTimes.zone_5;

  // If no zone time, return as-is
  if (totalZoneTime === 0) {
    return zoneTimes;
  }

  // Calculate ratio of zone time to moving time
  const ratio = totalZoneTime / movingTimeSeconds;

  // If ratio > 1.5, zone times are likely inflated (Strava bug)
  // Normal activities should have ratio close to 1.0 (zone time ≈ moving time)
  const INFLATION_THRESHOLD = 1.5;

  if (ratio > INFLATION_THRESHOLD) {
    console.warn(
      `Detected inflated zone times (ratio: ${ratio.toFixed(2)}x). ` +
      `Total zone time: ${totalZoneTime}s, Moving time: ${movingTimeSeconds}s. ` +
      `Applying percentage-based correction.`
    );

    // Recalculate each zone using percentages
    // corrected_zone = moving_time × (zone_time / total_zone_time)
    return {
      zone_1: Math.round(movingTimeSeconds * (zoneTimes.zone_1 / totalZoneTime)),
      zone_2: Math.round(movingTimeSeconds * (zoneTimes.zone_2 / totalZoneTime)),
      zone_3: Math.round(movingTimeSeconds * (zoneTimes.zone_3 / totalZoneTime)),
      zone_4: Math.round(movingTimeSeconds * (zoneTimes.zone_4 / totalZoneTime)),
      zone_5: Math.round(movingTimeSeconds * (zoneTimes.zone_5 / totalZoneTime)),
    };
  }

  // Zone times appear normal, return as-is
  return zoneTimes;
}

/**
 * Calculate time spent in each HR zone using athlete's custom zone boundaries
 * This matches Strava's zone calculation exactly
 *
 * Strava zone boundaries: Each zone has min/max where max is INCLUSIVE
 * Zone 1: min=0, max=125 means HR 0-125 is Zone 1
 * Zone 2: min=125, max=156 means HR 126-156 is Zone 2
 *
 * The key insight: Strava uses the MAX value as the boundary.
 * If HR <= zone[0].max, it's Zone 1
 * If HR > zone[0].max && HR <= zone[1].max, it's Zone 2
 * etc.
 */
export function calculateHRZonesWithCustomBoundaries(
  hrData: number[],
  timeData: number[],
  zones: Array<{ min: number; max: number }>
): {
  zone_1: number;
  zone_2: number;
  zone_3: number;
  zone_4: number;
  zone_5: number;
} {
  const zoneTimes = {
    zone_1: 0,
    zone_2: 0,
    zone_3: 0,
    zone_4: 0,
    zone_5: 0,
  };

  // Strava typically has 5 zones
  if (zones.length !== 5) {
    console.warn(`Expected 5 HR zones, got ${zones.length}`);
    return zoneTimes;
  }

  for (let i = 0; i < hrData.length - 1; i++) {
    const hr = hrData[i];
    const duration = timeData[i + 1] - timeData[i]; // seconds between readings

    // Use max values as boundaries - this matches Strava's zone assignment
    // Zone 1: HR <= zone[0].max (e.g., HR <= 125)
    // Zone 2: HR > zone[0].max && HR <= zone[1].max (e.g., HR 126-156)
    // Zone 3: HR > zone[1].max && HR <= zone[2].max (e.g., HR 157-171)
    // etc.
    if (hr <= zones[0].max) {
      zoneTimes.zone_1 += duration;
    } else if (hr <= zones[1].max) {
      zoneTimes.zone_2 += duration;
    } else if (hr <= zones[2].max) {
      zoneTimes.zone_3 += duration;
    } else if (hr <= zones[3].max) {
      zoneTimes.zone_4 += duration;
    } else if (zones[4].max === -1 || hr <= zones[4].max) {
      // Zone 5 (max=-1 means no upper limit)
      zoneTimes.zone_5 += duration;
    }
    // HR values outside all zones are not counted (shouldn't happen)
  }

  return zoneTimes;
}
