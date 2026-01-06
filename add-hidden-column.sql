-- ===========================================
--  Add hidden column to activities table
--  This allows marking activities as "hidden" so they:
--  1. Are not displayed in the UI
--  2. Don't count toward points
--  3. Still exist in DB so sync doesn't re-import them
-- ===========================================

-- Add the column with default false
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Create an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_activities_hidden
  ON public.activities (hidden);

-- Mark the duplicate/merged activities as hidden
UPDATE public.activities
SET hidden = true
WHERE strava_activity_id IN (16928877112, 16938870114);
