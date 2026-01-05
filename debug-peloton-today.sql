-- Debug Peloton Activity Not Showing (Today's Activity)
-- Run each step in Supabase SQL Editor

-- Step 1: Check ALL activities from the last 3 days (any sport type)
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
WHERE a.start_date >= NOW() - INTERVAL '3 days'
ORDER BY a.start_date DESC;

-- Step 2: Check if there are ANY Peloton activities at all
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.in_competition_window,
  a.zone_points,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE a.sport_type = 'Peloton'
ORDER BY a.start_date DESC
LIMIT 10;

-- Step 3: Check activities that might be indoor bikes but NOT classified as Peloton
-- (Maybe coming through as VirtualRide or just Ride with 0 elevation)
SELECT
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.total_elevation_gain_m,
  a.in_competition_window,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON ath.id = a.athlete_id
WHERE a.sport_type IN ('Ride', 'VirtualRide', 'Peloton', 'Workout', 'Cycling')
   OR (a.total_elevation_gain_m = 0 OR a.total_elevation_gain_m IS NULL)
ORDER BY a.start_date DESC
LIMIT 20;

-- Step 4: Check competition config - is today within range?
SELECT
  id,
  name,
  start_date,
  end_date,
  is_active,
  NOW() as current_time,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN 'TODAY IS IN RANGE'
    WHEN NOW() < start_date THEN 'NOT YET STARTED'
    ELSE 'ALREADY ENDED'
  END as status
FROM competition_config
ORDER BY start_date;

-- Step 5: Check the activity_detail view for recent Peloton
SELECT *
FROM public.activity_detail
WHERE sport_type = 'Peloton'
ORDER BY start_date DESC
LIMIT 10;
