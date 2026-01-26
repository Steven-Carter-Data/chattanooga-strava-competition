import { NextRequest, NextResponse } from 'next/server';
import { supabase, getActiveCompetitionConfig } from '@/lib/supabase';
import { getWeekStartEST, getWeekEndEST, formatDateEST } from '@/lib/timezone';

// Map Strava sport types to triathlon disciplines
const sportMapping: Record<string, 'swim' | 'bike' | 'run' | 'other'> = {
  'Swim': 'swim',
  'Run': 'run',
  'Ride': 'bike',
  'VirtualRide': 'bike',
  'Peloton': 'bike',
  'Spinning': 'bike',
  'MountainBikeRide': 'bike',
  'GravelRide': 'bike',
  'EBikeRide': 'bike',
  'VirtualRun': 'run',
  'TrailRun': 'run',
  'Walk': 'other',
  'Hike': 'other',
  'WeightTraining': 'other',
  'Workout': 'other',
  'Yoga': 'other',
  'CrossFit': 'other',
};

function getDiscipline(sportType: string): 'swim' | 'bike' | 'run' | 'other' {
  return sportMapping[sportType] || 'other';
}

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
      .select('start_date, zone_points, hidden, sport_type, moving_time_s')
      .eq('athlete_id', athleteId)
      .eq('in_competition_window', true)
      .order('start_date', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activity history' },
        { status: 500 }
      );
    }

    // Filter out hidden activities in code (handles NULL values gracefully)
    const filteredActivities = (activities || []).filter((a: any) => a.hidden !== true);

    // Get competition config to determine date range (automatically selects based on current date)
    const { data: competitionConfig } = await getActiveCompetitionConfig(supabase);

    // Default to reasonable date range if no config
    const competitionStart = competitionConfig?.start_date
      ? new Date(competitionConfig.start_date)
      : new Date('2025-11-16'); // Pre-season start

    const now = new Date();

    // Group activities by week (Monday-Sunday in EST)
    interface DisciplineTime {
      swim: number;
      bike: number;
      run: number;
    }

    const weeklyData: Map<string, {
      weekStart: Date;
      weekEnd: Date;
      points: number;
      activityCount: number;
      trainingTime: DisciplineTime;
    }> = new Map();

    filteredActivities?.forEach((activity) => {
      if (activity.start_date && activity.zone_points) {
        const date = new Date(activity.start_date);
        // Use EST timezone for week boundaries
        const weekStart = getWeekStartEST(date);
        const weekEnd = getWeekEndEST(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        const discipline = getDiscipline(activity.sport_type || '');
        const movingTime = activity.moving_time_s || 0;

        const existing = weeklyData.get(weekKey);
        if (existing) {
          existing.points += activity.zone_points;
          existing.activityCount += 1;
          if (discipline === 'swim' || discipline === 'bike' || discipline === 'run') {
            existing.trainingTime[discipline] += movingTime;
          }
        } else {
          const trainingTime: DisciplineTime = { swim: 0, bike: 0, run: 0 };
          if (discipline === 'swim' || discipline === 'bike' || discipline === 'run') {
            trainingTime[discipline] = movingTime;
          }
          weeklyData.set(weekKey, {
            weekStart,
            weekEnd,
            points: activity.zone_points,
            activityCount: 1,
            trainingTime,
          });
        }
      }
    });

    // Generate all weeks from competition start to now (fill gaps with zero)
    // Competition starts Jan 1, 2026 (Wednesday)
    // Week 0 = Jan 1-4 (partial week, cannot be omitted)
    // Week 1 = Jan 5-11 (first full Monday-Sunday, can be omitted)
    // Week 2 = Jan 12-18, etc.
    const allWeeks: Array<{
      weekStart: string;
      weekEnd: string;
      weekLabel: string;
      weekNumber: number;
      isPartialWeek: boolean;
      canBeOmitted: boolean;
      points: number;
      activityCount: number;
      cumulativePoints: number;
      trainingTime: DisciplineTime;
    }> = [];

    // Competition start date (Jan 1, 2026)
    const compStartEST = new Date(competitionStart);

    // Check if competition starts on a Monday
    const compStartDay = compStartEST.getDay();
    const startsOnMonday = compStartDay === 1;

    let cumulativePoints = 0;
    let weekNumber = 0;

    if (!startsOnMonday) {
      // Week 0: Partial week from competition start to the following Sunday
      const week0Start = new Date(competitionStart);
      const week0End = getWeekEndEST(competitionStart);
      const week0Key = getWeekStartEST(competitionStart).toISOString().split('T')[0];

      const week0Data = weeklyData.get(week0Key);
      const week0Points = week0Data?.points || 0;
      cumulativePoints += week0Points;

      allWeeks.push({
        weekStart: week0Start.toISOString(),
        weekEnd: week0End.toISOString(),
        weekLabel: 'Week 0',
        weekNumber: 0,
        isPartialWeek: true,
        canBeOmitted: false, // Partial weeks cannot be omitted
        points: Math.round(week0Points * 10) / 10,
        activityCount: week0Data?.activityCount || 0,
        cumulativePoints: Math.round(cumulativePoints * 10) / 10,
        trainingTime: week0Data?.trainingTime || { swim: 0, bike: 0, run: 0 },
      });

      weekNumber = 1;
    }

    // Start from the first full Monday after competition start
    let currentWeekStart: Date;
    if (startsOnMonday) {
      currentWeekStart = new Date(competitionStart);
      weekNumber = 1;
    } else {
      // Get the Monday after the competition start
      currentWeekStart = getWeekStartEST(competitionStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    while (currentWeekStart <= now) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekEnd = getWeekEndEST(currentWeekStart);

      const weekData = weeklyData.get(weekKey);
      const weekPoints = weekData?.points || 0;
      cumulativePoints += weekPoints;

      allWeeks.push({
        weekStart: currentWeekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel: `Week ${weekNumber}`,
        weekNumber,
        isPartialWeek: false,
        canBeOmitted: true, // Full weeks can be omitted
        points: Math.round(weekPoints * 10) / 10,
        activityCount: weekData?.activityCount || 0,
        cumulativePoints: Math.round(cumulativePoints * 10) / 10,
        trainingTime: weekData?.trainingTime || { swim: 0, bike: 0, run: 0 },
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
