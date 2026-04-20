import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_CATEGORIES = ['Swim', 'T1', 'Bike', 'T2', 'Run', 'General'];

/**
 * GET /api/checklist
 * Returns all checklist items grouped by category.
 * When athlete_id is provided, includes per-athlete check and dismissal status.
 * Query params: ?athlete_id=<uuid> (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const athleteId = request.nextUrl.searchParams.get('athlete_id');

    // Fetch all checklist items with who added them
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select(`
        id,
        category,
        item_text,
        added_by,
        created_at,
        updated_at,
        athletes!checklist_items_added_by_fkey (firstname, lastname)
      `)
      .order('category')
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching checklist items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
    }

    // If athlete_id provided, fetch their check statuses and dismissals
    let checksMap: Record<string, boolean> = {};
    let dismissedSet: Set<string> = new Set();

    if (athleteId) {
      const { data: checks, error: checksError } = await supabase
        .from('checklist_checks')
        .select('item_id, checked')
        .eq('athlete_id', athleteId);

      if (!checksError && checks) {
        checks.forEach((c: any) => {
          checksMap[c.item_id] = c.checked;
        });
      }

      const { data: dismissals, error: dismissError } = await supabase
        .from('checklist_dismissals')
        .select('item_id')
        .eq('athlete_id', athleteId);

      if (!dismissError && dismissals) {
        dismissals.forEach((d: any) => {
          dismissedSet.add(d.item_id);
        });
      }
    }

    // Fetch all athletes' check counts per item (for "X of Y packed" display)
    const { data: allChecks, error: allChecksError } = await supabase
      .from('checklist_checks')
      .select('item_id')
      .eq('checked', true);

    const checkCountMap: Record<string, number> = {};
    if (!allChecksError && allChecks) {
      allChecks.forEach((c: any) => {
        checkCountMap[c.item_id] = (checkCountMap[c.item_id] || 0) + 1;
      });
    }

    // Format response
    const formattedItems = (items || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      item_text: item.item_text,
      added_by: item.added_by,
      added_by_firstname: item.athletes?.firstname || null,
      added_by_lastname: item.athletes?.lastname || null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      checked: checksMap[item.id] || false,
      dismissed: dismissedSet.has(item.id),
      check_count: checkCountMap[item.id] || 0,
    }));

    // Group by category in the defined order
    const grouped: Record<string, any[]> = {};
    for (const cat of VALID_CATEGORIES) {
      grouped[cat] = formattedItems.filter((i: any) => i.category === cat);
    }

    return NextResponse.json({
      success: true,
      data: grouped,
      total_items: formattedItems.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/checklist
 * Add a new item to the master checklist
 * Body: { category: string, item_text: string, added_by?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, item_text, added_by } = body;

    if (!category || !item_text) {
      return NextResponse.json({ error: 'category and item_text are required' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    if (item_text.trim().length === 0 || item_text.length > 200) {
      return NextResponse.json({ error: 'item_text must be 1-200 characters' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        category,
        item_text: item_text.trim(),
        added_by: added_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding checklist item:', error);
      return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
