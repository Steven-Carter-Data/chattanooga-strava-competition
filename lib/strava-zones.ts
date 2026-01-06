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
