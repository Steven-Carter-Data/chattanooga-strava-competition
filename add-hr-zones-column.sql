-- Add HR zones column to athletes table
-- Run this in Supabase SQL Editor

ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS hr_zones JSONB;

COMMENT ON COLUMN athletes.hr_zones IS 'Athlete heart rate zone configuration from Strava (custom_zones boolean and zones array with min/max)';

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athletes'
AND column_name = 'hr_zones';
