-- ===========================================
--  Add exclude_from_pace_analysis column to activities table
--  This allows users to exclude specific activities (like drills)
--  from pace analysis calculations
-- ===========================================

-- Add the column with default false (include all activities by default)
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS exclude_from_pace_analysis boolean NOT NULL DEFAULT false;

-- Create an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_activities_exclude_from_pace_analysis
  ON public.activities (exclude_from_pace_analysis);

-- Optionally: Update specific activities to be excluded
-- Example: Exclude activity with strava_activity_id = 16954956788 (drill swim)
-- UPDATE public.activities
-- SET exclude_from_pace_analysis = true
-- WHERE strava_activity_id = 16954956788;
