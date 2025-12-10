import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/pace-analysis
 * Returns pace/speed trends over time for each sport type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch all activities with distance and time
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        sport_type,
        start_date,
        distance_m,
        moving_time_s,
        average_speed_mps,
        zone_points
      `)
      .eq('athlete_id', athleteId)
      .gt('distance_m', 0)
      .gt('moving_time_s', 0)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasData: false,
          message: 'No activities with pace data found',
        },
      });
    }

    // Group activities by sport type
    const sportData: Record<string, any[]> = {};

    for (const activity of activities) {
      const sport = activity.sport_type;
      if (!sportData[sport]) {
        sportData[sport] = [];
      }

      // Calculate pace based on sport type
      const distanceM = activity.distance_m || 0;
      const timeS = activity.moving_time_s || 0;

      if (distanceM > 0 && timeS > 0) {
        // For running/walking: min/mile
        // For cycling: mph
        // For swimming: min/100m or min/100yd

        let pace: number;
        let paceUnit: string;

        if (sport.toLowerCase().includes('swim')) {
          // Swimming: minutes per 100 meters
          pace = (timeS / 60) / (distanceM / 100);
          paceUnit = 'min/100m';
        } else if (sport.toLowerCase().includes('ride') || sport.toLowerCase().includes('cycle') || sport.toLowerCase().includes('bike')) {
          // Cycling: miles per hour
          const miles = distanceM / 1609.34;
          const hours = timeS / 3600;
          pace = miles / hours;
          paceUnit = 'mph';
        } else {
          // Running/walking: minutes per mile
          const miles = distanceM / 1609.34;
          pace = (timeS / 60) / miles;
          paceUnit = 'min/mi';
        }

        sportData[sport].push({
          id: activity.id,
          name: activity.name,
          date: activity.start_date,
          distance_m: distanceM,
          time_s: timeS,
          pace,
          paceUnit,
          zone_points: parseFloat(activity.zone_points) || 0,
        });
      }
    }

    // Calculate trends for each sport
    const sportAnalysis: Record<string, any> = {};

    for (const [sport, data] of Object.entries(sportData)) {
      if (data.length < 2) continue;

      // Get recent vs earlier pace comparison
      const sortedData = [...data].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Split into halves
      const midpoint = Math.floor(sortedData.length / 2);
      const earlierHalf = sortedData.slice(0, midpoint);
      const recentHalf = sortedData.slice(midpoint);

      // Calculate average paces
      const earlierAvgPace = earlierHalf.reduce((sum, a) => sum + a.pace, 0) / earlierHalf.length;
      const recentAvgPace = recentHalf.reduce((sum, a) => sum + a.pace, 0) / recentHalf.length;

      // For running/swimming, lower is better; for cycling, higher is better
      const isSpeedSport = sport.toLowerCase().includes('ride') ||
                          sport.toLowerCase().includes('cycle') ||
                          sport.toLowerCase().includes('bike');

      let improvement: number;
      if (isSpeedSport) {
        // For speed sports (mph), higher is better
        improvement = ((recentAvgPace - earlierAvgPace) / earlierAvgPace) * 100;
      } else {
        // For pace sports (min/mi), lower is better
        improvement = ((earlierAvgPace - recentAvgPace) / earlierAvgPace) * 100;
      }

      // Best and worst paces
      let bestPace: any;
      let worstPace: any;

      if (isSpeedSport) {
        bestPace = sortedData.reduce((best, curr) => curr.pace > best.pace ? curr : best);
        worstPace = sortedData.reduce((worst, curr) => curr.pace < worst.pace ? curr : worst);
      } else {
        bestPace = sortedData.reduce((best, curr) => curr.pace < best.pace ? curr : best);
        worstPace = sortedData.reduce((worst, curr) => curr.pace > worst.pace ? curr : worst);
      }

      // Calculate rolling average (last 5 activities vs previous 5)
      const last5 = sortedData.slice(-5);
      const prev5 = sortedData.slice(-10, -5);

      let recentTrend = 'stable';
      if (prev5.length >= 3 && last5.length >= 3) {
        const last5Avg = last5.reduce((sum, a) => sum + a.pace, 0) / last5.length;
        const prev5Avg = prev5.reduce((sum, a) => sum + a.pace, 0) / prev5.length;

        const trendPct = isSpeedSport
          ? ((last5Avg - prev5Avg) / prev5Avg) * 100
          : ((prev5Avg - last5Avg) / prev5Avg) * 100;

        if (trendPct > 3) recentTrend = 'improving';
        else if (trendPct < -3) recentTrend = 'declining';
      }

      // Prepare chart data (group by week)
      const weeklyData: Record<string, { paces: number[], count: number }> = {};
      for (const activity of sortedData) {
        const date = new Date(activity.date);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { paces: [], count: 0 };
        }
        weeklyData[weekKey].paces.push(activity.pace);
        weeklyData[weekKey].count++;
      }

      const chartData = Object.entries(weeklyData)
        .map(([week, data]) => ({
          week,
          avgPace: data.paces.reduce((sum, p) => sum + p, 0) / data.paces.length,
          count: data.count,
        }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-12); // Last 12 weeks

      sportAnalysis[sport] = {
        activityCount: data.length,
        paceUnit: data[0].paceUnit,
        isSpeedSport,
        currentAvgPace: recentAvgPace,
        overallAvgPace: data.reduce((sum, a) => sum + a.pace, 0) / data.length,
        improvement: improvement,
        recentTrend,
        bestPace: {
          value: bestPace.pace,
          date: bestPace.date,
          name: bestPace.name,
        },
        worstPace: {
          value: worstPace.pace,
          date: worstPace.date,
          name: worstPace.name,
        },
        chartData,
        recentActivities: sortedData.slice(-5).reverse(),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        hasData: Object.keys(sportAnalysis).length > 0,
        sports: sportAnalysis,
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
