-- Fix HR strap malfunction for strava_activity_id 17399171454
-- activity_id: 96e167a5-2b12-4c11-b8ae-6ab57b1b7b7b7c
-- Issue: HR strap dropped out mid-activity, 544s incorrectly recorded as zone 1
-- Fix: Move 544s from zone_1_time_s to zone_3_time_s
-- The trigger trg_update_activity_zone_points will auto-recalculate zone_points

-- Step 1: Show current state
SELECT 'BEFORE' as status, hz.zone_1_time_s, hz.zone_2_time_s, hz.zone_3_time_s,
       hz.zone_4_time_s, hz.zone_5_time_s, a.zone_points
FROM heart_rate_zones hz
JOIN activities a ON a.id = hz.activity_id
WHERE hz.activity_id = '96e167a5-2b12-4c11-b8ae-6ab57b1b7b7c';

-- Step 2: Move zone_1_time_s (544) into zone_3_time_s, set zone_1 to 0
UPDATE heart_rate_zones
SET zone_3_time_s = zone_3_time_s + zone_1_time_s,
    zone_1_time_s = 0
WHERE activity_id = '96e167a5-2b12-4c11-b8ae-6ab57b1b7b7c';

-- Step 3: Verify the fix - trigger should have updated zone_points automatically
-- Expected: zone_points increases by (544/60) * (3-1) = ~18.13 points
SELECT 'AFTER' as status, hz.zone_1_time_s, hz.zone_2_time_s, hz.zone_3_time_s,
       hz.zone_4_time_s, hz.zone_5_time_s, a.zone_points
FROM heart_rate_zones hz
JOIN activities a ON a.id = hz.activity_id
WHERE hz.activity_id = '96e167a5-2b12-4c11-b8ae-6ab57b1b7b7c';
