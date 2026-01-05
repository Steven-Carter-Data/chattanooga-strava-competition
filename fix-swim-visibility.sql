-- Fix Swim Activity Visibility
-- Run this in Supabase SQL Editor
--
-- Issue: Swim activities don't appear in Recent Activities
--
-- Diagnostic: First, let's check what's happening with swim activities

-- Step 1: Check swim activities in the base activities table
select
  'ACTIVITIES TABLE' as source,
  a.name,
  a.sport_type,
  a.start_date,
  a.moving_time_s,
  a.zone_points,
  a.in_competition_window,
  ath.firstname || ' ' || ath.lastname as athlete
from public.activities a
join public.athletes ath on ath.id = a.athlete_id
where a.sport_type = 'Swim'
order by a.start_date desc
limit 10;

-- Step 2: Check if they appear in activity_detail view
select
  'ACTIVITY_DETAIL VIEW' as source,
  name,
  sport_type,
  start_date,
  moving_time_s,
  zone_points,
  in_competition_window,
  firstname || ' ' || lastname as athlete
from public.activity_detail
where sport_type = 'Swim'
order by start_date desc
limit 10;

-- Step 3: Check the current view definition
-- (Run this to see if the view uses JOIN or LEFT JOIN)
select pg_get_viewdef('public.activity_detail', true);

-- ===========================================
--  FIX: Recreate the activity_detail view with LEFT JOIN
--  This ensures activities without HR zones (like swim) still appear
-- ===========================================
create or replace view public.activity_detail as
select
  a.id,
  a.strava_activity_id,
  a.athlete_id,
  ath.firstname,
  ath.lastname,
  ath.profile_image_url,
  a.name,
  a.sport_type,
  a.start_date,
  a.distance_m,
  a.moving_time_s,
  a.average_heartrate,
  a.max_heartrate,
  a.average_speed_mps,
  a.total_elevation_gain_m,
  a.zone_points,
  a.in_competition_window,
  hz.zone_1_time_s,
  hz.zone_2_time_s,
  hz.zone_3_time_s,
  hz.zone_4_time_s,
  hz.zone_5_time_s
from public.activities a
join public.athletes ath on ath.id = a.athlete_id
left join public.heart_rate_zones hz on hz.activity_id = a.id;

-- Step 4: Verify swim activities now appear in the view
select
  'AFTER FIX' as source,
  name,
  sport_type,
  start_date,
  moving_time_s,
  zone_points,
  in_competition_window
from public.activity_detail
where sport_type = 'Swim'
order by start_date desc
limit 10;
