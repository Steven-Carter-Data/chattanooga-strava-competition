import { NextResponse } from 'next/server';
import { supabase, getActiveCompetitionConfig } from '@/lib/supabase';
import { fetchAllActivities } from '@/lib/fetch-all';
import { toEasternTime, getWeekStartEST } from '@/lib/timezone';

/**
 * GET /api/leaderboard/adjusted
 * Returns leaderboard with each athlete's 2 lowest full weeks dropped.
 * Week 0 (partial week) is excluded from drop eligibility.
 */
export async function GET() {
  try {
    // Get competition start date
    const { data: competitionConfig } = await getActiveCompetitionConfig(supabase);
    const competitionStart = competitionConfig?.start_date
      ? new Date(competitionConfig.start_date)
      : new Date('2026-01-01');

    // Determine Week 0 boundary: the Monday after competition start
    const compStartEST = toEasternTime(competitionStart);
    const compStartDay = compStartEST.getDay();
    const startsOnMonday = compStartDay === 1;

    let week1Start: Date;
    if (startsOnMonday) {
      week1Start = new Date(competitionStart);
    } else {
      week1Start = getWeekStartEST(competitionStart);
      week1Start.setDate(week1Start.getDate() + 7);
    }

    // Get all athletes
    const { data: allAthletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, firstname, lastname')
      .order('firstname', { ascending: true });

    if (athletesError) {
      return NextResponse.json({ error: 'Failed to fetch athletes' }, { status: 500 });
    }

    // Get all competition activities with start_date (paginated to avoid 1000-row limit)
    const rawActivities = await fetchAllActivities(
      supabase,
      'athlete_id, zone_points, corrected_zone_points, start_date, hidden',
      { in_competition_window: true }
    );

    const activities = rawActivities.filter((a: any) => a.hidden !== true);

    // Group activities by athlete -> week number
    // Week number is calculated from week1Start
    function getWeekNumber(startDate: string): number {
      const actDate = toEasternTime(new Date(startDate));
      if (actDate < week1Start) return 0; // Week 0
      const diffMs = actDate.getTime() - week1Start.getTime();
      return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    // Build per-athlete, per-week point totals
    const athleteWeeks: Record<string, Record<number, number>> = {};
    const athleteTotals: Record<string, { points: number; count: number }> = {};

    for (const activity of activities) {
      const aid = activity.athlete_id;
      const points = parseFloat(activity.corrected_zone_points ?? activity.zone_points) || 0;
      const weekNum = activity.start_date ? getWeekNumber(activity.start_date) : 0;

      if (!athleteWeeks[aid]) athleteWeeks[aid] = {};
      athleteWeeks[aid][weekNum] = (athleteWeeks[aid][weekNum] || 0) + points;

      if (!athleteTotals[aid]) athleteTotals[aid] = { points: 0, count: 0 };
      athleteTotals[aid].points += points;
      athleteTotals[aid].count += 1;
    }

    // Determine current week number so we can exclude it (still in progress)
    const currentWeekNum = getWeekNumber(new Date().toISOString());

    // Build list of all completed full weeks (1 through currentWeekNum-1)
    const allCompletedWeeks: number[] = [];
    for (let w = 1; w < currentWeekNum; w++) {
      allCompletedWeeks.push(w);
    }

    // For each athlete, find 2 lowest completed weeks (exclude week 0 and current week)
    const leaderboard = (allAthletes || []).map((athlete: any) => {
      const weeks = athleteWeeks[athlete.id] || {};
      const totals = athleteTotals[athlete.id] || { points: 0, count: 0 };

      // Include ALL completed weeks, defaulting to 0 points for weeks with no activity
      const fullWeeks = allCompletedWeeks
        .map(w => ({ week: w, points: weeks[w] || 0 }))
        .sort((a, b) => a.points - b.points);

      // Drop up to 2 lowest weeks
      const droppedWeeks = fullWeeks.slice(0, Math.min(2, fullWeeks.length));
      const droppedPoints = droppedWeeks.reduce((sum, w) => sum + w.points, 0);

      return {
        athlete_id: athlete.id,
        firstname: athlete.firstname || '',
        lastname: athlete.lastname || '',
        total_points: totals.points,
        adjusted_points: totals.points - droppedPoints,
        activity_count: totals.count,
        dropped_weeks: droppedWeeks.map(w => ({
          week: w.week,
          points: w.points,
        })),
        dropped_points: droppedPoints,
      };
    });

    // Sort by adjusted points descending
    leaderboard.sort((a, b) => b.adjusted_points - a.adjusted_points);

    return NextResponse.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
