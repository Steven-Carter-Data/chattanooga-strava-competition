-- Fix Peloton Activity: in_competition_window is likely FALSE
-- Run this in Supabase SQL Editor
--
-- The issue: Same as swim activities - the trigger may be setting wrong flag

-- Step 1: Check ALL recent activities and their in_competition_window status
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.zone_points,
  a.in_competition_window,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE a.start_date >= NOW() - INTERVAL '7 days'
ORDER BY a.start_date DESC;

-- Step 2: Check specifically for Peloton or bike activities with in_competition_window = false
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.in_competition_window,
  a.zone_points
FROM public.activities a
WHERE a.sport_type IN ('Peloton', 'Ride', 'VirtualRide')
  AND a.in_competition_window = false
  AND a.start_date >= '2025-11-16'
ORDER BY a.start_date DESC;

-- Step 3: Check competition config - what dates are we checking against?
SELECT
  name,
  start_date,
  end_date,
  is_active,
  NOW() as current_time,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN 'CURRENT PERIOD'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'PAST'
  END as status
FROM competition_config
ORDER BY start_date;

-- Step 4: Check the trigger function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'set_activity_competition_flag';

-- ===========================================
--  FIX: Update ALL activities that should be in competition window
--  This fixes any activities incorrectly marked as out of competition
-- ===========================================

-- Option A: Fix ONLY Peloton activities from last 7 days
UPDATE public.activities
SET in_competition_window = true,
    updated_at = now()
WHERE sport_type = 'Peloton'
  AND start_date >= '2025-11-16T00:00:00Z'
  AND start_date <= '2025-12-31T23:59:59Z'
  AND in_competition_window = false;

-- Option B: Fix ALL activities that should be in current pre-season window
-- Uncomment and run this if you want to fix all activity types
/*
UPDATE public.activities
SET in_competition_window = true,
    updated_at = now()
WHERE start_date >= '2025-11-16T00:00:00Z'
  AND start_date <= '2025-12-31T23:59:59Z'
  AND in_competition_window = false;
*/

-- Verify the fix
SELECT
  a.name,
  a.sport_type,
  a.start_date,
  a.zone_points,
  a.in_competition_window,
  ath.firstname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE a.start_date >= NOW() - INTERVAL '7 days'
ORDER BY a.start_date DESC;
