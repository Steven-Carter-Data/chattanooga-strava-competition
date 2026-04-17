import { NextRequest, NextResponse } from 'next/server';
import { supabase, getActiveCompetitionConfig } from '@/lib/supabase';
import { getWeekStartEST, getWeekEndEST, toEasternTime } from '@/lib/timezone';

/**
 * Calculate week number and date range for a specific week
 * Week 0 = partial week from competition start to first Sunday
 * Week 1+ = full Monday-Sunday weeks
 */
function getWeekRange(weekNumber: number, competitionStart: Date): { weekStart: Date; weekEnd: Date; weekLabel: string } | null {
  const compStartEST = toEasternTime(competitionStart);
  const compStartDay = compStartEST.getDay();
  const startsOnMonday = compStartDay === 1;

  if (weekNumber === 0 && !startsOnMonday) {
    // Week 0: Partial week from competition start to first Sunday
    const weekStart = new Date(competitionStart);
    const weekEnd = getWeekEndEST(competitionStart);
    return { weekStart, weekEnd, weekLabel: 'Week 0' };
  }

  // For full weeks, calculate the Monday start
  let targetWeekStart: Date;
  if (startsOnMonday) {
    // Competition starts on Monday, so Week 1 = competition start
    targetWeekStart = new Date(competitionStart);
    targetWeekStart.setDate(targetWeekStart.getDate() + (weekNumber - 1) * 7);
  } else {
    // Get the first Monday after competition start
    const firstMonday = getWeekStartEST(competitionStart);
    firstMonday.setDate(firstMonday.getDate() + 7);
    // Then add weeks for the requested week number
    targetWeekStart = new Date(firstMonday);
    targetWeekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  }

  const weekEnd = getWeekEndEST(targetWeekStart);
  return { weekStart: targetWeekStart, weekEnd, weekLabel: `Week ${weekNumber}` };
}

/**
 * Generate list of all available weeks from competition start to now
 */
function getAvailableWeeks(competitionStart: Date): Array<{ weekNumber: number; weekLabel: string; weekStart: string; weekEnd: string; isCurrentWeek: boolean }> {
  const now = toEasternTime(new Date());
  const compStartEST = toEasternTime(competitionStart);
  const compStartDay = compStartEST.getDay();
  const startsOnMonday = compStartDay === 1;

  const weeks: Array<{ weekNumber: number; weekLabel: string; weekStart: string; weekEnd: string; isCurrentWeek: boolean }> = [];

  // Current week boundaries for comparison
  const currentWeekStart = getWeekStartEST(now);

  // Week 0 if competition doesn't start on Monday
  if (!startsOnMonday) {
    const week0End = getWeekEndEST(competitionStart);
    weeks.push({
      weekNumber: 0,
      weekLabel: 'Week 0',
      weekStart: competitionStart.toISOString(),
      weekEnd: week0End.toISOString(),
      isCurrentWeek: currentWeekStart.getTime() === getWeekStartEST(competitionStart).getTime(),
    });
  }

  // Full weeks
  let weekNumber = 1;
  let currentWeekStartDate: Date;

  if (startsOnMonday) {
    currentWeekStartDate = new Date(competitionStart);
  } else {
    currentWeekStartDate = getWeekStartEST(competitionStart);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
  }

  while (currentWeekStartDate <= now) {
    const weekEnd = getWeekEndEST(currentWeekStartDate);
    weeks.push({
      weekNumber,
      weekLabel: `Week ${weekNumber}`,
      weekStart: currentWeekStartDate.toISOString(),
      weekEnd: weekEnd.toISOString(),
      isCurrentWeek: currentWeekStartDate.getTime() === currentWeekStart.getTime(),
    });

    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}

/**
 * GET /api/weekly-stats
 * Returns weekly performance statistics
 * Query params:
 *   - week: specific week number (0, 1, 2...) - defaults to current week
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    // Get competition config for start date
    const { data: competitionConfig } = await getActiveCompetitionConfig(supabase);
    const competitionStart = competitionConfig?.start_date
      ? new Date(competitionConfig.start_date)
      : new Date('2026-01-01');

    // Generate list of available weeks
    const availableWeeks = getAvailableWeeks(competitionStart);

    // Determine which week to show
    let weekStart: Date;
    let weekEnd: Date;
    let weekLabel: string;
    let weekNumber: number;

    if (weekParam !== null) {
      // Specific week requested
      weekNumber = parseInt(weekParam, 10);
      const weekRange = getWeekRange(weekNumber, competitionStart);
      if (!weekRange) {
        return NextResponse.json({ error: 'Invalid week number' }, { status: 400 });
      }
      weekStart = weekRange.weekStart;
      weekEnd = weekRange.weekEnd;
      weekLabel = weekRange.weekLabel;
    } else {
      // Default to current week
      const now = new Date();
      weekStart = getWeekStartEST(now);
      weekEnd = getWeekEndEST(now);

      // Find current week number
      const currentWeek = availableWeeks.find(w => w.isCurrentWeek);
      weekNumber = currentWeek?.weekNumber ?? availableWeeks.length - 1;
      weekLabel = currentWeek?.weekLabel ?? `Week ${weekNumber}`;
    }

    // weekEndQuery is exclusive (for database lt query)
    const weekEndQuery = new Date(weekStart);
    weekEndQuery.setDate(weekStart.getDate() + 7);

    console.log('Week range:', weekStart.toISOString(), 'to', weekEndQuery.toISOString());

    // Get all activities for this week
    // Filter out hidden activities (duplicates/merged)
    const { data: rawActivities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        athlete_id,
        start_date,
        zone_points,
        corrected_zone_points,
        distance_m,
        moving_time_s,
        hidden,
        athletes (
          firstname,
          lastname,
          profile_image_url
        )
      `)
      .eq('in_competition_window', true)
      .gte('start_date', weekStart.toISOString())
      .lt('start_date', weekEndQuery.toISOString())
      .order('start_date', { ascending: false });

    // Filter and flatten the response
    const activities = (rawActivities || [])
      .filter((a: any) => a.hidden !== true)  // Filter hidden in code
      .map((activity) => {
        const athlete = Array.isArray(activity.athletes)
          ? activity.athletes[0]
          : activity.athletes;
        return {
          ...activity,
          firstname: athlete?.firstname || '',
          lastname: athlete?.lastname || '',
          profile_image_url: athlete?.profile_image_url || null,
          athletes: undefined,
        };
      });

    if (activitiesError) {
      console.error('Error fetching weekly activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly activities' },
        { status: 500 }
      );
    }

    // Aggregate by athlete
    const athleteStats = new Map<string, {
      athlete_id: string;
      firstname: string;
      lastname: string;
      profile_image_url: string | null;
      total_points: number;
      activity_count: number;
      total_distance_m: number;
      total_time_s: number;
    }>();

    activities?.forEach((activity) => {
      const key = activity.athlete_id;
      const existing = athleteStats.get(key);

      if (existing) {
        existing.total_points += (activity.corrected_zone_points ?? activity.zone_points) || 0;
        existing.activity_count += 1;
        existing.total_distance_m += activity.distance_m || 0;
        existing.total_time_s += activity.moving_time_s || 0;
      } else {
        athleteStats.set(key, {
          athlete_id: activity.athlete_id,
          firstname: activity.firstname,
          lastname: activity.lastname,
          profile_image_url: activity.profile_image_url,
          total_points: (activity.corrected_zone_points ?? activity.zone_points) || 0,
          activity_count: 1,
          total_distance_m: activity.distance_m || 0,
          total_time_s: activity.moving_time_s || 0,
        });
      }
    });

    // Convert to array and sort by points
    const weeklyLeaderboard = Array.from(athleteStats.values())
      .sort((a, b) => b.total_points - a.total_points);

    // Calculate overall stats for the week
    const weekStats = {
      total_activities: activities?.length || 0,
      total_points: activities?.reduce((sum, a) => sum + ((a.corrected_zone_points ?? a.zone_points) || 0), 0) || 0,
      total_distance_m: activities?.reduce((sum, a) => sum + (a.distance_m || 0), 0) || 0,
      total_time_s: activities?.reduce((sum, a) => sum + (a.moving_time_s || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        week_label: weekLabel,
        week_number: weekNumber,
        available_weeks: availableWeeks,
        leaderboard: weeklyLeaderboard,
        stats: weekStats,
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
