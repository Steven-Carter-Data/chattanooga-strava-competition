-- ===========================================
--  ATHLETE TOKENS
--  Store OAuth tokens for accessing Strava API
-- ===========================================
create table if not exists public.athlete_tokens (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid not null references public.athletes(id) on delete cascade,
  access_token      text not null,
  refresh_token     text not null,
  expires_at        timestamptz not null,
  scope             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists uq_athlete_tokens_athlete_id
  on public.athlete_tokens (athlete_id);

create index if not exists idx_athlete_tokens_athlete_id
  on public.athlete_tokens (athlete_id);
