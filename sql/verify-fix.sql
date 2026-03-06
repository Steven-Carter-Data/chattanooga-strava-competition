-- Verify all activities are now correctly flagged
-- Run this in Supabase SQL Editor

-- Check recent activities - all should have in_competition_window = true
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

-- Count any activities in pre-season that are marked FALSE (should be 0)
SELECT COUNT(*) as false_count
FROM public.activities
WHERE start_date >= '2025-11-16T00:00:00Z'
  AND start_date <= '2025-12-31T23:59:59Z'
  AND in_competition_window = false;
