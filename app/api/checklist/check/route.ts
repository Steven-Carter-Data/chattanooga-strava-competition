import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/checklist/check
 * Toggle check status for an athlete on a checklist item
 * Body: { item_id: string, athlete_id: string, checked: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, athlete_id, checked } = body;

    if (!item_id || !athlete_id || typeof checked !== 'boolean') {
      return NextResponse.json(
        { error: 'item_id, athlete_id, and checked (boolean) are required' },
        { status: 400 }
      );
    }

    // Upsert the check record
    const { data, error } = await supabase
      .from('checklist_checks')
      .upsert(
        {
          item_id,
          athlete_id,
          checked,
          checked_at: checked ? new Date().toISOString() : null,
        },
        { onConflict: 'item_id,athlete_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error toggling check:', error);
      return NextResponse.json({ error: 'Failed to update check status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
