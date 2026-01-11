import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/export-all
 * Returns all activity data for all athletes in CSV format
 */
export async function GET() {
  try {
    // Get all activities with athlete info and HR zones
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        strava_activity_id,
        athlete_id,
        name,
        sport_type,
        start_date,
        distance_m,
        moving_time_s,
        elapsed_time_s,
        average_heartrate,
        max_heartrate,
        average_speed_mps,
        total_elevation_gain_m,
        zone_points,
        in_competition_window,
        hidden,
        created_at,
        updated_at,
        athletes (
          strava_athlete_id,
          firstname,
          lastname,
          profile_image_url
        ),
        heart_rate_zones (
          zone_1_time_s,
          zone_2_time_s,
          zone_3_time_s,
          zone_4_time_s,
          zone_5_time_s
        )
      `)
      .order('start_date', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Build CSV header
    const headers = [
      'activity_id',
      'strava_activity_id',
      'athlete_id',
      'strava_athlete_id',
      'firstname',
      'lastname',
      'activity_name',
      'sport_type',
      'start_date',
      'distance_m',
      'distance_km',
      'distance_miles',
      'moving_time_s',
      'moving_time_formatted',
      'elapsed_time_s',
      'average_heartrate',
      'max_heartrate',
      'average_speed_mps',
      'pace_min_per_km',
      'pace_min_per_mile',
      'total_elevation_gain_m',
      'zone_points',
      'zone_1_time_s',
      'zone_2_time_s',
      'zone_3_time_s',
      'zone_4_time_s',
      'zone_5_time_s',
      'zone_1_points',
      'zone_2_points',
      'zone_3_points',
      'zone_4_points',
      'zone_5_points',
      'in_competition_window',
      'hidden',
      'created_at',
      'updated_at',
    ];

    // Helper functions
    const formatTime = (seconds: number | null): string => {
      if (!seconds) return '';
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const metersToKm = (m: number | null): string => {
      if (!m) return '';
      return (m / 1000).toFixed(2);
    };

    const metersToMiles = (m: number | null): string => {
      if (!m) return '';
      return (m / 1609.344).toFixed(2);
    };

    const calcPaceMinPerKm = (speedMps: number | null): string => {
      if (!speedMps || speedMps === 0) return '';
      const minPerKm = (1000 / speedMps) / 60;
      const mins = Math.floor(minPerKm);
      const secs = Math.round((minPerKm - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const calcPaceMinPerMile = (speedMps: number | null): string => {
      if (!speedMps || speedMps === 0) return '';
      const minPerMile = (1609.344 / speedMps) / 60;
      const mins = Math.floor(minPerMile);
      const secs = Math.round((minPerMile - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV rows
    const rows = (activities || []).map((activity: any) => {
      const athlete = activity.athletes;
      const hrZones = Array.isArray(activity.heart_rate_zones)
        ? activity.heart_rate_zones[0]
        : activity.heart_rate_zones;

      const z1 = hrZones?.zone_1_time_s || 0;
      const z2 = hrZones?.zone_2_time_s || 0;
      const z3 = hrZones?.zone_3_time_s || 0;
      const z4 = hrZones?.zone_4_time_s || 0;
      const z5 = hrZones?.zone_5_time_s || 0;

      return [
        activity.id,
        activity.strava_activity_id,
        activity.athlete_id,
        athlete?.strava_athlete_id || '',
        athlete?.firstname || '',
        athlete?.lastname || '',
        escapeCSV(activity.name),
        activity.sport_type,
        activity.start_date,
        activity.distance_m || '',
        metersToKm(activity.distance_m),
        metersToMiles(activity.distance_m),
        activity.moving_time_s || '',
        formatTime(activity.moving_time_s),
        activity.elapsed_time_s || '',
        activity.average_heartrate || '',
        activity.max_heartrate || '',
        activity.average_speed_mps || '',
        calcPaceMinPerKm(activity.average_speed_mps),
        calcPaceMinPerMile(activity.average_speed_mps),
        activity.total_elevation_gain_m || '',
        activity.zone_points || '',
        z1,
        z2,
        z3,
        z4,
        z5,
        (z1 / 60 * 1).toFixed(2),
        (z2 / 60 * 2).toFixed(2),
        (z3 / 60 * 3).toFixed(2),
        (z4 / 60 * 4).toFixed(2),
        (z5 / 60 * 5).toFixed(2),
        activity.in_competition_window ? 'true' : 'false',
        activity.hidden ? 'true' : 'false',
        activity.created_at,
        activity.updated_at,
      ].join(',');
    });

    // Combine header and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bourbon-chasers-export-${timestamp}.csv`;

    // Return as downloadable CSV
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
