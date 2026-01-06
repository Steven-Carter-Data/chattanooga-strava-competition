import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]
 * Returns detailed stats for a specific athlete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Get athlete info
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Get all activities with HR zones for this athlete in the competition window
    // Query activities table directly to get exclude_from_pace_analysis flag
    // Filter out hidden activities (duplicates/merged activities)
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
        average_heartrate,
        max_heartrate,
        average_speed_mps,
        total_elevation_gain_m,
        zone_points,
        in_competition_window,
        exclude_from_pace_analysis,
        hidden,
        heart_rate_zones (
          zone_1_time_s,
          zone_2_time_s,
          zone_3_time_s,
          zone_4_time_s,
          zone_5_time_s
        )
      `)
      .eq('athlete_id', athleteId)
      .eq('in_competition_window', true)
      .or('hidden.is.null,hidden.eq.false')
      .order('start_date', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    // Calculate stats
    const totalPoints = activities?.reduce((sum, a) => sum + (a.zone_points || 0), 0) || 0;
    const activityCount = activities?.length || 0;

    // Group by sport type
    const sportStats = activities?.reduce((acc: any, activity) => {
      const sport = activity.sport_type || 'Unknown';
      if (!acc[sport]) {
        acc[sport] = {
          count: 0,
          points: 0,
          distance_m: 0,
          time_s: 0,
        };
      }
      acc[sport].count += 1;
      acc[sport].points += activity.zone_points || 0;
      acc[sport].distance_m += activity.distance_m || 0;
      acc[sport].time_s += activity.moving_time_s || 0;
      return acc;
    }, {});

    // Calculate weekly breakdown
    const weeklyStats: { [week: string]: number } = {};
    activities?.forEach((activity) => {
      if (activity.start_date) {
        const date = new Date(activity.start_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + (activity.zone_points || 0);
      }
    });

    // Calculate HR zone distribution (total time across all activities)
    const totalZoneTime = {
      zone_1: 0,
      zone_2: 0,
      zone_3: 0,
      zone_4: 0,
      zone_5: 0,
    };

    activities?.forEach((activity) => {
      // Handle nested heart_rate_zones data (can be array or single object)
      const hrZones = Array.isArray(activity.heart_rate_zones)
        ? activity.heart_rate_zones[0]
        : activity.heart_rate_zones;

      if (hrZones) {
        totalZoneTime.zone_1 += hrZones.zone_1_time_s || 0;
        totalZoneTime.zone_2 += hrZones.zone_2_time_s || 0;
        totalZoneTime.zone_3 += hrZones.zone_3_time_s || 0;
        totalZoneTime.zone_4 += hrZones.zone_4_time_s || 0;
        totalZoneTime.zone_5 += hrZones.zone_5_time_s || 0;
      }
    });

    // Flatten activities for response (merge hr zones into activity object)
    const flattenedActivities = activities?.map((activity) => {
      const hrZones = Array.isArray(activity.heart_rate_zones)
        ? activity.heart_rate_zones[0]
        : activity.heart_rate_zones;

      return {
        ...activity,
        zone_1_time_s: hrZones?.zone_1_time_s || 0,
        zone_2_time_s: hrZones?.zone_2_time_s || 0,
        zone_3_time_s: hrZones?.zone_3_time_s || 0,
        zone_4_time_s: hrZones?.zone_4_time_s || 0,
        zone_5_time_s: hrZones?.zone_5_time_s || 0,
        heart_rate_zones: undefined, // Remove nested object
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          profile_image_url: athlete.profile_image_url,
          hr_zones: athlete.hr_zones || null,
        },
        summary: {
          total_points: totalPoints,
          activity_count: activityCount,
        },
        sport_breakdown: sportStats,
        weekly_stats: weeklyStats,
        zone_distribution: totalZoneTime,
        recent_activities: flattenedActivities.slice(0, 10), // Most recent 10
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
