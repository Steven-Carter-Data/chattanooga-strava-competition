-- ===========================================
--  Extensions (UUID generation)
-- ===========================================
create extension if not exists "pgcrypto";

-- ===========================================
--  ATHLETES
-- ===========================================
create table if not exists public.athletes (
  id                uuid primary key default gen_random_uuid(),
  strava_athlete_id bigint unique not null,
  firstname         text,
  lastname          text,
  profile_image_url text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_athletes_strava_athlete_id
  on public.athletes (strava_athlete_id);

-- ===========================================
--  COMPETITION CONFIG
--  (You’ll probably only have 1 active row)
-- ===========================================
create table if not exists public.competition_config (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed the 70.3 competition row (run once)
insert into public.competition_config (name, start_date, end_date, is_active)
values (
  'Ironman 70.3 Training Championship 2026',
  '2026-01-01T00:00:00Z',
  '2026-03-31T23:59:59Z',
  true
)
on conflict do nothing;

-- ===========================================
--  ACTIVITIES
--  (Raw Strava activities + summary fields)
-- ===========================================
create table if not exists public.activities (
  id                      uuid primary key default gen_random_uuid(),
  strava_activity_id      bigint unique not null,
  athlete_id              uuid not null references public.athletes(id) on delete cascade,

  name                    text,
  sport_type              text,
  start_date              timestamptz,
  distance_m              numeric,
  moving_time_s           integer,
  elapsed_time_s          integer,
  average_heartrate       numeric,
  max_heartrate           numeric,
  average_speed_mps       numeric,
  total_elevation_gain_m  numeric,

  -- Per-activity total points (precomputed)
  zone_points             numeric default 0,

  -- Whether this activity counts for the current competition
  in_competition_window   boolean not null default false,

  -- Optional: store full Strava JSON for debugging/re-processing
  raw_payload             jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_activities_athlete_id
  on public.activities (athlete_id);

create index if not exists idx_activities_start_date
  on public.activities (start_date);

create index if not exists idx_activities_in_competition
  on public.activities (in_competition_window);

create index if not exists idx_activities_strava_activity_id
  on public.activities (strava_activity_id);

-- ===========================================
--  HEART RATE ZONES
--  (Per-activity time in each HR zone, seconds)
-- ===========================================
create table if not exists public.heart_rate_zones (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null references public.activities(id) on delete cascade,
  zone_1_time_s   integer not null default 0,
  zone_2_time_s   integer not null default 0,
  zone_3_time_s   integer not null default 0,
  zone_4_time_s   integer not null default 0,
  zone_5_time_s   integer not null default 0,
  created_at      timestamptz not null default now()
);

create unique index if not exists uq_hr_zones_activity_id
  on public.heart_rate_zones (activity_id);

create index if not exists idx_hr_zones_activity_id
  on public.heart_rate_zones (activity_id);

-- ===========================================
--  FUNCTION: Update in_competition_window
--  Automatically set activities.in_competition_window
--  based on active competition_config row.
-- ===========================================
create or replace function public.set_activity_competition_flag()
returns trigger
language plpgsql
as $$
declare
  cfg record;
begin
  -- Find the active competition (assume 0 or 1 row)
  select *
  into cfg
  from public.competition_config
  where is_active = true
  order by start_date desc
  limit 1;

  if cfg is null or NEW.start_date is null then
    NEW.in_competition_window := false;
  else
    NEW.in_competition_window :=
      (NEW.start_date >= cfg.start_date and NEW.start_date <= cfg.end_date);
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

-- Trigger on insert / update of activities
drop trigger if exists trg_set_activity_competition_flag on public.activities;

create trigger trg_set_activity_competition_flag
before insert or update
on public.activities
for each row
execute function public.set_activity_competition_flag();

-- ===========================================
--  FUNCTION: Compute zone_points from HR zones
--  zone_points = sum(zone_minutes * weight)
--  We’ll call this after we insert/update heart_rate_zones.
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
begin
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

-- Trigger to recalc zone_points whenever HR zones change
drop trigger if exists trg_update_activity_zone_points on public.heart_rate_zones;

create trigger trg_update_activity_zone_points
after insert or update
on public.heart_rate_zones
for each row
execute function public.update_activity_zone_points();

-- ===========================================
--  VIEW: Leaderboard (Total Points per Athlete)
--  Only counts activities in the active competition window.
-- ===========================================
create or replace view public.leaderboard_points as
select
  a.athlete_id,
  ath.firstname,
  ath.lastname,
  sum(a.zone_points) as total_points,
  count(*)           as activity_count
from public.activities a
join public.athletes ath
  on ath.id = a.athlete_id
where a.in_competition_window = true
group by a.athlete_id, ath.firstname, ath.lastname
order by total_points desc;

-- ===========================================
--  VIEW: Athlete Activity Detail (optional helper)
-- ===========================================
create or replace view public.activity_detail as
select
  a.id,
  a.strava_activity_id,
  a.athlete_id,
  ath.firstname,
  ath.lastname,
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
