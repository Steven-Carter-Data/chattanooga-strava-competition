import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

/**
 * GET /api/leaderboard
 * Returns leaderboard standings from the database view
 */
export async function GET() {
  try {
    // Get all athletes
    const { data: allAthletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, firstname, lastname')
      .order('firstname', { ascending: true });

    if (athletesError) {
      console.error('Error fetching athletes:', athletesError);
      return NextResponse.json(
        { error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    // Get all activities in competition window
    // Try with hidden filter first, fall back to without if column doesn't exist
    let activities: any[] | null = null;
    let activitiesError: any = null;

    // First try with hidden filter
    const resultWithHidden = await supabase
      .from('activities')
      .select('athlete_id, zone_points, hidden')
      .eq('in_competition_window', true);

    if (resultWithHidden.error) {
      console.error('Error fetching activities:', resultWithHidden.error);
      // If error mentions hidden column, try without it
      const resultWithoutHidden = await supabase
        .from('activities')
        .select('athlete_id, zone_points')
        .eq('in_competition_window', true);

      activities = resultWithoutHidden.data;
      activitiesError = resultWithoutHidden.error;
    } else {
      // Filter out hidden activities in code (handles NULL, false, and missing column)
      activities = (resultWithHidden.data || []).filter(
        (a: any) => a.hidden !== true
      );
    }

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      // Continue with empty activities if error
    }

    // Build a map of athlete points from activities
    const athletePointsMap: Record<string, { points: number; count: number }> = {};
    (activities || []).forEach((activity: any) => {
      const athleteId = activity.athlete_id;
      const points = parseFloat(activity.zone_points) || 0;

      if (!athletePointsMap[athleteId]) {
        athletePointsMap[athleteId] = { points: 0, count: 0 };
      }
      athletePointsMap[athleteId].points += points;
      athletePointsMap[athleteId].count += 1;
    });

    // Calculate totals for each athlete (include all athletes, even those with 0 points)
    const leaderboard: LeaderboardEntry[] = (allAthletes || []).map((athlete: any) => {
      const stats = athletePointsMap[athlete.id] || { points: 0, count: 0 };

      return {
        athlete_id: athlete.id,
        firstname: athlete.firstname || '',
        lastname: athlete.lastname || '',
        total_points: stats.points,
        activity_count: stats.count,
      };
    });

    // Sort by total points descending
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    return NextResponse.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
