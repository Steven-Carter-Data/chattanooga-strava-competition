import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/stats-radar
 * Returns normalized stats for radar chart visualization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch activities with HR zones for this athlete
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        start_date,
        zone_points,
        sport_type,
        moving_time_s,
        distance_m,
        average_heartrate,
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
        data: { hasData: false },
      });
    }

    // Calculate raw stats
    const totalPoints = activities.reduce((sum, a) => sum + (parseFloat(a.zone_points) || 0), 0);
    const totalTime = activities.reduce((sum, a) => sum + (a.moving_time_s || 0), 0);
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance_m || 0), 0);

    // Calculate zone times
    let totalZone1 = 0, totalZone2 = 0, totalZone3 = 0, totalZone4 = 0, totalZone5 = 0;
    for (const activity of activities) {
      const hrZones = activity.heart_rate_zones?.[0] || activity.heart_rate_zones;
      if (hrZones) {
        totalZone1 += hrZones.zone_1_time_s || 0;
        totalZone2 += hrZones.zone_2_time_s || 0;
        totalZone3 += hrZones.zone_3_time_s || 0;
        totalZone4 += hrZones.zone_4_time_s || 0;
        totalZone5 += hrZones.zone_5_time_s || 0;
      }
    }
    const totalZoneTime = totalZone1 + totalZone2 + totalZone3 + totalZone4 + totalZone5;

    // Calculate consistency (activity frequency)
    const activityDates = new Set(
      activities.map(a => new Date(a.start_date).toISOString().split('T')[0])
    );
    const firstActivity = new Date(activities[activities.length - 1].start_date);
    const lastActivity = new Date(activities[0].start_date);
    const daySpan = Math.max(1, Math.ceil((lastActivity.getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24)));
    const consistency = (activityDates.size / daySpan) * 100; // % of days with activity

    // Calculate intensity (avg points per minute)
    const intensity = totalTime > 0 ? (totalPoints / (totalTime / 60)) : 0;

    // Calculate high zone ratio (Z4+Z5 time)
    const highZoneRatio = totalZoneTime > 0 ? ((totalZone4 + totalZone5) / totalZoneTime) * 100 : 0;

    // Calculate endurance (Z2 time ratio)
    const enduranceRatio = totalZoneTime > 0 ? (totalZone2 / totalZoneTime) * 100 : 0;

    // Calculate variety (number of different sport types)
    const sportTypes = new Set(activities.map(a => a.sport_type));
    const variety = sportTypes.size;

    // Calculate volume (total training hours per week average)
    const weeksActive = Math.max(1, daySpan / 7);
    const volumePerWeek = (totalTime / 3600) / weeksActive;

    // Raw stats for display
    const rawStats = {
      totalPoints,
      totalTime,
      totalDistance,
      activityCount: activities.length,
      activeDays: activityDates.size,
      consistency,
      intensity,
      highZoneRatio,
      enduranceRatio,
      variety,
      volumePerWeek,
    };

    // Normalize stats for radar chart (0-100 scale)
    // These are approximate normalization values based on reasonable athletic performance
    const normalized = {
      volume: Math.min(100, (volumePerWeek / 10) * 100), // 10 hrs/week = 100
      intensity: Math.min(100, (intensity / 3) * 100), // 3 pts/min = 100
      consistency: Math.min(100, consistency * 1.5), // 66% active days = 100
      endurance: Math.min(100, enduranceRatio * 1.5), // High Z2 time
      power: Math.min(100, highZoneRatio * 3), // High zone work
      variety: Math.min(100, (variety / 5) * 100), // 5 sports = 100
    };

    return NextResponse.json({
      success: true,
      data: {
        hasData: true,
        rawStats,
        normalized,
        dimensions: [
          { key: 'volume', label: 'Volume', description: 'Weekly training hours' },
          { key: 'intensity', label: 'Intensity', description: 'Points per minute' },
          { key: 'consistency', label: 'Consistency', description: 'Training frequency' },
          { key: 'endurance', label: 'Endurance', description: 'Zone 2 focus' },
          { key: 'power', label: 'Power', description: 'High zone work' },
          { key: 'variety', label: 'Variety', description: 'Sport diversity' },
        ],
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
