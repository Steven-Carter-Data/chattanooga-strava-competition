-- Fix Today's Activities with in_competition_window = false
-- Run this in Supabase SQL Editor

-- Step 1: Fix ALL activities that should be in Pre-Season window but are marked false
UPDATE public.activities
SET in_competition_window = true,
    updated_at = now()
WHERE start_date >= '2025-11-16T00:00:00Z'
  AND start_date <= '2025-12-31T23:59:59Z'
  AND in_competition_window = false;

-- Step 2: Verify the fix - check recent activities
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

-- Step 3: Check the trigger - why is it inconsistently setting the flag?
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'set_activity_competition_flag';
