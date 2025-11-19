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
  const scope = 'activity:read_all,read';

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('approval_prompt', 'force');

  return NextResponse.redirect(authUrl.toString());
}
