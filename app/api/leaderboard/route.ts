import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

/**
 * GET /api/leaderboard
 * Returns leaderboard standings from the database view
 */
export async function GET() {
  try {
    // Query the leaderboard_points view created in the schema
    const { data, error } = await supabase
      .from('leaderboard_points')
      .select('*')
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Transform data to match LeaderboardEntry type
    const leaderboard: LeaderboardEntry[] = (data || []).map((row: any) => ({
      athlete_id: row.athlete_id,
      firstname: row.firstname,
      lastname: row.lastname,
      total_points: parseFloat(row.total_points) || 0,
      activity_count: parseInt(row.activity_count) || 0,
    }));

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
