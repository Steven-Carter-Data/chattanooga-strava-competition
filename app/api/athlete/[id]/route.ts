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
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_detail')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('in_competition_window', true)
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
      totalZoneTime.zone_1 += activity.zone_1_time_s || 0;
      totalZoneTime.zone_2 += activity.zone_2_time_s || 0;
      totalZoneTime.zone_3 += activity.zone_3_time_s || 0;
      totalZoneTime.zone_4 += activity.zone_4_time_s || 0;
      totalZoneTime.zone_5 += activity.zone_5_time_s || 0;
    });

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
        recent_activities: activities?.slice(0, 10) || [], // Most recent 10
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
