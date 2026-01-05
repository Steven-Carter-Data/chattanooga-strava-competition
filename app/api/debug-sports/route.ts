import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Debug endpoint to see all sport types in the database
 */
export async function GET() {
  try {
    const { data: activities, error } = await supabase
      .from('activities')
      .select('sport_type, name')
      .order('sport_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by sport type
    const sportTypes: Record<string, { count: number; examples: string[] }> = {};

    for (const activity of activities || []) {
      const sport = activity.sport_type || 'null';
      if (!sportTypes[sport]) {
        sportTypes[sport] = { count: 0, examples: [] };
      }
      sportTypes[sport].count++;
      if (sportTypes[sport].examples.length < 3) {
        sportTypes[sport].examples.push(activity.name);
      }
    }

    return NextResponse.json({
      success: true,
      totalActivities: activities?.length || 0,
      sportTypes,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
