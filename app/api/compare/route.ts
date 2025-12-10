import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/compare?athletes=id1,id2
 * Returns comparison data for two athletes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const athleteIds = searchParams.get('athletes')?.split(',') || [];

    if (athleteIds.length !== 2) {
      return NextResponse.json(
        { error: 'Please provide exactly 2 athlete IDs' },
        { status: 400 }
      );
    }

    const [athlete1Id, athlete2Id] = athleteIds;

    // Fetch both athletes' data in parallel
    const [athlete1Result, athlete2Result] = await Promise.all([
      fetchAthleteComparisonData(athlete1Id),
      fetchAthleteComparisonData(athlete2Id),
    ]);

    if (!athlete1Result.success || !athlete2Result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch athlete data' },
        { status: 500 }
      );
    }

    // Calculate comparison metrics
    const comparison = calculateComparison(athlete1Result.data, athlete2Result.data);

    return NextResponse.json({
      success: true,
      data: {
        athlete1: athlete1Result.data,
        athlete2: athlete2Result.data,
        comparison,
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

async function fetchAthleteComparisonData(athleteId: string) {
  try {
    // Fetch athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, firstname, lastname, profile_image_url')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return { success: false, error: 'Athlete not found' };
    }

    // Fetch activities with HR zones
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        sport_type,
        start_date,
        distance_m,
        moving_time_s,
        zone_points,
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
      return { success: false, error: 'Failed to fetch activities' };
    }

    const activityList = activities || [];

    // Calculate stats
    const totalPoints = activityList.reduce((sum, a) => sum + (parseFloat(a.zone_points) || 0), 0);
    const totalDistance = activityList.reduce((sum, a) => sum + (a.distance_m || 0), 0);
    const totalTime = activityList.reduce((sum, a) => sum + (a.moving_time_s || 0), 0);

    // Zone distribution
    let zoneDistribution = { zone_1: 0, zone_2: 0, zone_3: 0, zone_4: 0, zone_5: 0 };
    for (const activity of activityList) {
      const hrZones = activity.heart_rate_zones?.[0] || activity.heart_rate_zones;
      if (hrZones) {
        zoneDistribution.zone_1 += hrZones.zone_1_time_s || 0;
        zoneDistribution.zone_2 += hrZones.zone_2_time_s || 0;
        zoneDistribution.zone_3 += hrZones.zone_3_time_s || 0;
        zoneDistribution.zone_4 += hrZones.zone_4_time_s || 0;
        zoneDistribution.zone_5 += hrZones.zone_5_time_s || 0;
      }
    }

    // Sport breakdown
    const sportBreakdown: Record<string, { count: number; points: number; distance: number; time: number }> = {};
    for (const activity of activityList) {
      const sport = activity.sport_type;
      if (!sportBreakdown[sport]) {
        sportBreakdown[sport] = { count: 0, points: 0, distance: 0, time: 0 };
      }
      sportBreakdown[sport].count++;
      sportBreakdown[sport].points += parseFloat(activity.zone_points) || 0;
      sportBreakdown[sport].distance += activity.distance_m || 0;
      sportBreakdown[sport].time += activity.moving_time_s || 0;
    }

    // Weekly averages
    const weeks = new Set<string>();
    for (const activity of activityList) {
      const date = new Date(activity.start_date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weeks.add(weekStart.toISOString().split('T')[0]);
    }
    const numWeeks = weeks.size || 1;

    // Consistency (active days)
    const activeDays = new Set(activityList.map(a =>
      new Date(a.start_date).toISOString().split('T')[0]
    )).size;

    // Calculate high zone ratio (Z4 + Z5 / total)
    const totalZoneTime = Object.values(zoneDistribution).reduce((sum, t) => sum + t, 0);
    const highZoneTime = zoneDistribution.zone_4 + zoneDistribution.zone_5;
    const highZoneRatio = totalZoneTime > 0 ? (highZoneTime / totalZoneTime) * 100 : 0;

    return {
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          profile_image_url: athlete.profile_image_url,
        },
        stats: {
          totalPoints,
          activityCount: activityList.length,
          totalDistance,
          totalTime,
          avgPointsPerWeek: totalPoints / numWeeks,
          avgPointsPerActivity: activityList.length > 0 ? totalPoints / activityList.length : 0,
          activeDays,
          consistency: numWeeks > 0 ? (activeDays / (numWeeks * 7)) * 100 : 0,
          highZoneRatio,
        },
        zoneDistribution,
        sportBreakdown,
        sportCount: Object.keys(sportBreakdown).length,
      },
    };
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return { success: false, error: 'Internal error' };
  }
}

function calculateComparison(data1: any, data2: any) {
  const stats1 = data1.stats;
  const stats2 = data2.stats;

  // Calculate who's ahead in each category
  const metrics = [
    { key: 'totalPoints', label: 'Total Points', format: 'number' },
    { key: 'activityCount', label: 'Activities', format: 'number' },
    { key: 'avgPointsPerWeek', label: 'Pts/Week', format: 'decimal' },
    { key: 'avgPointsPerActivity', label: 'Pts/Activity', format: 'decimal' },
    { key: 'consistency', label: 'Consistency', format: 'percent' },
    { key: 'highZoneRatio', label: 'High Zone %', format: 'percent' },
    { key: 'totalDistance', label: 'Distance', format: 'distance' },
    { key: 'totalTime', label: 'Time', format: 'time' },
  ];

  const results: any[] = [];

  for (const metric of metrics) {
    const val1 = stats1[metric.key] || 0;
    const val2 = stats2[metric.key] || 0;

    let winner: number | null = null;
    let diff = 0;

    if (val1 > val2) {
      winner = 1;
      diff = val2 > 0 ? ((val1 - val2) / val2) * 100 : 100;
    } else if (val2 > val1) {
      winner = 2;
      diff = val1 > 0 ? ((val2 - val1) / val1) * 100 : 100;
    }

    results.push({
      ...metric,
      athlete1Value: val1,
      athlete2Value: val2,
      winner,
      diffPercent: diff,
    });
  }

  // Count wins
  const athlete1Wins = results.filter(r => r.winner === 1).length;
  const athlete2Wins = results.filter(r => r.winner === 2).length;

  return {
    metrics: results,
    athlete1Wins,
    athlete2Wins,
    overallLeader: athlete1Wins > athlete2Wins ? 1 : athlete2Wins > athlete1Wins ? 2 : null,
  };
}
