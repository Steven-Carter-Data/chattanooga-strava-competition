// Supabase Edge Function to redirect old webhook to new Vercel endpoint
// Deploy this to: https://jmyqirpxiyxfwxpisyhu.supabase.co/functions/v1/strava-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const NEW_WEBHOOK_URL = 'https://70-3-chattanooga-strava-bc-comp.vercel.app/api/strava/webhook';

serve(async (req) => {
  const url = new URL(req.url);

  // Handle GET request (webhook verification)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    // Forward verification to new endpoint
    const verifyUrl = `${NEW_WEBHOOK_URL}?hub.mode=${mode}&hub.verify_token=${token}&hub.challenge=${challenge}`;
    const response = await fetch(verifyUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: response.status,
    });
  }

  // Handle POST request (webhook events)
  if (req.method === 'POST') {
    const body = await req.json();

    // Forward event to new endpoint
    const response = await fetch(NEW_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  return new Response('Method not allowed', { status: 405 });
});
