-- Reset database for testing period
-- Run this in Supabase SQL Editor

-- 1. Delete all heart rate zones (must delete first due to foreign key)
DELETE FROM heart_rate_zones;

-- 2. Delete all activities
DELETE FROM activities;

-- 3. Update competition config to competition period (Jan 1 - May 3, 2026)
UPDATE competition_config
SET
  start_date = '2026-01-01',
  end_date = '2026-05-03'
WHERE id = (SELECT id FROM competition_config LIMIT 1);

-- Verify the changes
SELECT * FROM competition_config;
SELECT COUNT(*) as activity_count FROM activities;
SELECT COUNT(*) as hr_zones_count FROM heart_rate_zones;
