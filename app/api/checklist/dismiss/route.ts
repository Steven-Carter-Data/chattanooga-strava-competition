import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/checklist/dismiss
 * Dismiss or restore an item on an athlete's personal checklist
 * Body: { item_id: string, athlete_id: string, dismissed: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, athlete_id, dismissed } = body;

    if (!item_id || !athlete_id || typeof dismissed !== 'boolean') {
      return NextResponse.json(
        { error: 'item_id, athlete_id, and dismissed (boolean) are required' },
        { status: 400 }
      );
    }

    if (dismissed) {
      // Dismiss: insert a dismissal record
      const { error } = await supabase
        .from('checklist_dismissals')
        .upsert(
          { item_id, athlete_id, dismissed_at: new Date().toISOString() },
          { onConflict: 'item_id,athlete_id' }
        );

      if (error) {
        console.error('Error dismissing item:', error);
        return NextResponse.json({ error: 'Failed to dismiss item' }, { status: 500 });
      }

      // Also uncheck the item if it was checked
      await supabase
        .from('checklist_checks')
        .update({ checked: false, checked_at: null })
        .eq('item_id', item_id)
        .eq('athlete_id', athlete_id);
    } else {
      // Restore: remove the dismissal record
      const { error } = await supabase
        .from('checklist_dismissals')
        .delete()
        .eq('item_id', item_id)
        .eq('athlete_id', athlete_id);

      if (error) {
        console.error('Error restoring item:', error);
        return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
