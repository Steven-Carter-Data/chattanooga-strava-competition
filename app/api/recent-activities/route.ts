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
    // Only include activities in the competition window
    const { data: activities, error } = await supabase
      .from('activity_detail')
      .select('*')
      .eq('in_competition_window', true)
      .order('start_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activities || [],
      count: activities?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
