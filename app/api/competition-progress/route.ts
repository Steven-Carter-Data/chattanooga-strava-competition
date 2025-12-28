import { NextResponse } from 'next/server';
import { supabase, getActiveCompetitionConfig } from '@/lib/supabase';

/**
 * GET /api/competition-progress
 * Returns competition progress data including:
 * - Days remaining countdown
 * - Progress percentage
 * - Projected final standings based on current pace
 */
export async function GET() {
  try {
    // Get competition config (automatically selects based on current date)
    const { data: config, error: configError } = await getActiveCompetitionConfig(supabase);

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Competition config not found' },
        { status: 500 }
      );
    }

    const now = new Date();
    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);

    // Calculate competition timeline
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const remaining = endDate.getTime() - now.getTime();

    // Competition status
    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;

    // Days calculations
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
    const daysElapsed = hasStarted ? Math.floor(elapsed / (1000 * 60 * 60 * 24)) : 0;
    const daysRemaining = hasEnded ? 0 : hasStarted
      ? Math.ceil(remaining / (1000 * 60 * 60 * 24))
      : Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Days until start (for pre-competition)
    const daysUntilStart = !hasStarted
      ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Progress percentage
    const progressPercent = hasEnded
      ? 100
      : hasStarted
        ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
        : 0;

    // Get current leaderboard with points per day for projections
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select(`
        id,
        firstname,
        lastname,
        activities (
          zone_points,
          start_date
        )
      `);

    if (athletesError) {
      console.error('Error fetching athletes:', athletesError);
      return NextResponse.json(
        { error: 'Failed to fetch athlete data' },
        { status: 500 }
      );
    }

    // Calculate projections for each athlete
    const projections = (athletes || []).map((athlete: any) => {
      const activities = athlete.activities || [];
      const totalPoints = activities.reduce((sum: number, act: any) =>
        sum + (parseFloat(act.zone_points) || 0), 0);

      // Calculate points per day based on actual activity days
      let pointsPerDay = 0;
      let projectedFinalPoints = totalPoints;

      if (hasStarted && daysElapsed > 0 && totalPoints > 0) {
        // Calculate based on days elapsed in competition
        pointsPerDay = totalPoints / daysElapsed;

        // Project final points
        if (!hasEnded) {
          projectedFinalPoints = totalPoints + (pointsPerDay * daysRemaining);
        }
      }

      return {
        athlete_id: athlete.id,
        firstname: athlete.firstname || '',
        lastname: athlete.lastname || '',
        current_points: totalPoints,
        points_per_day: pointsPerDay,
        projected_final_points: projectedFinalPoints,
        activity_count: activities.length,
      };
    });

    // Sort by projected final points
    projections.sort((a, b) => b.projected_final_points - a.projected_final_points);

    // Also sort by current standings for comparison
    const currentStandings = [...projections].sort((a, b) => b.current_points - a.current_points);

    return NextResponse.json({
      success: true,
      data: {
        competition: {
          name: config.name,
          start_date: config.start_date,
          end_date: config.end_date,
          status: hasEnded ? 'completed' : hasStarted ? 'active' : 'upcoming',
        },
        timeline: {
          total_days: totalDays,
          days_elapsed: daysElapsed,
          days_remaining: daysRemaining,
          days_until_start: daysUntilStart,
          progress_percent: Math.round(progressPercent * 10) / 10,
          has_started: hasStarted,
          has_ended: hasEnded,
        },
        projections: projections,
        current_standings: currentStandings,
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
