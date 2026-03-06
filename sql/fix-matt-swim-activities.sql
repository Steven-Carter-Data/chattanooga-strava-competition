-- Fix Matt Piunti's swim activities
-- Issue: Watch malfunction created 2 incorrect swim activities
-- Solution: Delete the bad ones, add a manual 70-minute swim

-- Step 1: Delete the two malfunctioning swim activities
-- (heart_rate_zones will cascade delete automatically)
DELETE FROM activities
WHERE strava_activity_id IN (17285332190, 17285088903);

-- Step 2: Get Matt Piunti's athlete_id and insert manual swim activity
-- Using a manual strava_activity_id (99999xxxxx pattern to indicate manual entry)
-- Swim scoring: 70 minutes × 4 = 280 points
WITH matt AS (
  SELECT id FROM athletes
  WHERE firstname = 'Matt' AND lastname = 'Piunti'
  LIMIT 1
)
INSERT INTO activities (
  id,
  strava_activity_id,
  athlete_id,
  name,
  sport_type,
  start_date,
  distance_m,
  moving_time_s,
  elapsed_time_s,
  average_heartrate,
  max_heartrate,
  zone_points,
  in_competition_window,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  9999900001,  -- Manual entry ID (won't conflict with real Strava IDs)
  matt.id,
  'Manual Swim Entry (Watch Malfunction Fix)',
  'Swim',
  '2025-02-03T12:00:00Z',  -- Approximate date of the swim
  0,  -- Distance unknown
  4200,  -- 70 minutes = 4200 seconds
  4200,
  NULL,  -- No HR data for swim
  NULL,
  280,  -- 70 min × 4 = 280 points (swim scoring rule)
  true,
  NOW(),
  NOW()
FROM matt;

-- Step 3: Verify the changes
SELECT
  a.name,
  a.sport_type,
  a.start_date,
  a.moving_time_s / 60 as minutes,
  a.zone_points,
  a.strava_activity_id
FROM activities a
JOIN athletes ath ON a.athlete_id = ath.id
WHERE ath.firstname = 'Matt' AND ath.lastname = 'Piunti'
  AND a.sport_type = 'Swim'
ORDER BY a.start_date DESC;
