-- Remove Walk activities from the competition
-- The heart_rate_zones table has CASCADE DELETE, so zones are automatically removed

-- First, see what will be deleted
SELECT id, name, sport_type, start_date, zone_points
FROM activities
WHERE sport_type = 'Walk';

-- Delete all Walk activities (this will cascade to heart_rate_zones)
DELETE FROM activities WHERE sport_type = 'Walk';

-- Verify deletion
SELECT COUNT(*) as remaining_walks FROM activities WHERE sport_type = 'Walk';
