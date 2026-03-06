-- Delete golf activity (strava_activity_id: 17398044743)
-- Heart rate zones will be automatically deleted via CASCADE
DELETE FROM activities
WHERE strava_activity_id = 17398044743;
