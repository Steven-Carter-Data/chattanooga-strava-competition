-- Verify Competition Readiness for January 1, 2026
-- Run this in Supabase SQL Editor to confirm setup

-- =====================================================
-- STEP 1: Check competition_config table
-- Should have TWO periods, both with is_active = true
-- =====================================================
SELECT
  id,
  name,
  start_date,
  end_date,
  is_active,
  NOW() as current_time,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN '*** CURRENT ***'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'PAST'
  END as status
FROM competition_config
ORDER BY start_date;

-- EXPECTED OUTPUT:
-- 1. Pre-Season (Nov 16 - Dec 31, 2025) - should show "CURRENT" today
-- 2. Competition (Jan 1 - May 3, 2026) - should show "UPCOMING" today

-- =====================================================
-- STEP 2: Check that the trigger function is correct
-- It should check ANY active competition period
-- =====================================================
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'set_activity_competition_flag';

-- The trigger should use EXISTS to check if activity date
-- falls within ANY active competition period

-- =====================================================
-- STEP 3: Simulate what will happen on Jan 1, 2026
-- Check if an activity at that date would be marked correctly
-- =====================================================
SELECT
  c.name,
  c.start_date,
  c.end_date,
  c.is_active,
  '2026-01-01T12:00:00Z'::timestamptz as sample_activity_date,
  CASE
    WHEN '2026-01-01T12:00:00Z'::timestamptz >= c.start_date
     AND '2026-01-01T12:00:00Z'::timestamptz <= c.end_date
    THEN 'YES - Would be included'
    ELSE 'NO - Would be excluded'
  END as would_be_in_competition
FROM competition_config c
WHERE c.is_active = true
ORDER BY c.start_date;

-- =====================================================
-- STEP 4: Check current activity counts per period
-- =====================================================
SELECT
  CASE
    WHEN a.start_date >= '2025-11-16' AND a.start_date <= '2025-12-31' THEN 'Pre-Season'
    WHEN a.start_date >= '2026-01-01' AND a.start_date <= '2026-05-03' THEN 'Competition'
    ELSE 'Other'
  END as period,
  COUNT(*) as activity_count,
  SUM(a.zone_points) as total_points
FROM public.activities a
WHERE a.in_competition_window = true
GROUP BY 1
ORDER BY 1;

-- =====================================================
-- SUMMARY OF WHAT SHOULD HAPPEN ON JAN 1:
-- =====================================================
-- 1. getActiveCompetitionConfig() will return the "Competition" period
--    because Jan 1 falls within Jan 1 - May 3, 2026
--
-- 2. New activities synced on Jan 1+ will:
--    - Be filtered to competition date range (Jan 1 - May 3)
--    - Have in_competition_window = true set explicitly in code
--
-- 3. Pre-season activities will STILL count because:
--    - They already have in_competition_window = true
--    - The leaderboard queries by in_competition_window, not by date
--
-- 4. The leaderboard will show CUMULATIVE points from both periods
