-- =====================================================
-- JANUARY 1, 2026 - COMPETITION RESET SCRIPT
-- Run this on January 1st to start the real competition fresh
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY CURRENT STATE (run before reset)
-- =====================================================

-- Check how many pre-season activities exist
SELECT
  'Pre-Season Activities' as description,
  COUNT(*) as count,
  ROUND(SUM(zone_points)::numeric, 1) as total_points
FROM public.activities
WHERE in_competition_window = true;

-- Check competition config
SELECT
  name,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN '*** CURRENT ***'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'PAST'
  END as status
FROM competition_config
ORDER BY start_date;

-- =====================================================
-- STEP 2: CLEAR ALL PRE-SEASON ACTIVITY DATA
-- This removes all activities and their HR zone data
-- Athletes remain (they don't need to re-authenticate)
-- =====================================================

-- Delete all heart rate zone records (will cascade from activities anyway)
DELETE FROM public.heart_rate_zones;

-- Delete all activities
DELETE FROM public.activities;

-- Verify deletion
SELECT 'Activities after reset' as description, COUNT(*) as count FROM public.activities;
SELECT 'HR Zones after reset' as description, COUNT(*) as count FROM public.heart_rate_zones;

-- =====================================================
-- STEP 3: UPDATE COMPETITION CONFIG (if needed)
-- Make sure only the main competition period is active
-- =====================================================

-- Option A: Keep both periods active (recommended)
-- This allows the trigger to work correctly for both periods
-- The data is already cleared, so there's no overlap

-- Option B: Deactivate pre-season (optional, not required)
-- UPDATE competition_config
-- SET is_active = false
-- WHERE name LIKE '%Pre-Season%';

-- Verify final config
SELECT
  name,
  start_date,
  end_date,
  is_active
FROM competition_config
ORDER BY start_date;

-- =====================================================
-- STEP 4: VERIFY ATHLETES ARE STILL CONNECTED
-- Athletes should NOT be deleted - they keep their OAuth tokens
-- =====================================================

SELECT
  a.firstname || ' ' || a.lastname as athlete_name,
  a.strava_athlete_id,
  CASE WHEN t.access_token IS NOT NULL THEN 'Connected' ELSE 'Not Connected' END as strava_status
FROM public.athletes a
LEFT JOIN public.athlete_tokens t ON t.athlete_id = a.id
ORDER BY a.firstname;

-- =====================================================
-- DONE! The app is now ready for the January 1st competition
--
-- What happens next:
-- 1. Athletes sync their activities via "Sync All Athletes"
-- 2. Only activities from Jan 1 - May 3, 2026 will be captured
-- 3. Leaderboard starts fresh at 0 points for everyone
-- =====================================================
