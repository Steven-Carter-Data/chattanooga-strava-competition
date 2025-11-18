// Database types based on schema_draft.sql

export interface Athlete {
  id: string;
  strava_athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_image_url: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  strava_activity_id: number;
  athlete_id: string;
  name: string | null;
  sport_type: string | null;
  start_date: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_speed_mps: number | null;
  total_elevation_gain_m: number | null;
  zone_points: number | null;
  in_competition_window: boolean;
  raw_payload: any | null;
  created_at: string;
  updated_at: string;
}

export interface HeartRateZones {
  id: string;
  activity_id: string;
  zone_1_time_s: number;
  zone_2_time_s: number;
  zone_3_time_s: number;
  zone_4_time_s: number;
  zone_5_time_s: number;
  created_at: string;
}

export interface CompetitionConfig {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// View types
export interface LeaderboardEntry {
  athlete_id: string;
  firstname: string | null;
  lastname: string | null;
  total_points: number;
  activity_count: number;
}

export interface ActivityDetail extends Activity {
  firstname: string | null;
  lastname: string | null;
  zone_1_time_s: number | null;
  zone_2_time_s: number | null;
  zone_3_time_s: number | null;
  zone_4_time_s: number | null;
  zone_5_time_s: number | null;
}

// Strava API types
export interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  athlete: {
    id: number;
  };
  // ... other fields as needed
}

export interface StravaHeartRateStream {
  data: number[];
  series_type: 'distance' | 'time';
  original_size: number;
  resolution: 'low' | 'medium' | 'high';
}
