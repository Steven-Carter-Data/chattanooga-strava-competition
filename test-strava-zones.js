const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStravaZones() {
  // Get athlete with token
  const { data: athlete } = await supabase
    .from('athletes')
    .select('*, athlete_tokens(*)')
    .eq('strava_athlete_id', 10862759)
    .single();

  if (!athlete || !athlete.athlete_tokens || athlete.athlete_tokens.length === 0) {
    console.error('No athlete or token found');
    return;
  }

  const token = athlete.athlete_tokens[0];
  const accessToken = token.access_token;

  console.log('=== FETCHING ATHLETE ZONES FROM STRAVA ===\n');

  // Fetch athlete zones
  const zonesResponse = await fetch('https://www.strava.com/api/v3/athlete/zones', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!zonesResponse.ok) {
    console.error('Failed to fetch zones:', zonesResponse.statusText);
    return;
  }

  const zonesData = await zonesResponse.json();
  console.log('Strava Zones Response:');
  console.log(JSON.stringify(zonesData, null, 2));

  if (zonesData.heart_rate) {
    console.log('\nHeart Rate Zones:');
    console.log(`Custom zones: ${zonesData.heart_rate.custom_zones}`);
    console.log('Zones:');
    zonesData.heart_rate.zones.forEach((zone, index) => {
      console.log(`  Zone ${index + 1}: ${zone.min} - ${zone.max} bpm`);
    });
  }

  // Test activities
  const activityIds = [16508595128, 16507818452];

  for (const activityId of activityIds) {
    console.log(`\n\n=== ACTIVITY ${activityId} ===`);

    // Fetch activity details
    const actResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!actResponse.ok) {
      console.error(`Failed to fetch activity ${activityId}`);
      continue;
    }

    const activity = await actResponse.json();
    console.log(`\nActivity: ${activity.name}`);
    console.log(`Type: ${activity.type}`);
    console.log(`Date: ${activity.start_date}`);
    console.log(`Max HR: ${activity.max_heartrate}`);
    console.log(`Avg HR: ${activity.average_heartrate}`);

    // Fetch HR streams
    const streamResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!streamResponse.ok) {
      console.error(`Failed to fetch streams for ${activityId}`);
      continue;
    }

    const streams = await streamResponse.json();

    if (streams.heartrate && streams.time) {
      const hrData = streams.heartrate.data;
      const timeData = streams.time.data;

      console.log(`\nHR Stream: ${hrData.length} data points`);
      console.log(`Time Stream: ${timeData.length} data points`);
      console.log(`Min HR: ${Math.min(...hrData)}`);
      console.log(`Max HR: ${Math.max(...hrData)}`);
      console.log(`Total time: ${timeData[timeData.length - 1]}s (${(timeData[timeData.length - 1] / 60).toFixed(1)} min)`);

      // Calculate zones using the fallback method (max HR %)
      console.log('\n--- FALLBACK CALCULATION (Max HR %) ---');
      const maxHR = activity.max_heartrate;
      const zonesSimple = {
        zone_1: 0,
        zone_2: 0,
        zone_3: 0,
        zone_4: 0,
        zone_5: 0,
      };

      for (let i = 0; i < hrData.length - 1; i++) {
        const hr = hrData[i];
        const duration = timeData[i + 1] - timeData[i];
        const hrPercent = (hr / maxHR) * 100;

        if (hrPercent < 60) {
          zonesSimple.zone_1 += duration;
        } else if (hrPercent < 70) {
          zonesSimple.zone_2 += duration;
        } else if (hrPercent < 80) {
          zonesSimple.zone_3 += duration;
        } else if (hrPercent < 90) {
          zonesSimple.zone_4 += duration;
        } else {
          zonesSimple.zone_5 += duration;
        }
      }

      console.log('Zone times (max HR % method):');
      console.log(`  Zone 1 (<60% of ${maxHR}): ${zonesSimple.zone_1}s (${(zonesSimple.zone_1 / 60).toFixed(1)} min)`);
      console.log(`  Zone 2 (60-70%): ${zonesSimple.zone_2}s (${(zonesSimple.zone_2 / 60).toFixed(1)} min)`);
      console.log(`  Zone 3 (70-80%): ${zonesSimple.zone_3}s (${(zonesSimple.zone_3 / 60).toFixed(1)} min)`);
      console.log(`  Zone 4 (80-90%): ${zonesSimple.zone_4}s (${(zonesSimple.zone_4 / 60).toFixed(1)} min)`);
      console.log(`  Zone 5 (>=90%): ${zonesSimple.zone_5}s (${(zonesSimple.zone_5 / 60).toFixed(1)} min)`);

      const totalSimple = zonesSimple.zone_1 + zonesSimple.zone_2 + zonesSimple.zone_3 + zonesSimple.zone_4 + zonesSimple.zone_5;
      console.log(`Total: ${totalSimple}s (${(totalSimple / 60).toFixed(1)} min)`);

      // Calculate points
      const pointsSimple = (zonesSimple.zone_1 / 60) * 1 +
        (zonesSimple.zone_2 / 60) * 2 +
        (zonesSimple.zone_3 / 60) * 3 +
        (zonesSimple.zone_4 / 60) * 4 +
        (zonesSimple.zone_5 / 60) * 5;
      console.log(`Points: ${pointsSimple.toFixed(2)}`);

      // If we have custom zones, calculate with those
      if (zonesData.heart_rate?.zones) {
        console.log('\n--- CUSTOM ZONES CALCULATION (Strava boundaries) ---');
        const zones = zonesData.heart_rate.zones;
        const zonesCustom = {
          zone_1: 0,
          zone_2: 0,
          zone_3: 0,
          zone_4: 0,
          zone_5: 0,
        };

        for (let i = 0; i < hrData.length - 1; i++) {
          const hr = hrData[i];
          const duration = timeData[i + 1] - timeData[i];

          if (hr >= zones[0].min && hr < zones[1].min) {
            zonesCustom.zone_1 += duration;
          } else if (hr >= zones[1].min && hr < zones[2].min) {
            zonesCustom.zone_2 += duration;
          } else if (hr >= zones[2].min && hr < zones[3].min) {
            zonesCustom.zone_3 += duration;
          } else if (hr >= zones[3].min && hr < zones[4].min) {
            zonesCustom.zone_4 += duration;
          } else if (hr >= zones[4].min && hr <= zones[4].max) {
            zonesCustom.zone_5 += duration;
          }
        }

        console.log('Zone times (Strava custom boundaries):');
        console.log(`  Zone 1 (${zones[0].min}-${zones[0].max} bpm): ${zonesCustom.zone_1}s (${(zonesCustom.zone_1 / 60).toFixed(1)} min)`);
        console.log(`  Zone 2 (${zones[1].min}-${zones[1].max} bpm): ${zonesCustom.zone_2}s (${(zonesCustom.zone_2 / 60).toFixed(1)} min)`);
        console.log(`  Zone 3 (${zones[2].min}-${zones[2].max} bpm): ${zonesCustom.zone_3}s (${(zonesCustom.zone_3 / 60).toFixed(1)} min)`);
        console.log(`  Zone 4 (${zones[3].min}-${zones[3].max} bpm): ${zonesCustom.zone_4}s (${(zonesCustom.zone_4 / 60).toFixed(1)} min)`);
        console.log(`  Zone 5 (${zones[4].min}-${zones[4].max} bpm): ${zonesCustom.zone_5}s (${(zonesCustom.zone_5 / 60).toFixed(1)} min)`);

        const totalCustom = zonesCustom.zone_1 + zonesCustom.zone_2 + zonesCustom.zone_3 + zonesCustom.zone_4 + zonesCustom.zone_5;
        console.log(`Total: ${totalCustom}s (${(totalCustom / 60).toFixed(1)} min)`);

        const pointsCustom = (zonesCustom.zone_1 / 60) * 1 +
          (zonesCustom.zone_2 / 60) * 2 +
          (zonesCustom.zone_3 / 60) * 3 +
          (zonesCustom.zone_4 / 60) * 4 +
          (zonesCustom.zone_5 / 60) * 5;
        console.log(`Points: ${pointsCustom.toFixed(2)}`);
      }
    }

    // Get what's in the database
    console.log('\n--- DATABASE VALUES ---');
    const { data: dbActivity } = await supabase
      .from('activity_detail')
      .select('*')
      .eq('strava_activity_id', activityId)
      .single();

    if (dbActivity) {
      console.log(`Zone 1: ${dbActivity.zone_1_time_s}s (${(dbActivity.zone_1_time_s / 60).toFixed(1)} min)`);
      console.log(`Zone 2: ${dbActivity.zone_2_time_s}s (${(dbActivity.zone_2_time_s / 60).toFixed(1)} min)`);
      console.log(`Zone 3: ${dbActivity.zone_3_time_s}s (${(dbActivity.zone_3_time_s / 60).toFixed(1)} min)`);
      console.log(`Zone 4: ${dbActivity.zone_4_time_s}s (${(dbActivity.zone_4_time_s / 60).toFixed(1)} min)`);
      console.log(`Zone 5: ${dbActivity.zone_5_time_s}s (${(dbActivity.zone_5_time_s / 60).toFixed(1)} min)`);
      console.log(`Points: ${dbActivity.zone_points}`);
    }
  }
}

testStravaZones().catch(console.error);
