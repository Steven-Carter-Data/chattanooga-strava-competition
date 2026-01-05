-- Debug Pace Analysis: Check if activities have distance data
-- Run this in Supabase SQL Editor

-- Step 1: Check all activities and their distance data
SELECT
  a.name,
  a.sport_type,
  a.start_date,
  a.distance_m,
  a.moving_time_s,
  CASE
    WHEN a.distance_m > 0 AND a.moving_time_s > 0 THEN 'Has Pace Data'
    ELSE 'Missing Pace Data'
  END as pace_status,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
ORDER BY a.start_date DESC;

-- Step 2: Check specifically for Steven's activities
SELECT
  a.name,
  a.sport_type,
  a.distance_m,
  a.moving_time_s,
  a.average_speed_mps
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE ath.firstname = 'Steven'
ORDER BY a.start_date DESC;

-- Step 3: Count activities that would show in Pace Analysis (have distance > 0)
SELECT
  sport_type,
  COUNT(*) as total,
  COUNT(CASE WHEN distance_m > 0 THEN 1 END) as has_distance,
  COUNT(CASE WHEN distance_m IS NULL OR distance_m = 0 THEN 1 END) as missing_distance
FROM public.activities
GROUP BY sport_type
ORDER BY sport_type;
