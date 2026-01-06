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
 * Strava zone boundaries work as follows:
 * - Each zone has a min and max value
 * - Zone 1: min=0, max=125 and Zone 2: min=125, max=156
 * - When there's overlap (125 appears in both), Strava uses the HIGHER zone
 * - So HR=125 goes to Zone 2, not Zone 1
 * - We check zones from highest to lowest to handle overlaps correctly
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

    // Check zones from highest to lowest to handle overlapping boundaries
    // When boundary values overlap (e.g., Zone 1 max=125, Zone 2 min=125),
    // Strava assigns the boundary value to the HIGHER zone
    if (hr >= zones[4].min && (zones[4].max === -1 || hr <= zones[4].max)) {
      // Zone 5 (often has max=-1 meaning "no upper limit")
      zoneTimes.zone_5 += duration;
    } else if (hr >= zones[3].min && hr <= zones[3].max) {
      zoneTimes.zone_4 += duration;
    } else if (hr >= zones[2].min && hr <= zones[2].max) {
      zoneTimes.zone_3 += duration;
    } else if (hr >= zones[1].min && hr <= zones[1].max) {
      zoneTimes.zone_2 += duration;
    } else if (hr >= zones[0].min && hr <= zones[0].max) {
      zoneTimes.zone_1 += duration;
    }
    // HR values outside all zones are not counted
  }

  return zoneTimes;
}
