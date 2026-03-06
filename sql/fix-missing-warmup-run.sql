-- Fix run activity where watch wasn't started for first 8 minutes
-- strava_activity_id: 17441898611
-- Add 0.8 miles (1287.48m) to distance and 480s to moving time
-- Add 8 min (480s) to zone_1_time_s; trigger will auto-recalculate zone_points

-- Step 1: Show current state
SELECT 'BEFORE' as status, a.name, a.sport_type,
       a.distance_m, a.moving_time_s, a.zone_points,
       hz.zone_1_time_s, hz.zone_2_time_s, hz.zone_3_time_s,
       hz.zone_4_time_s, hz.zone_5_time_s
FROM activities a
LEFT JOIN heart_rate_zones hz ON hz.activity_id = a.id
WHERE a.strava_activity_id = 17441898611;

-- Step 2: Update activity - add 0.8 miles (1287.48m) and 8 min (480s)
UPDATE activities
SET distance_m = distance_m + 1287.48,
    moving_time_s = moving_time_s + 480,
    elapsed_time_s = elapsed_time_s + 480
WHERE strava_activity_id = 17441898611;

-- Step 3: Update heart_rate_zones - add 480s to zone 1
-- This triggers trg_update_activity_zone_points to recalculate zone_points
UPDATE heart_rate_zones
SET zone_1_time_s = zone_1_time_s + 480
WHERE activity_id = (
  SELECT id FROM activities WHERE strava_activity_id = 17441898611
);

-- Step 4: Verify the fix
-- Expected: distance +1287.48m, moving_time +480s, zone_1 +480s, zone_points +8 (480/60 * 1)
SELECT 'AFTER' as status, a.name, a.sport_type,
       a.distance_m, a.moving_time_s, a.zone_points,
       hz.zone_1_time_s, hz.zone_2_time_s, hz.zone_3_time_s,
       hz.zone_4_time_s, hz.zone_5_time_s
FROM activities a
LEFT JOIN heart_rate_zones hz ON hz.activity_id = a.id
WHERE a.strava_activity_id = 17441898611;
