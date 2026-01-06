import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/activity/[id]/toggle-pace-exclusion
 * Toggle the exclude_from_pace_analysis flag for an activity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;

    // Get current value
    const { data: activity, error: fetchError } = await supabaseAdmin
      .from('activities')
      .select('id, exclude_from_pace_analysis')
      .eq('id', activityId)
      .single();

    if (fetchError || !activity) {
      console.error('Error fetching activity:', fetchError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Toggle the value
    const newValue = !activity.exclude_from_pace_analysis;

    const { error: updateError } = await supabaseAdmin
      .from('activities')
      .update({ exclude_from_pace_analysis: newValue })
      .eq('id', activityId);

    if (updateError) {
      console.error('Error updating activity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exclude_from_pace_analysis: newValue,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
