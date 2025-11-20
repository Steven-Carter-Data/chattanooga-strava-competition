const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  // Get athletes with their HR zones
  const { data: athletes, error: athleteError } = await supabase
    .from('athletes')
    .select('id, firstname, lastname, strava_athlete_id, hr_zones');

  if (athleteError) {
    console.error('Error fetching athletes:', athleteError);
    return;
  }

  console.log('=== ATHLETES WITH HR ZONES ===');
  athletes.forEach(athlete => {
    console.log(`\nAthlete: ${athlete.firstname} ${athlete.lastname} (Strava ID: ${athlete.strava_athlete_id})`);
    if (athlete.hr_zones) {
      console.log('HR Zones:', JSON.stringify(athlete.hr_zones, null, 2));
    } else {
      console.log('HR Zones: NOT SET');
    }
  });

  // Get activities with their HR zone data
  const { data: activities, error: actError } = await supabase
    .from('activity_detail')
    .select('*')
    .order('start_date', { ascending: false });

  if (actError) {
    console.error('Error fetching activities:', actError);
    return;
  }

  console.log('\n\n=== ACTIVITIES WITH HR ZONE DATA ===');
  activities.forEach(act => {
    console.log(`\n--- Activity: ${act.name} ---`);
    console.log(`Athlete: ${act.firstname} ${act.lastname}`);
    console.log(`Date: ${act.start_date}`);
    console.log(`Sport: ${act.sport_type}`);
    console.log(`Avg HR: ${act.average_heartrate}, Max HR: ${act.max_heartrate}`);
    console.log(`Zone Times (seconds):`);
    console.log(`  Zone 1: ${act.zone_1_time_s || 0}s (${((act.zone_1_time_s || 0) / 60).toFixed(1)} min)`);
    console.log(`  Zone 2: ${act.zone_2_time_s || 0}s (${((act.zone_2_time_s || 0) / 60).toFixed(1)} min)`);
    console.log(`  Zone 3: ${act.zone_3_time_s || 0}s (${((act.zone_3_time_s || 0) / 60).toFixed(1)} min)`);
    console.log(`  Zone 4: ${act.zone_4_time_s || 0}s (${((act.zone_4_time_s || 0) / 60).toFixed(1)} min)`);
    console.log(`  Zone 5: ${act.zone_5_time_s || 0}s (${((act.zone_5_time_s || 0) / 60).toFixed(1)} min)`);
    const totalTime = (act.zone_1_time_s || 0) + (act.zone_2_time_s || 0) + (act.zone_3_time_s || 0) + (act.zone_4_time_s || 0) + (act.zone_5_time_s || 0);
    console.log(`  Total HR Time: ${totalTime}s (${(totalTime / 60).toFixed(1)} min)`);
    console.log(`Moving Time: ${act.moving_time_s}s (${(act.moving_time_s / 60).toFixed(1)} min)`);
    console.log(`Zone Points: ${act.zone_points}`);
    console.log(`Activity ID: ${act.strava_activity_id}`);
  });
}

checkData().catch(console.error);
