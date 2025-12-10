import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/activity-calendar
 * Returns activity data formatted for a heatmap calendar
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch all activities for this athlete
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        start_date,
        zone_points,
        sport_type,
        moving_time_s,
        distance_m
      `)
      .eq('athlete_id', athleteId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Group activities by date
    const dailyData: Record<string, {
      date: string;
      points: number;
      activities: number;
      sports: string[];
      totalTime: number;
      totalDistance: number;
    }> = {};

    for (const activity of activities || []) {
      const dateStr = new Date(activity.start_date).toISOString().split('T')[0];

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          date: dateStr,
          points: 0,
          activities: 0,
          sports: [],
          totalTime: 0,
          totalDistance: 0,
        };
      }

      dailyData[dateStr].points += parseFloat(activity.zone_points) || 0;
      dailyData[dateStr].activities += 1;
      dailyData[dateStr].totalTime += activity.moving_time_s || 0;
      dailyData[dateStr].totalDistance += activity.distance_m || 0;

      if (!dailyData[dateStr].sports.includes(activity.sport_type)) {
        dailyData[dateStr].sports.push(activity.sport_type);
      }
    }

    // Calculate intensity levels (0-4) based on points
    const allPoints = Object.values(dailyData).map(d => d.points);
    const maxPoints = Math.max(...allPoints, 1);

    const calendarData = Object.values(dailyData).map(day => ({
      ...day,
      intensity: Math.min(4, Math.ceil((day.points / maxPoints) * 4)),
    }));

    // Get date range for calendar
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return NextResponse.json({
      success: true,
      data: {
        calendar: calendarData,
        stats: {
          totalDays: Object.keys(dailyData).length,
          totalPoints: allPoints.reduce((a, b) => a + b, 0),
          maxDailyPoints: maxPoints,
          avgDailyPoints: allPoints.length > 0
            ? allPoints.reduce((a, b) => a + b, 0) / allPoints.length
            : 0,
        },
        range: {
          start: startOfYear.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
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
