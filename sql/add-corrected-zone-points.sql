-- Add corrected_zone_points column to activities table
-- This column stores zone points recalculated using the athlete's DEFAULT HR zone
-- boundaries instead of Strava's sport-specific ride zones.
--
-- For ride/Peloton activities, Strava applies different (lower) zone boundaries
-- which inflates points by ~5-10%. This column holds the corrected value.
--
-- Existing zone_points column is NOT modified.
-- The corrected_zone_points column is NULL until backfilled.

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS corrected_zone_points numeric;

-- Add a comment for documentation
COMMENT ON COLUMN activities.corrected_zone_points IS
  'Zone points recalculated using athlete default HR zones (not sport-specific). NULL means not yet recalculated.';
