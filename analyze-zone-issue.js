const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeZoneIssue() {
  // Get token
  const { data: tokens } = await supabase
    .from('athlete_tokens')
    .select('access_token')
    .single();

  const accessToken = tokens.access_token;

  // Get the two activities we know about
  const activityIds = [16508595128, 16507818452];

  for (const activityId of activityIds) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ACTIVITY ${activityId}`);
    console.log('='.repeat(80));

    // Fetch activity details
    const actResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const activity = await actResponse.json();
    console.log(`\nActivity: ${activity.name}`);
    console.log(`Type: ${activity.type}`);
    console.log(`Date: ${activity.start_date}`);
    console.log(`Max HR: ${activity.max_heartrate}`);
    console.log(`Avg HR: ${activity.average_heartrate}`);
    console.log(`Moving time: ${activity.moving_time}s (${(activity.moving_time / 60).toFixed(1)} min)`);

    // Fetch HR streams
    const streamResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const streams = await streamResponse.json();

    if (streams.heartrate && streams.time) {
      const hrData = streams.heartrate.data;
      const timeData = streams.time.data;

      console.log(`\nHR Stream info:`);
      console.log(`  Data points: ${hrData.length}`);
      console.log(`  Min HR: ${Math.min(...hrData)}`);
      console.log(`  Max HR: ${Math.max(...hrData)}`);
      console.log(`  Total duration: ${timeData[timeData.length - 1]}s (${(timeData[timeData.length - 1] / 60).toFixed(1)} min)`);

      // Calculate zones using the max HR percentage method (currently in DB)
      console.log(`\n${'─'.repeat(80)}`);
      console.log('CURRENT METHOD (Max HR Percentage)');
      console.log('─'.repeat(80));

      const maxHR = activity.max_heartrate;
      const zonesPercent = calculateZonesPercentage(hrData, timeData, maxHR);

      console.log(`\nZone boundaries based on max HR of ${maxHR}:`);
      console.log(`  Zone 1: < 60% = < ${(maxHR * 0.60).toFixed(0)} bpm`);
      console.log(`  Zone 2: 60-70% = ${(maxHR * 0.60).toFixed(0)}-${(maxHR * 0.70).toFixed(0)} bpm`);
      console.log(`  Zone 3: 70-80% = ${(maxHR * 0.70).toFixed(0)}-${(maxHR * 0.80).toFixed(0)} bpm`);
      console.log(`  Zone 4: 80-90% = ${(maxHR * 0.80).toFixed(0)}-${(maxHR * 0.90).toFixed(0)} bpm`);
      console.log(`  Zone 5: >= 90% = >= ${(maxHR * 0.90).toFixed(0)} bpm`);

      console.log(`\nCalculated zone times:`);
      console.log(`  Zone 1: ${zonesPercent.zone_1}s (${(zonesPercent.zone_1 / 60).toFixed(1)} min)`);
      console.log(`  Zone 2: ${zonesPercent.zone_2}s (${(zonesPercent.zone_2 / 60).toFixed(1)} min)`);
      console.log(`  Zone 3: ${zonesPercent.zone_3}s (${(zonesPercent.zone_3 / 60).toFixed(1)} min)`);
      console.log(`  Zone 4: ${zonesPercent.zone_4}s (${(zonesPercent.zone_4 / 60).toFixed(1)} min)`);
      console.log(`  Zone 5: ${zonesPercent.zone_5}s (${(zonesPercent.zone_5 / 60).toFixed(1)} min)`);

      const totalPercent = Object.values(zonesPercent).reduce((sum, val) => sum + val, 0);
      console.log(`  Total: ${totalPercent}s (${(totalPercent / 60).toFixed(1)} min)`);

      const pointsPercent = calculatePoints(zonesPercent);
      console.log(`\nPoints: ${pointsPercent.toFixed(2)}`);

      // Get what's in the database
      console.log(`\n${'─'.repeat(80)}`);
      console.log('DATABASE VALUES');
      console.log('─'.repeat(80));

      const { data: dbActivity } = await supabase
        .from('activity_detail')
        .select('*')
        .eq('strava_activity_id', activityId)
        .single();

      if (dbActivity) {
        console.log(`\nStored zone times:`);
        console.log(`  Zone 1: ${dbActivity.zone_1_time_s}s (${(dbActivity.zone_1_time_s / 60).toFixed(1)} min)`);
        console.log(`  Zone 2: ${dbActivity.zone_2_time_s}s (${(dbActivity.zone_2_time_s / 60).toFixed(1)} min)`);
        console.log(`  Zone 3: ${dbActivity.zone_3_time_s}s (${(dbActivity.zone_3_time_s / 60).toFixed(1)} min)`);
        console.log(`  Zone 4: ${dbActivity.zone_4_time_s}s (${(dbActivity.zone_4_time_s / 60).toFixed(1)} min)`);
        console.log(`  Zone 5: ${dbActivity.zone_5_time_s}s (${(dbActivity.zone_5_time_s / 60).toFixed(1)} min)`);
        const dbTotal = dbActivity.zone_1_time_s + dbActivity.zone_2_time_s + dbActivity.zone_3_time_s +
                        dbActivity.zone_4_time_s + dbActivity.zone_5_time_s;
        console.log(`  Total: ${dbTotal}s (${(dbTotal / 60).toFixed(1)} min)`);
        console.log(`\nStored points: ${dbActivity.zone_points}`);

        // Compare
        console.log(`\n${'─'.repeat(80)}`);
        console.log('COMPARISON');
        console.log('─'.repeat(80));

        const matches =
          zonesPercent.zone_1 === dbActivity.zone_1_time_s &&
          zonesPercent.zone_2 === dbActivity.zone_2_time_s &&
          zonesPercent.zone_3 === dbActivity.zone_3_time_s &&
          zonesPercent.zone_4 === dbActivity.zone_4_time_s &&
          zonesPercent.zone_5 === dbActivity.zone_5_time_s;

        if (matches) {
          console.log('✅ Database values MATCH recalculated values (using max HR %)');
        } else {
          console.log('❌ Database values DO NOT MATCH recalculated values');
          console.log('\nDifferences:');
          if (zonesPercent.zone_1 !== dbActivity.zone_1_time_s)
            console.log(`  Zone 1: DB=${dbActivity.zone_1_time_s}s, Calc=${zonesPercent.zone_1}s, Diff=${dbActivity.zone_1_time_s - zonesPercent.zone_1}s`);
          if (zonesPercent.zone_2 !== dbActivity.zone_2_time_s)
            console.log(`  Zone 2: DB=${dbActivity.zone_2_time_s}s, Calc=${zonesPercent.zone_2}s, Diff=${dbActivity.zone_2_time_s - zonesPercent.zone_2}s`);
          if (zonesPercent.zone_3 !== dbActivity.zone_3_time_s)
            console.log(`  Zone 3: DB=${dbActivity.zone_3_time_s}s, Calc=${zonesPercent.zone_3}s, Diff=${dbActivity.zone_3_time_s - zonesPercent.zone_3}s`);
          if (zonesPercent.zone_4 !== dbActivity.zone_4_time_s)
            console.log(`  Zone 4: DB=${dbActivity.zone_4_time_s}s, Calc=${zonesPercent.zone_4}s, Diff=${dbActivity.zone_4_time_s - zonesPercent.zone_4}s`);
          if (zonesPercent.zone_5 !== dbActivity.zone_5_time_s)
            console.log(`  Zone 5: DB=${dbActivity.zone_5_time_s}s, Calc=${zonesPercent.zone_5}s, Diff=${dbActivity.zone_5_time_s - zonesPercent.zone_5}s`);
        }
      }

      // Show distribution of HR values
      console.log(`\n${'─'.repeat(80)}`);
      console.log('HR DISTRIBUTION ANALYSIS');
      console.log('─'.repeat(80));

      const distribution = analyzeHRDistribution(hrData, maxHR);
      console.log(`\nHeart rate distribution:`);
      console.log(`  < 60% (${(maxHR * 0.60).toFixed(0)} bpm): ${distribution.z1} readings (${distribution.z1Pct.toFixed(1)}%)`);
      console.log(`  60-70% (${(maxHR * 0.60).toFixed(0)}-${(maxHR * 0.70).toFixed(0)} bpm): ${distribution.z2} readings (${distribution.z2Pct.toFixed(1)}%)`);
      console.log(`  70-80% (${(maxHR * 0.70).toFixed(0)}-${(maxHR * 0.80).toFixed(0)} bpm): ${distribution.z3} readings (${distribution.z3Pct.toFixed(1)}%)`);
      console.log(`  80-90% (${(maxHR * 0.80).toFixed(0)}-${(maxHR * 0.90).toFixed(0)} bpm): ${distribution.z4} readings (${distribution.z4Pct.toFixed(1)}%)`);
      console.log(`  >= 90% (${(maxHR * 0.90).toFixed(0)} bpm): ${distribution.z5} readings (${distribution.z5Pct.toFixed(1)}%)`);
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('IMPORTANT NOTE');
  console.log('='.repeat(80));
  console.log('\nThe current OAuth scope is missing "profile:read_all" permission.');
  console.log('This prevents us from fetching your custom HR zones from Strava.');
  console.log('\nTo check what Strava shows for these activities:');
  console.log('1. Go to https://www.strava.com/activities/16508595128');
  console.log('2. Check the "Heart Rate Analysis" section');
  console.log('3. Compare the zone times shown there with the database values above');
  console.log('\nIf they don\'t match, we need to use your custom zones from Strava.');
}

function calculateZonesPercentage(hrData, timeData, maxHR) {
  const zones = {
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

function calculatePoints(zones) {
  return (zones.zone_1 / 60) * 1 +
         (zones.zone_2 / 60) * 2 +
         (zones.zone_3 / 60) * 3 +
         (zones.zone_4 / 60) * 4 +
         (zones.zone_5 / 60) * 5;
}

function analyzeHRDistribution(hrData, maxHR) {
  let z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;

  hrData.forEach(hr => {
    const pct = (hr / maxHR) * 100;
    if (pct < 60) z1++;
    else if (pct < 70) z2++;
    else if (pct < 80) z3++;
    else if (pct < 90) z4++;
    else z5++;
  });

  const total = hrData.length;
  return {
    z1, z2, z3, z4, z5,
    z1Pct: (z1 / total) * 100,
    z2Pct: (z2 / total) * 100,
    z3Pct: (z3 / total) * 100,
    z4Pct: (z4 / total) * 100,
    z5Pct: (z5 / total) * 100,
  };
}

analyzeZoneIssue().catch(console.error);
