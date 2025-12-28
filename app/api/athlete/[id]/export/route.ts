import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/export
 * Returns all activities for an athlete (for CSV export)
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
      .select('firstname, lastname')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Get ALL activities with HR zones for this athlete in the competition window
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_detail')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('in_competition_window', true)
      .order('start_date', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        athlete: {
          firstname: athlete.firstname,
          lastname: athlete.lastname,
        },
        activities: activities || [],
        total_count: activities?.length || 0,
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
