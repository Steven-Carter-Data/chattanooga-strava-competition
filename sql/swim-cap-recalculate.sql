-- Swim Cap Recalculation for Last 4 Weeks
-- Run this in Supabase SQL Editor if swim activities in weeks 14-17
-- need to be recalculated (e.g., after a manual correction)
--
-- Competition: Jan 1 - May 3, 2026
-- Week 1 starts: Jan 5, 2026 (Monday)
-- Last 4 weeks (cap period):
--   Week 14: Apr 6-12
--   Week 15: Apr 13-19
--   Week 16: Apr 20-26
--   Week 17: Apr 27 - May 3
--
-- Cap rule: 3 hours (10800s) weekly swim time gets 4x multiplier
-- Overflow swim time uses HR zone scoring
--
-- NOTE: This script shows swim activities in the cap period for manual review.
-- Actual recalculation should be done via the sync endpoint to ensure
-- HR zone data is properly applied.

-- View swim activities in the cap period (weeks 14-17)
-- Week 14 starts Apr 6, 2026
SELECT
  a.id,
  a.strava_activity_id,
  a.athlete_id,
  ath.firstname,
  ath.lastname,
  a.name,
  a.start_date,
  a.moving_time_s,
  a.moving_time_s / 60.0 as minutes,
  a.zone_points,
  (a.moving_time_s / 60.0) * 4 as uncapped_4x_points,
  hrz.zone_1_time_s,
  hrz.zone_2_time_s,
  hrz.zone_3_time_s,
  hrz.zone_4_time_s,
  hrz.zone_5_time_s
FROM activities a
JOIN athletes ath ON a.athlete_id = ath.id
LEFT JOIN heart_rate_zones hrz ON a.id = hrz.activity_id
WHERE a.sport_type = 'Swim'
  AND a.in_competition_window = true
  AND a.start_date >= '2026-04-06T00:00:00Z'  -- Week 14 start
  AND a.hidden IS NOT TRUE
ORDER BY a.athlete_id, a.start_date;

-- View weekly swim totals per athlete during cap period
SELECT
  ath.firstname || ' ' || ath.lastname as athlete,
  date_trunc('week', a.start_date AT TIME ZONE 'America/New_York') as week_start,
  COUNT(*) as swim_count,
  SUM(a.moving_time_s) as total_swim_seconds,
  SUM(a.moving_time_s) / 60.0 as total_swim_minutes,
  SUM(a.moving_time_s) / 3600.0 as total_swim_hours,
  CASE
    WHEN SUM(a.moving_time_s) > 10800 THEN 'OVER CAP'
    ELSE 'Under cap'
  END as cap_status
FROM activities a
JOIN athletes ath ON a.athlete_id = ath.id
WHERE a.sport_type = 'Swim'
  AND a.in_competition_window = true
  AND a.start_date >= '2026-04-06T00:00:00Z'
  AND a.hidden IS NOT TRUE
GROUP BY ath.firstname, ath.lastname, date_trunc('week', a.start_date AT TIME ZONE 'America/New_York')
ORDER BY week_start, athlete;
