import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

/**
 * GET /api/leaderboard
 * Returns leaderboard standings from the database view
 */
export async function GET() {
  try {
    // Get all athletes with their points (if any)
    // Filter activities to only include those in competition window and not hidden
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        id,
        firstname,
        lastname,
        activities!inner (
          zone_points,
          in_competition_window,
          hidden
        )
      `)
      .eq('activities.in_competition_window', true)
      .eq('activities.hidden', false)
      .order('firstname', { ascending: true });

    // Also get athletes with no qualifying activities
    const { data: allAthletes } = await supabase
      .from('athletes')
      .select('id, firstname, lastname')
      .order('firstname', { ascending: true });

    if (error) {
      console.error('Error fetching athletes:', error);
      // Fall back to all athletes if the filtered query fails
    }

    // Build a map of athlete points from filtered activities
    const athletePointsMap: Record<string, { points: number; count: number }> = {};
    (data || []).forEach((athlete: any) => {
      const totalPoints = athlete.activities?.reduce((sum: number, activity: any) => {
        return sum + (parseFloat(activity.zone_points) || 0);
      }, 0) || 0;
      athletePointsMap[athlete.id] = {
        points: totalPoints,
        count: athlete.activities?.length || 0,
      };
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
