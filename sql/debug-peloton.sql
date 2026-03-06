-- Debug Peloton Activity Issue
-- Run these queries in Supabase SQL Editor to diagnose

-- Step 1: Check ALL activities from today (any sport type)
-- This will show if the activity was synced at all
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.moving_time_s,
  a.zone_points,
  a.in_competition_window,
  a.total_elevation_gain_m,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE DATE(a.start_date) = CURRENT_DATE
   OR a.start_date >= NOW() - INTERVAL '2 days'
ORDER BY a.start_date DESC;

-- Step 2: Check all bike-related activities (Ride, VirtualRide, Peloton)
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.total_elevation_gain_m,
  a.in_competition_window,
  a.zone_points,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE a.sport_type IN ('Ride', 'VirtualRide', 'Peloton', 'Workout', 'Cycling')
ORDER BY a.start_date DESC
LIMIT 20;

-- Step 3: Check recent activities for all sport types to see distribution
SELECT
  a.sport_type,
  COUNT(*) as count,
  MAX(a.start_date) as most_recent
FROM public.activities a
GROUP BY a.sport_type
ORDER BY most_recent DESC;

-- Step 4: Check the competition config date range
SELECT
  id,
  name,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN 'CURRENT'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'PAST'
  END as status
FROM competition_config
ORDER BY start_date;

-- Step 5: Check if there are activities with in_competition_window = false
-- that should be true based on current competition dates
SELECT
  a.name,
  a.sport_type,
  a.start_date,
  a.in_competition_window,
  cc.name as competition_name,
  cc.start_date as comp_start,
  cc.end_date as comp_end
FROM public.activities a
CROSS JOIN (SELECT * FROM competition_config WHERE is_active = true LIMIT 1) cc
WHERE a.start_date >= cc.start_date
  AND a.start_date <= cc.end_date
  AND a.in_competition_window = false
ORDER BY a.start_date DESC
LIMIT 20;
