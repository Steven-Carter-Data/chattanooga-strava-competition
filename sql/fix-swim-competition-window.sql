-- Fix Swim Activities: in_competition_window is FALSE
-- Run this in Supabase SQL Editor
--
-- The issue: Swim activities have in_competition_window = false
-- because the trigger checks competition_config when inserting

-- Step 1: Check what's in competition_config
select
  id,
  name,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN 'ACTIVE NOW'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'COMPLETED'
  END as status
from competition_config
order by start_date;

-- Step 2: Check the trigger function to see how it determines competition window
-- The trigger may be using is_active = true to find the config
select pg_get_functiondef(oid)
from pg_proc
where proname = 'set_activity_competition_flag';

-- ===========================================
--  FIX: Update all swim activities to have in_competition_window = true
--  This fixes existing swim activities that were incorrectly marked
-- ===========================================
update public.activities
set in_competition_window = true,
    updated_at = now()
where sport_type = 'Swim'
  and start_date >= '2025-11-16T00:00:00Z'
  and start_date <= '2025-12-31T23:59:59Z';

-- Verify the fix
select
  name,
  sport_type,
  start_date,
  zone_points,
  in_competition_window
from public.activities
where sport_type = 'Swim'
order by start_date desc
limit 10;
