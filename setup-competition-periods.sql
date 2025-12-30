-- Setup Competition Periods
-- Run this in Supabase SQL Editor to configure competition periods
-- The app will automatically select the correct period based on current date

-- First, remove the is_active constraint since we now use date-based selection
-- (The app logic will pick the right period automatically)

-- Clear existing configs and insert both periods
DELETE FROM competition_config;

-- Insert Pre-Season Period (Nov 16 - Dec 31, 2025)
INSERT INTO competition_config (name, start_date, end_date, is_active)
VALUES (
  'Pre-Season',
  '2025-11-16T00:00:00Z',
  '2025-12-31T23:59:59Z',
  true
);

-- Insert Main Competition Period (Jan 1 - May 3, 2026)
INSERT INTO competition_config (name, start_date, end_date, is_active)
VALUES (
  'Ironman 70.3 Training Championship',
  '2026-01-01T00:00:00Z',
  '2026-05-03T23:59:59Z',
  true
);

-- Verify the setup
SELECT
  name,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN NOW() >= start_date AND NOW() <= end_date THEN 'ACTIVE NOW'
    WHEN NOW() < start_date THEN 'UPCOMING'
    ELSE 'COMPLETED'
  END as status
FROM competition_config
ORDER BY start_date;
