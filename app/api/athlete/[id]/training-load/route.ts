import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/training-load
 * Returns training load/stress analysis over time
 * Uses a simplified TRIMP-like calculation based on HR zones and duration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch all activities with HR zone data
    // Filter out hidden activities (duplicates/merged)
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        sport_type,
        start_date,
        moving_time_s,
        zone_points,
        average_heartrate,
        max_heartrate,
        hidden,
        heart_rate_zones (
          zone_1_time_s,
          zone_2_time_s,
          zone_3_time_s,
          zone_4_time_s,
          zone_5_time_s
        )
      `)
      .eq('athlete_id', athleteId)
      .eq('hidden', false)
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
          message: 'No activities found',
        },
      });
    }

    // Calculate training load for each activity
    // Training Load = weighted sum of time in each zone
    // Zone weights: Z1=1, Z2=1.5, Z3=2, Z4=3, Z5=4 (approximates training stress)
    const zoneWeights = [1, 1.5, 2, 3, 4];

    const activitiesWithLoad = activities.map((activity) => {
      const hrZones = activity.heart_rate_zones?.[0] || activity.heart_rate_zones;

      let trainingLoad = 0;
      if (hrZones) {
        const zoneTimes = [
          hrZones.zone_1_time_s || 0,
          hrZones.zone_2_time_s || 0,
          hrZones.zone_3_time_s || 0,
          hrZones.zone_4_time_s || 0,
          hrZones.zone_5_time_s || 0,
        ];

        trainingLoad = zoneTimes.reduce((sum, time, idx) => {
          return sum + (time / 60) * zoneWeights[idx]; // Load in "load minutes"
        }, 0);
      } else {
        // Fallback: use zone_points as a proxy
        trainingLoad = parseFloat(activity.zone_points) || 0;
      }

      return {
        id: activity.id,
        name: activity.name,
        sport_type: activity.sport_type,
        date: activity.start_date,
        moving_time_s: activity.moving_time_s,
        training_load: trainingLoad,
        zone_points: parseFloat(activity.zone_points) || 0,
      };
    });

    // Group by day for daily totals
    const dailyLoad: Record<string, { load: number; activities: number; date: string }> = {};

    for (const activity of activitiesWithLoad) {
      const dateStr = new Date(activity.date).toISOString().split('T')[0];
      if (!dailyLoad[dateStr]) {
        dailyLoad[dateStr] = { load: 0, activities: 0, date: dateStr };
      }
      dailyLoad[dateStr].load += activity.training_load;
      dailyLoad[dateStr].activities++;
    }

    // Calculate weekly totals
    const weeklyLoad: Record<string, {
      load: number;
      activities: number;
      weekStart: string;
      avgDailyLoad: number;
    }> = {};

    for (const activity of activitiesWithLoad) {
      const date = new Date(activity.date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyLoad[weekKey]) {
        weeklyLoad[weekKey] = { load: 0, activities: 0, weekStart: weekKey, avgDailyLoad: 0 };
      }
      weeklyLoad[weekKey].load += activity.training_load;
      weeklyLoad[weekKey].activities++;
    }

    // Calculate average daily load per week
    for (const week of Object.values(weeklyLoad)) {
      week.avgDailyLoad = week.load / 7;
    }

    const weeks = Object.values(weeklyLoad).sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Calculate Acute:Chronic ratio (like ATL/CTL)
    // Acute = last 7 days, Chronic = last 28 days (rolling average)
    const sortedDays = Object.values(dailyLoad).sort((a, b) => a.date.localeCompare(b.date));

    let acuteLoad = 0; // Last 7 days
    let chronicLoad = 0; // Last 28 days

    const today = new Date();
    const last7Days = sortedDays.filter(d => {
      const dayDate = new Date(d.date);
      const diffDays = (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });

    const last28Days = sortedDays.filter(d => {
      const dayDate = new Date(d.date);
      const diffDays = (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 28;
    });

    acuteLoad = last7Days.reduce((sum, d) => sum + d.load, 0) / 7;
    chronicLoad = last28Days.reduce((sum, d) => sum + d.load, 0) / 28;

    const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;

    // Determine training status
    // Note: Thresholds significantly adjusted for Ironman 70.3 training - endurance athletes
    // training for long-course triathlon can sustain much higher workload ratios
    let trainingStatus: 'optimal' | 'overreaching' | 'undertraining' | 'high_risk';
    let statusDescription: string;

    if (acuteChronicRatio < 0.8) {
      trainingStatus = 'undertraining';
      statusDescription = 'Training load is lower than usual. Consider increasing intensity.';
    } else if (acuteChronicRatio >= 0.8 && acuteChronicRatio <= 1.8) {
      trainingStatus = 'optimal';
      statusDescription = 'Training load is in the optimal range for adaptation.';
    } else if (acuteChronicRatio > 1.8 && acuteChronicRatio <= 2.2) {
      trainingStatus = 'overreaching';
      statusDescription = 'High training load. Monitor for signs of fatigue.';
    } else {
      trainingStatus = 'high_risk';
      statusDescription = 'Very high acute load. Consider reducing training intensity.';
    }

    // Calculate load trend
    const recentWeeks = weeks.slice(-4);
    const previousWeeks = weeks.slice(-8, -4);

    let loadTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentWeeks.length >= 2 && previousWeeks.length >= 2) {
      const recentAvg = recentWeeks.reduce((sum, w) => sum + w.load, 0) / recentWeeks.length;
      const previousAvg = previousWeeks.reduce((sum, w) => sum + w.load, 0) / previousWeeks.length;
      const changePct = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (changePct > 10) loadTrend = 'increasing';
      else if (changePct < -10) loadTrend = 'decreasing';
    }

    // Get highest load week
    const highestLoadWeek = weeks.length > 0
      ? weeks.reduce((max, w) => w.load > max.load ? w : max)
      : null;

    // Prepare chart data (last 12 weeks)
    const chartData = weeks.slice(-12).map(week => ({
      weekStart: week.weekStart,
      load: week.load,
      activities: week.activities,
      avgDailyLoad: week.avgDailyLoad,
    }));

    // Calculate recovery recommendation (adjusted for Ironman 70.3 training)
    let recoveryRecommendation: string;
    if (acuteChronicRatio > 2.2) {
      recoveryRecommendation = 'Take 1-2 rest days or do only light recovery activities.';
    } else if (acuteChronicRatio > 1.8) {
      recoveryRecommendation = 'Consider an easy workout or active recovery day.';
    } else if (acuteChronicRatio < 0.8) {
      recoveryRecommendation = 'You have capacity for harder training. Consider a challenging workout.';
    } else {
      recoveryRecommendation = 'Training load is balanced. Continue with planned workouts.';
    }

    return NextResponse.json({
      success: true,
      data: {
        hasData: true,
        summary: {
          totalActivities: activities.length,
          totalTrainingLoad: activitiesWithLoad.reduce((sum, a) => sum + a.training_load, 0),
          avgWeeklyLoad: weeks.length > 0
            ? weeks.reduce((sum, w) => sum + w.load, 0) / weeks.length
            : 0,
        },
        currentStatus: {
          acuteLoad,
          chronicLoad,
          acuteChronicRatio,
          trainingStatus,
          statusDescription,
          loadTrend,
          recoveryRecommendation,
        },
        highestLoadWeek,
        chartData,
        recentActivities: activitiesWithLoad.slice(-10).reverse(),
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
