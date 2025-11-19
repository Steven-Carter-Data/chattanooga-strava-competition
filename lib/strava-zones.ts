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

    // Determine which zone this HR falls into
    // Use < for upper bound to avoid double-counting boundary values
    // Strava zones typically have overlapping boundaries (e.g., Zone 1: 0-138, Zone 2: 138-155)
    // We count a boundary value in the higher zone
    if (hr >= zones[0].min && hr < zones[1].min) {
      zoneTimes.zone_1 += duration;
    } else if (hr >= zones[1].min && hr < zones[2].min) {
      zoneTimes.zone_2 += duration;
    } else if (hr >= zones[2].min && hr < zones[3].min) {
      zoneTimes.zone_3 += duration;
    } else if (hr >= zones[3].min && hr < zones[4].min) {
      zoneTimes.zone_4 += duration;
    } else if (hr >= zones[4].min && hr <= zones[4].max) {
      zoneTimes.zone_5 += duration;
    }
    // HR values outside all zones are not counted
  }

  return zoneTimes;
}
