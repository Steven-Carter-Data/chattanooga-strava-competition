import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser/Client-side Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (with service role key for privileged operations)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get the active competition config based on current date.
 * Automatically selects the appropriate period:
 * - Testing Period: Nov 18 - Dec 31, 2025
 * - Competition Period: Jan 1 - May 3, 2026
 *
 * Logic: Selects the config where current date falls within start_date and end_date,
 * or the next upcoming config if no current period exists.
 */
export async function getActiveCompetitionConfig(client: SupabaseClient = supabase) {
  const now = new Date();

  // Get all competition configs ordered by start_date
  const { data: configs, error } = await client
    .from('competition_config')
    .select('*')
    .order('start_date', { ascending: true });

  if (error || !configs || configs.length === 0) {
    return { data: null, error: error || new Error('No competition configs found') };
  }

  // Find the config where current date is within the range
  const activeConfig = configs.find(config => {
    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);
    return now >= startDate && now <= endDate;
  });

  if (activeConfig) {
    return { data: activeConfig, error: null };
  }

  // If no active period, find the next upcoming one
  const upcomingConfig = configs.find(config => {
    const startDate = new Date(config.start_date);
    return now < startDate;
  });

  if (upcomingConfig) {
    return { data: upcomingConfig, error: null };
  }

  // If all periods have passed, return the most recent one
  const lastConfig = configs[configs.length - 1];
  return { data: lastConfig, error: null };
}
