import { NextRequest, NextResponse } from 'next/server';

/**
 * Initiates Strava OAuth flow
 * Redirects user to Strava authorization page
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${request.nextUrl.origin}/api/auth/strava/callback`;

  // Strava OAuth scopes
  // activity:read - Read activities
  // activity:read_all - Read all activities (including private)
  // profile:read_all - Read athlete profile data including HR zones
  const scope = 'activity:read_all,read,profile:read_all';

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('approval_prompt', 'force');

  return NextResponse.redirect(authUrl.toString());
}
