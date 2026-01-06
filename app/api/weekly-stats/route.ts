import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/weekly-stats
 * Returns this week's performance statistics
 */
export async function GET() {
  try {
    // Calculate start of current week (Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    console.log('Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString());

    // Get all activities for this week
    // Filter out hidden activities (duplicates/merged)
    const { data: rawActivities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        athlete_id,
        start_date,
        zone_points,
        distance_m,
        moving_time_s,
        hidden,
        athletes (
          firstname,
          lastname,
          profile_image_url
        )
      `)
      .eq('in_competition_window', true)
      .gte('start_date', weekStart.toISOString())
      .lt('start_date', weekEnd.toISOString())
      .order('start_date', { ascending: false });

    // Filter and flatten the response
    const activities = (rawActivities || [])
      .filter((a: any) => a.hidden !== true)  // Filter hidden in code
      .map((activity) => {
        const athlete = Array.isArray(activity.athletes)
          ? activity.athletes[0]
          : activity.athletes;
        return {
          ...activity,
          firstname: athlete?.firstname || '',
          lastname: athlete?.lastname || '',
          profile_image_url: athlete?.profile_image_url || null,
          athletes: undefined,
        };
      });

    if (activitiesError) {
      console.error('Error fetching weekly activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly activities' },
        { status: 500 }
      );
    }

    // Aggregate by athlete
    const athleteStats = new Map<string, {
      athlete_id: string;
      firstname: string;
      lastname: string;
      profile_image_url: string | null;
      total_points: number;
      activity_count: number;
      total_distance_m: number;
      total_time_s: number;
    }>();

    activities?.forEach((activity) => {
      const key = activity.athlete_id;
      const existing = athleteStats.get(key);

      if (existing) {
        existing.total_points += activity.zone_points || 0;
        existing.activity_count += 1;
        existing.total_distance_m += activity.distance_m || 0;
        existing.total_time_s += activity.moving_time_s || 0;
      } else {
        athleteStats.set(key, {
          athlete_id: activity.athlete_id,
          firstname: activity.firstname,
          lastname: activity.lastname,
          profile_image_url: activity.profile_image_url,
          total_points: activity.zone_points || 0,
          activity_count: 1,
          total_distance_m: activity.distance_m || 0,
          total_time_s: activity.moving_time_s || 0,
        });
      }
    });

    // Convert to array and sort by points
    const weeklyLeaderboard = Array.from(athleteStats.values())
      .sort((a, b) => b.total_points - a.total_points);

    // Calculate overall stats for the week
    const weekStats = {
      total_activities: activities?.length || 0,
      total_points: activities?.reduce((sum, a) => sum + (a.zone_points || 0), 0) || 0,
      total_distance_m: activities?.reduce((sum, a) => sum + (a.distance_m || 0), 0) || 0,
      total_time_s: activities?.reduce((sum, a) => sum + (a.moving_time_s || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        leaderboard: weeklyLeaderboard,
        stats: weekStats,
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
