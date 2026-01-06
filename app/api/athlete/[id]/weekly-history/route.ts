import { NextRequest, NextResponse } from 'next/server';
import { supabase, getActiveCompetitionConfig } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/weekly-history
 * Returns week-over-week points history for an athlete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Get all activities for this athlete in the competition window
    // Filter out hidden activities (duplicates/merged)
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('start_date, zone_points')
      .eq('athlete_id', athleteId)
      .eq('in_competition_window', true)
      .or('hidden.is.null,hidden.eq.false')
      .order('start_date', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activity history' },
        { status: 500 }
      );
    }

    // Get competition config to determine date range (automatically selects based on current date)
    const { data: competitionConfig } = await getActiveCompetitionConfig(supabase);

    // Default to reasonable date range if no config
    const competitionStart = competitionConfig?.start_date
      ? new Date(competitionConfig.start_date)
      : new Date('2025-11-16'); // Pre-season start

    const now = new Date();

    // Group activities by week (Sunday start)
    const weeklyData: Map<string, {
      weekStart: Date;
      weekEnd: Date;
      points: number;
      activityCount: number;
    }> = new Map();

    activities?.forEach((activity) => {
      if (activity.start_date && activity.zone_points) {
        const date = new Date(activity.start_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekKey = weekStart.toISOString().split('T')[0];

        const existing = weeklyData.get(weekKey);
        if (existing) {
          existing.points += activity.zone_points;
          existing.activityCount += 1;
        } else {
          weeklyData.set(weekKey, {
            weekStart,
            weekEnd,
            points: activity.zone_points,
            activityCount: 1,
          });
        }
      }
    });

    // Generate all weeks from competition start to now (fill gaps with zero)
    const allWeeks: Array<{
      weekStart: string;
      weekEnd: string;
      weekLabel: string;
      points: number;
      activityCount: number;
      cumulativePoints: number;
    }> = [];

    let currentWeekStart = new Date(competitionStart);
    currentWeekStart.setDate(competitionStart.getDate() - competitionStart.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    let cumulativePoints = 0;
    let weekNumber = 1;

    while (currentWeekStart <= now) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const weekData = weeklyData.get(weekKey);
      const weekPoints = weekData?.points || 0;
      cumulativePoints += weekPoints;

      // Format: "Nov 24" for short label
      const weekLabel = currentWeekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      allWeeks.push({
        weekStart: currentWeekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel,
        points: Math.round(weekPoints * 10) / 10,
        activityCount: weekData?.activityCount || 0,
        cumulativePoints: Math.round(cumulativePoints * 10) / 10,
      });

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }

    // Calculate summary stats
    const totalPoints = cumulativePoints;
    const avgPointsPerWeek = allWeeks.length > 0
      ? Math.round((totalPoints / allWeeks.length) * 10) / 10
      : 0;
    const bestWeek = allWeeks.reduce((best, week) =>
      week.points > (best?.points || 0) ? week : best, allWeeks[0]);
    const currentWeek = allWeeks[allWeeks.length - 1];

    // Week-over-week change (current vs previous)
    const previousWeek = allWeeks.length > 1 ? allWeeks[allWeeks.length - 2] : null;
    const weekOverWeekChange = previousWeek
      ? Math.round((currentWeek.points - previousWeek.points) * 10) / 10
      : null;

    return NextResponse.json({
      success: true,
      data: {
        weeks: allWeeks,
        summary: {
          totalPoints: Math.round(totalPoints * 10) / 10,
          avgPointsPerWeek,
          bestWeek: bestWeek ? {
            label: bestWeek.weekLabel,
            points: bestWeek.points,
          } : null,
          currentWeek: {
            label: currentWeek?.weekLabel || '',
            points: currentWeek?.points || 0,
          },
          weekOverWeekChange,
          totalWeeks: allWeeks.length,
        },
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
