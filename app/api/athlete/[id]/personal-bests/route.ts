import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/personal-bests
 * Returns personal bests and micro-achievements for an athlete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch all activities with HR zones for this athlete
    // Filter out hidden activities (duplicates/merged)
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        sport_type,
        start_date,
        distance_m,
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
      .order('start_date', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Filter out hidden activities in code (handles NULL values gracefully)
    const filteredActivities = (activities || []).filter((a: any) => a.hidden !== true);

    if (!filteredActivities || filteredActivities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasData: false,
          message: 'No activities found',
        },
      });
    }

    // Calculate personal bests
    const personalBests = calculatePersonalBests(filteredActivities);

    // Calculate weekly stats for "best week ever"
    const weeklyStats = calculateWeeklyStats(filteredActivities);

    // Calculate streaks
    const streaks = calculateStreaks(filteredActivities);

    // Calculate milestones
    const milestones = calculateMilestones(filteredActivities);

    return NextResponse.json({
      success: true,
      data: {
        hasData: true,
        personalBests,
        weeklyStats,
        streaks,
        milestones,
        totalActivities: filteredActivities.length,
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

function calculatePersonalBests(activities: any[]) {
  // Highest points in a single activity
  const highestPointsActivity = activities.reduce((best, act) => {
    const points = parseFloat(act.zone_points) || 0;
    if (!best || points > (parseFloat(best.zone_points) || 0)) {
      return act;
    }
    return best;
  }, null);

  // Longest activity by moving time
  const longestActivity = activities.reduce((best, act) => {
    const time = act.moving_time_s || 0;
    if (!best || time > (best.moving_time_s || 0)) {
      return act;
    }
    return best;
  }, null);

  // Longest activity by distance
  const longestDistanceActivity = activities.reduce((best, act) => {
    const distance = act.distance_m || 0;
    if (!best || distance > (best.distance_m || 0)) {
      return act;
    }
    return best;
  }, null);

  // Most time in each zone (single activity)
  const zoneRecords: Record<string, any> = {};
  for (let zone = 1; zone <= 5; zone++) {
    const zoneKey = `zone_${zone}_time_s`;
    const bestZoneActivity = activities.reduce((best, act) => {
      const hrZones = act.heart_rate_zones?.[0] || act.heart_rate_zones;
      const zoneTime = hrZones?.[zoneKey] || 0;
      const bestHrZones = best?.heart_rate_zones?.[0] || best?.heart_rate_zones;
      const bestZoneTime = bestHrZones?.[zoneKey] || 0;
      if (!best || zoneTime > bestZoneTime) {
        return act;
      }
      return best;
    }, null);

    if (bestZoneActivity) {
      const hrZones = bestZoneActivity.heart_rate_zones?.[0] || bestZoneActivity.heart_rate_zones;
      zoneRecords[`zone${zone}`] = {
        activity: {
          id: bestZoneActivity.id,
          name: bestZoneActivity.name,
          sport_type: bestZoneActivity.sport_type,
          start_date: bestZoneActivity.start_date,
        },
        time_seconds: hrZones?.[zoneKey] || 0,
      };
    }
  }

  // Highest average heart rate
  const highestAvgHR = activities.reduce((best, act) => {
    const avgHR = act.average_heartrate || 0;
    if (!best || avgHR > (best.average_heartrate || 0)) {
      return act;
    }
    return best;
  }, null);

  // Sport-specific bests
  const sportBests: Record<string, any> = {};
  const sportTypes = [...new Set(activities.map(a => a.sport_type))];

  for (const sport of sportTypes) {
    const sportActivities = activities.filter(a => a.sport_type === sport);
    if (sportActivities.length > 0) {
      const bestPoints = sportActivities.reduce((best, act) => {
        const points = parseFloat(act.zone_points) || 0;
        if (!best || points > (parseFloat(best.zone_points) || 0)) {
          return act;
        }
        return best;
      }, null);

      const longestTime = sportActivities.reduce((best, act) => {
        const time = act.moving_time_s || 0;
        if (!best || time > (best.moving_time_s || 0)) {
          return act;
        }
        return best;
      }, null);

      sportBests[sport] = {
        count: sportActivities.length,
        bestPoints: bestPoints ? {
          activity: {
            id: bestPoints.id,
            name: bestPoints.name,
            start_date: bestPoints.start_date,
          },
          points: parseFloat(bestPoints.zone_points) || 0,
        } : null,
        longestTime: longestTime ? {
          activity: {
            id: longestTime.id,
            name: longestTime.name,
            start_date: longestTime.start_date,
          },
          time_seconds: longestTime.moving_time_s || 0,
        } : null,
      };
    }
  }

  return {
    highestPoints: highestPointsActivity ? {
      activity: {
        id: highestPointsActivity.id,
        name: highestPointsActivity.name,
        sport_type: highestPointsActivity.sport_type,
        start_date: highestPointsActivity.start_date,
      },
      points: parseFloat(highestPointsActivity.zone_points) || 0,
    } : null,
    longestDuration: longestActivity ? {
      activity: {
        id: longestActivity.id,
        name: longestActivity.name,
        sport_type: longestActivity.sport_type,
        start_date: longestActivity.start_date,
      },
      time_seconds: longestActivity.moving_time_s || 0,
    } : null,
    longestDistance: longestDistanceActivity ? {
      activity: {
        id: longestDistanceActivity.id,
        name: longestDistanceActivity.name,
        sport_type: longestDistanceActivity.sport_type,
        start_date: longestDistanceActivity.start_date,
      },
      distance_m: longestDistanceActivity.distance_m || 0,
    } : null,
    zoneRecords,
    highestAvgHR: highestAvgHR ? {
      activity: {
        id: highestAvgHR.id,
        name: highestAvgHR.name,
        sport_type: highestAvgHR.sport_type,
        start_date: highestAvgHR.start_date,
      },
      avg_hr: highestAvgHR.average_heartrate || 0,
    } : null,
    sportBests,
  };
}

function calculateWeeklyStats(activities: any[]) {
  // Group activities by week
  const weeklyData: Record<string, { points: number; activities: number; startDate: string }> = {};

  for (const activity of activities) {
    const date = new Date(activity.start_date);
    // Get Monday of the week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { points: 0, activities: 0, startDate: weekKey };
    }
    weeklyData[weekKey].points += parseFloat(activity.zone_points) || 0;
    weeklyData[weekKey].activities += 1;
  }

  const weeks = Object.values(weeklyData);

  // Best week by points
  const bestWeekPoints = weeks.reduce((best, week) => {
    if (!best || week.points > best.points) {
      return week;
    }
    return best;
  }, null as any);

  // Most active week
  const mostActiveWeek = weeks.reduce((best, week) => {
    if (!best || week.activities > best.activities) {
      return week;
    }
    return best;
  }, null as any);

  // Average weekly stats
  const avgWeeklyPoints = weeks.length > 0
    ? weeks.reduce((sum, w) => sum + w.points, 0) / weeks.length
    : 0;
  const avgWeeklyActivities = weeks.length > 0
    ? weeks.reduce((sum, w) => sum + w.activities, 0) / weeks.length
    : 0;

  return {
    bestWeekPoints: bestWeekPoints ? {
      weekStart: bestWeekPoints.startDate,
      points: bestWeekPoints.points,
      activities: bestWeekPoints.activities,
    } : null,
    mostActiveWeek: mostActiveWeek ? {
      weekStart: mostActiveWeek.startDate,
      activities: mostActiveWeek.activities,
      points: mostActiveWeek.points,
    } : null,
    averages: {
      pointsPerWeek: avgWeeklyPoints,
      activitiesPerWeek: avgWeeklyActivities,
    },
    totalWeeks: weeks.length,
  };
}

function calculateStreaks(activities: any[]) {
  // Sort by date ascending
  const sorted = [...activities].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Calculate consecutive days with activities
  let currentStreak = 0;
  let longestStreak = 0;
  let lastDate: Date | null = null;

  const activityDates = new Set<string>();
  for (const act of sorted) {
    const dateStr = new Date(act.start_date).toISOString().split('T')[0];
    activityDates.add(dateStr);
  }

  const sortedDates = [...activityDates].sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);

    if (lastDate) {
      const dayDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    lastDate = currentDate;
  }

  // Calculate current streak (from today backwards)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let activeCurrentStreak = 0;
  let checkDate = today;

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activityDates.has(dateStr)) {
      activeCurrentStreak++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return {
    longestStreak,
    currentStreak: activeCurrentStreak,
    totalActiveDays: activityDates.size,
  };
}

function calculateMilestones(activities: any[]) {
  const totalPoints = activities.reduce((sum, act) => sum + (parseFloat(act.zone_points) || 0), 0);
  const totalDistance = activities.reduce((sum, act) => sum + (act.distance_m || 0), 0);
  const totalTime = activities.reduce((sum, act) => sum + (act.moving_time_s || 0), 0);

  // Define milestone thresholds
  const pointMilestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  const distanceMilestones = [10000, 50000, 100000, 250000, 500000, 1000000]; // meters
  const timeMilestones = [3600, 18000, 36000, 72000, 180000, 360000]; // seconds (1h, 5h, 10h, 20h, 50h, 100h)
  const activityMilestones = [5, 10, 25, 50, 100, 250, 500];

  const achieved = {
    points: pointMilestones.filter(m => totalPoints >= m),
    distance: distanceMilestones.filter(m => totalDistance >= m),
    time: timeMilestones.filter(m => totalTime >= m),
    activities: activityMilestones.filter(m => activities.length >= m),
  };

  const nextGoals = {
    points: pointMilestones.find(m => totalPoints < m) || null,
    distance: distanceMilestones.find(m => totalDistance < m) || null,
    time: timeMilestones.find(m => totalTime < m) || null,
    activities: activityMilestones.find(m => activities.length < m) || null,
  };

  const progress = {
    points: nextGoals.points ? (totalPoints / nextGoals.points) * 100 : 100,
    distance: nextGoals.distance ? (totalDistance / nextGoals.distance) * 100 : 100,
    time: nextGoals.time ? (totalTime / nextGoals.time) * 100 : 100,
    activities: nextGoals.activities ? (activities.length / nextGoals.activities) * 100 : 100,
  };

  return {
    totals: {
      points: totalPoints,
      distance_m: totalDistance,
      time_s: totalTime,
      activities: activities.length,
    },
    achieved,
    nextGoals,
    progress,
  };
}
