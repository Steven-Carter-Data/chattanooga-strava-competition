-- Extend competition end to midnight Eastern Time on May 3, 2026.
-- The previous value (2026-05-03T23:59:59Z) was midnight UTC = 7:59:59 PM EDT,
-- which would end the competition ~4 hours early for athletes in Eastern Time.
-- New value: 2026-05-04T03:59:59Z = 11:59:59 PM EDT on May 3, 2026 (DST in effect).

UPDATE competition_config
SET end_date = '2026-05-04T03:59:59Z'
WHERE name = 'Ironman 70.3 Training Championship'
  AND start_date = '2026-01-01T00:00:00Z';

-- Re-evaluate in_competition_window for any activities that may already exist
-- in the newly-extended window (8:00 PM EDT - midnight EDT on May 3).
-- The BEFORE UPDATE trigger re-runs set_activity_competition_flag().
UPDATE activities
SET updated_at = NOW()
WHERE start_date >= '2026-05-03T23:59:59Z'
  AND start_date <  '2026-05-04T04:00:00Z';

-- Verify the new boundaries in Eastern Time.
SELECT
  name,
  start_date AT TIME ZONE 'America/New_York' AS start_eastern,
  end_date   AT TIME ZONE 'America/New_York' AS end_eastern,
  is_active
FROM competition_config
ORDER BY start_date;
