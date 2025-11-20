const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugZones() {
  // Get athlete with token (proper join)
  const { data: tokens, error: tokenError } = await supabase
    .from('athlete_tokens')
    .select('access_token, scope, athletes(strava_athlete_id, firstname, lastname)')
    .single();

  if (tokenError || !tokens) {
    console.error('Error fetching token:', tokenError);
    return;
  }

  console.log('Token scope:', tokens.scope);
  console.log('Athlete:', tokens.athletes.firstname, tokens.athletes.lastname);

  const accessToken = tokens.access_token;

  // Test the token with a simple API call
  console.log('\n=== Testing token with athlete profile ===');
  const profileResponse = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    console.error('Profile fetch failed:', profileResponse.status, profileResponse.statusText);
    console.error(await profileResponse.text());
  } else {
    const profile = await profileResponse.json();
    console.log('✅ Profile fetch successful');
    console.log(`Athlete: ${profile.firstname} ${profile.lastname}`);
  }

  // Try to fetch zones
  console.log('\n=== Fetching athlete zones ===');
  const zonesResponse = await fetch('https://www.strava.com/api/v3/athlete/zones', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('Zones response status:', zonesResponse.status, zonesResponse.statusText);

  if (!zonesResponse.ok) {
    const errorText = await zonesResponse.text();
    console.error('Zones fetch failed:',errorText);
    console.log('\nNote: The "read" scope may not be sufficient for athlete/zones endpoint.');
    console.log('You may need to re-authenticate to get proper permissions.');
  } else {
    const zonesData = await zonesResponse.json();
    console.log('✅ Zones fetch successful');
    console.log(JSON.stringify(zonesData, null, 2));
  }

  // Fetch activities to see what we get
  console.log('\n=== Fetching recent activities ===');
  const activitiesResponse = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=2',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!activitiesResponse.ok) {
    console.error('Activities fetch failed:', activitiesResponse.status);
  } else {
    const activities = await activitiesResponse.json();
    console.log(`✅ Fetched ${activities.length} activities`);
    activities.forEach(act => {
      console.log(`  - ${act.name} (ID: ${act.id})`);
      console.log(`    Max HR: ${act.max_heartrate}, Avg HR: ${act.average_heartrate}`);
    });
  }
}

debugZones().catch(console.error);
