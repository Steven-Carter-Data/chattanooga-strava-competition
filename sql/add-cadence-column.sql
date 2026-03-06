-- Add average_cadence column to activities table
-- This stores the average cadence (steps per minute for running) from Strava
ALTER TABLE activities ADD COLUMN IF NOT EXISTS average_cadence numeric;

-- Add a comment to describe the column
COMMENT ON COLUMN activities.average_cadence IS 'Average cadence from Strava - steps per minute for running activities';
