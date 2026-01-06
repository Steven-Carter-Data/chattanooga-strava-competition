import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/recent-activities
 * Returns the most recent activities across all athletes
 * Used for the activity feed on the landing page
 */
export async function GET() {
  try {
    // Fetch recent activities with athlete info
    // Only include activities in the competition window and not hidden
    const { data: activities, error } = await supabase
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
        zone_points,
        in_competition_window,
        hidden,
        athletes (
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
      .eq('in_competition_window', true)
      .or('hidden.is.null,hidden.eq.false')
      .order('start_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent activities' },
        { status: 500 }
      );
    }

    // Flatten the response to match the old activity_detail view format
    const flattenedActivities = (activities || []).map((activity: any) => {
      const athlete = activity.athletes;
      const hrZones = Array.isArray(activity.heart_rate_zones)
        ? activity.heart_rate_zones[0]
        : activity.heart_rate_zones;

      return {
        id: activity.id,
        strava_activity_id: activity.strava_activity_id,
        athlete_id: activity.athlete_id,
        firstname: athlete?.firstname || '',
        lastname: athlete?.lastname || '',
        profile_image_url: athlete?.profile_image_url || null,
        name: activity.name,
        sport_type: activity.sport_type,
        start_date: activity.start_date,
        distance_m: activity.distance_m,
        moving_time_s: activity.moving_time_s,
        zone_points: activity.zone_points,
        zone_1_time_s: hrZones?.zone_1_time_s || 0,
        zone_2_time_s: hrZones?.zone_2_time_s || 0,
        zone_3_time_s: hrZones?.zone_3_time_s || 0,
        zone_4_time_s: hrZones?.zone_4_time_s || 0,
        zone_5_time_s: hrZones?.zone_5_time_s || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: flattenedActivities,
      count: flattenedActivities.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
