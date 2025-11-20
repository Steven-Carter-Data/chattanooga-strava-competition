const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyZoneDisplay() {
  // Get athlete with HR zones
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, firstname, lastname, hr_zones')
    .eq('strava_athlete_id', 10862759)
    .single();

  if (!athlete || !athlete.hr_zones) {
    console.error('No athlete or HR zones found');
    return;
  }

  console.log('='.repeat(80));
  console.log('ZONE DISPLAY VERIFICATION');
  console.log('='.repeat(80));
  console.log(`\nAthlete: ${athlete.firstname} ${athlete.lastname}\n`);

  console.log('RAW ZONE DATA FROM DATABASE:');
  console.log(JSON.stringify(athlete.hr_zones, null, 2));

  console.log('\n' + '-'.repeat(80));
  console.log('HOW ZONES SHOULD DISPLAY IN THE APP:');
  console.log('-'.repeat(80));

  athlete.hr_zones.zones.forEach((zone, index) => {
    const zoneNum = index + 1;

    // Apply the same logic as the UI
    const displayMin = index === 0 ? zone.min : zone.min + 1;
    const displayMax = index === 4 ? 'Max' : zone.max;

    console.log(`Zone ${zoneNum}: ${displayMin} - ${displayMax} bpm`);
  });

  console.log('\n' + '-'.repeat(80));
  console.log('STRAVA SHOULD SHOW (for comparison):');
  console.log('-'.repeat(80));
  console.log('Zone 1: 0 - 122 bpm');
  console.log('Zone 2: 123 - 151 bpm');
  console.log('Zone 3: 152 - 166 bpm');
  console.log('Zone 4: 167 - 181 bpm');
  console.log('Zone 5: 182 - Max bpm');

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION:');
  console.log('='.repeat(80));

  // Check each zone
  const zones = athlete.hr_zones.zones;
  let allMatch = true;

  // Zone 1
  const z1Min = zones[0].min;
  const z1Max = zones[0].max;
  const z1Match = z1Min === 0 && z1Max === 122;
  console.log(`Zone 1: ${z1Match ? '✅' : '❌'} (${z1Min}-${z1Max})`);
  allMatch = allMatch && z1Match;

  // Zone 2
  const z2Min = zones[1].min + 1; // Add 1 for display
  const z2Max = zones[1].max;
  const z2Match = z2Min === 123 && z2Max === 151;
  console.log(`Zone 2: ${z2Match ? '✅' : '❌'} (${z2Min}-${z2Max})`);
  allMatch = allMatch && z2Match;

  // Zone 3
  const z3Min = zones[2].min + 1; // Add 1 for display
  const z3Max = zones[2].max;
  const z3Match = z3Min === 152 && z3Max === 166;
  console.log(`Zone 3: ${z3Match ? '✅' : '❌'} (${z3Min}-${z3Max})`);
  allMatch = allMatch && z3Match;

  // Zone 4
  const z4Min = zones[3].min + 1; // Add 1 for display
  const z4Max = zones[3].max;
  const z4Match = z4Min === 167 && z4Max === 181;
  console.log(`Zone 4: ${z4Match ? '✅' : '❌'} (${z4Min}-${z4Max})`);
  allMatch = allMatch && z4Match;

  // Zone 5
  const z5Min = zones[4].min + 1; // Add 1 for display
  const z5Max = 'Max';
  const z5Match = z5Min === 182;
  console.log(`Zone 5: ${z5Match ? '✅' : '❌'} (${z5Min}-${z5Max})`);
  allMatch = allMatch && z5Match;

  console.log('\n' + '='.repeat(80));
  if (allMatch) {
    console.log('✅ ALL ZONES MATCH STRAVA DISPLAY!');
  } else {
    console.log('❌ SOME ZONES DO NOT MATCH - Check above for details');
  }
  console.log('='.repeat(80));

  console.log('\n📱 View the app at: http://localhost:3005/athlete/' + athlete.id);
  console.log('   Compare the displayed zones with the output above.\n');
}

verifyZoneDisplay().catch(console.error);
