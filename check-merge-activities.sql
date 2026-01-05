-- Check both activities to see what data each has
SELECT 
  a.strava_activity_id,
  a.name,
  a.sport_type,
  a.start_date,
  a.distance_m,
  a.moving_time_s,
  a.moving_time_s / 60 as minutes,
  a.average_heartrate,
  a.max_heartrate,
  a.zone_points,
  ath.firstname || ' ' || ath.lastname as athlete
FROM public.activities a
JOIN public.athletes ath ON a.athlete_id = ath.id
WHERE a.strava_activity_id IN (16928877112, 16928997427)
ORDER BY a.start_date;

-- Check HR zone data for both activities
SELECT 
  a.strava_activity_id,
  hrz.zone_1_time_s,
  hrz.zone_2_time_s,
  hrz.zone_3_time_s,
  hrz.zone_4_time_s,
  hrz.zone_5_time_s
FROM public.activities a
LEFT JOIN public.heart_rate_zones hrz ON a.id = hrz.activity_id
WHERE a.strava_activity_id IN (16928877112, 16928997427);
