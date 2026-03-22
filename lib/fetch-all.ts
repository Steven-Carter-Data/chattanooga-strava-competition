import { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

/**
 * Fetches all rows from the activities table, paginating to avoid
 * Supabase's default 1000-row PostgREST limit.
 */
export async function fetchAllActivities(
  client: SupabaseClient,
  select: string,
  filters: Record<string, any>
): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;

  while (true) {
    let query = client
      .from('activities')
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activities page:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allRows;
}
