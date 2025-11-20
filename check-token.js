const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkToken() {
  const { data: tokens } = await supabase
    .from('athlete_tokens')
    .select('*, athletes(firstname, lastname)')
    .single();

  if (!tokens) {
    console.log('No tokens found');
    return;
  }

  console.log(`Athlete: ${tokens.athletes.firstname} ${tokens.athletes.lastname}`);
  console.log(`Expires at: ${tokens.expires_at}`);
  console.log(`Current time: ${new Date().toISOString()}`);

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();

  if (expiresAt < now) {
    console.log('❌ Token is EXPIRED');
    console.log('\nAttempting to refresh token...');

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text());
      return;
    }

    const data = await response.json();
    console.log('✅ Token refreshed successfully');

    // Update token in database
    await supabase
      .from('athlete_tokens')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(data.expires_at * 1000).toISOString(),
      })
      .eq('id', tokens.id);

    console.log('✅ Token updated in database');
    console.log(`New expiration: ${new Date(data.expires_at * 1000).toISOString()}`);
  } else {
    console.log('✅ Token is valid');
    const minutesUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60);
    console.log(`Expires in ${minutesUntilExpiry} minutes`);
  }
}

checkToken().catch(console.error);
