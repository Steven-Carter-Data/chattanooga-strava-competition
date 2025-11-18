import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
    profile_medium: string;
    profile: string;
  };
}

/**
 * Handles OAuth callback from Strava
 * Exchanges authorization code for access token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=auth_failed`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=no_code`
    );
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: StravaTokenResponse = await tokenResponse.json();

    // Store athlete data
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .upsert(
        {
          strava_athlete_id: tokenData.athlete.id,
          firstname: tokenData.athlete.firstname,
          lastname: tokenData.athlete.lastname,
          profile_image_url: tokenData.athlete.profile_medium,
        },
        { onConflict: 'strava_athlete_id' }
      )
      .select('id')
      .single();

    if (athleteError || !athlete) {
      throw new Error('Failed to store athlete data');
    }

    // Store tokens
    const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

    const { error: tokenError } = await supabaseAdmin
      .from('athlete_tokens')
      .upsert(
        {
          athlete_id: athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          scope: 'activity:read_all,read',
        },
        { onConflict: 'athlete_id' }
      );

    if (tokenError) {
      throw new Error('Failed to store tokens');
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?success=auth_complete&athlete=${tokenData.athlete.firstname}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=auth_failed`
    );
  }
}
