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
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        id,
        firstname,
        lastname,
        activities (
          zone_points
        )
      `)
      .order('firstname', { ascending: true });

    if (error) {
      console.error('Error fetching athletes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Calculate totals for each athlete
    const leaderboard: LeaderboardEntry[] = (data || []).map((athlete: any) => {
      const totalPoints = athlete.activities?.reduce((sum: number, activity: any) => {
        return sum + (parseFloat(activity.zone_points) || 0);
      }, 0) || 0;

      return {
        athlete_id: athlete.id,
        firstname: athlete.firstname || '',
        lastname: athlete.lastname || '',
        total_points: totalPoints,
        activity_count: athlete.activities?.length || 0,
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
