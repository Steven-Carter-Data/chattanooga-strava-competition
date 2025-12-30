-- Update Swim Scoring: 4x Time Multiplier
-- Run this in Supabase SQL Editor to update the zone_points trigger
--
-- This change makes the trigger skip swim activities, since their points
-- are calculated using the 4x time multiplier (not HR zones)

-- ===========================================
--  UPDATED FUNCTION: Compute zone_points from HR zones
--  Now skips swim activities (they use 4x time multiplier)
-- ===========================================
create or replace function public.update_activity_zone_points()
returns trigger
language plpgsql
as $$
declare
  z1_m numeric;
  z2_m numeric;
  z3_m numeric;
  z4_m numeric;
  z5_m numeric;
  total_points numeric;
  activity_sport_type text;
begin
  -- Get the activity's sport type
  select sport_type into activity_sport_type
  from public.activities
  where id = NEW.activity_id;

  -- Skip swim activities - they use 4x time multiplier, not HR zones
  if activity_sport_type = 'Swim' then
    return NEW;
  end if;

  -- Convert seconds to minutes
  z1_m := coalesce(NEW.zone_1_time_s, 0) / 60.0;
  z2_m := coalesce(NEW.zone_2_time_s, 0) / 60.0;
  z3_m := coalesce(NEW.zone_3_time_s, 0) / 60.0;
  z4_m := coalesce(NEW.zone_4_time_s, 0) / 60.0;
  z5_m := coalesce(NEW.zone_5_time_s, 0) / 60.0;

  -- Apply weights: 1–5
  total_points :=
      (z1_m * 1)
    + (z2_m * 2)
    + (z3_m * 3)
    + (z4_m * 4)
    + (z5_m * 5);

  -- Update the linked activity
  update public.activities
  set zone_points = coalesce(total_points, 0),
      updated_at  = now()
  where id = NEW.activity_id;

  return NEW;
end;
$$;

-- ===========================================
--  Recalculate existing swim activities
--  Updates zone_points to use 4x time multiplier
-- ===========================================
update public.activities
set zone_points = (moving_time_s / 60.0) * 4,
    updated_at = now()
where sport_type = 'Swim'
  and moving_time_s is not null;

-- Verify the update
select
  name,
  sport_type,
  moving_time_s,
  moving_time_s / 60.0 as minutes,
  zone_points,
  (moving_time_s / 60.0) * 4 as expected_points
from public.activities
where sport_type = 'Swim'
order by start_date desc;
