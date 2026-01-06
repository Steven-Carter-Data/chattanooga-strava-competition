import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/athlete/[id]/training-insights
 * Returns training insights including sport balance and race readiness prediction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    // Fetch all activities
    // Filter out hidden activities (duplicates/merged)
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        sport_type,
        start_date,
        distance_m,
        moving_time_s,
        zone_points,
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

    // ============================================
    // SPORT BALANCE INDICATOR
    // ============================================
    // Map Strava sport types to triathlon disciplines
    // Separating outdoor bike from indoor/trainer rides
    const sportMapping: Record<string, 'swim' | 'bike' | 'bikeIndoor' | 'run' | 'other'> = {
      'Swim': 'swim',
      'Run': 'run',
      'Ride': 'bike',
      'VirtualRide': 'bikeIndoor',  // Zwift, TrainerRoad, etc.
      'Peloton': 'bikeIndoor',      // Peloton rides
      'Spinning': 'bikeIndoor',     // Indoor cycling classes
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

    const sportBalance = {
      swim: { time: 0, distance: 0, activities: 0, points: 0 },
      bike: { time: 0, distance: 0, activities: 0, points: 0 },
      bikeIndoor: { time: 0, distance: 0, activities: 0, points: 0 },
      run: { time: 0, distance: 0, activities: 0, points: 0 },
      other: { time: 0, distance: 0, activities: 0, points: 0 },
    };

    for (const activity of activities) {
      const discipline = sportMapping[activity.sport_type] || 'other';
      sportBalance[discipline].time += activity.moving_time_s || 0;
      sportBalance[discipline].distance += activity.distance_m || 0;
      sportBalance[discipline].activities++;
      sportBalance[discipline].points += parseFloat(activity.zone_points) || 0;
    }

    // Total bike time (outdoor + indoor) for percentage calculations
    const totalBikeTime = sportBalance.bike.time + sportBalance.bikeIndoor.time;

    // Calculate percentages (by time) - combine bike types for main percentage
    const totalTriathlonTime = sportBalance.swim.time + totalBikeTime + sportBalance.run.time;
    const sportPercentages = {
      swim: totalTriathlonTime > 0 ? (sportBalance.swim.time / totalTriathlonTime) * 100 : 0,
      bike: totalTriathlonTime > 0 ? (sportBalance.bike.time / totalTriathlonTime) * 100 : 0,
      bikeIndoor: totalTriathlonTime > 0 ? (sportBalance.bikeIndoor.time / totalTriathlonTime) * 100 : 0,
      bikeCombined: totalTriathlonTime > 0 ? (totalBikeTime / totalTriathlonTime) * 100 : 0,
      run: totalTriathlonTime > 0 ? (sportBalance.run.time / totalTriathlonTime) * 100 : 0,
    };

    // Ideal 70.3 distribution (approximate based on race time ratios)
    // Swim ~18%, Bike ~55%, Run ~27% (based on typical 70.3 race split)
    const idealDistribution = { swim: 18, bike: 55, run: 27 };

    // Calculate how balanced the training is (deviation from ideal)
    // Use combined bike percentage for balance calculation
    const balanceScore = 100 - (
      Math.abs(sportPercentages.swim - idealDistribution.swim) +
      Math.abs(sportPercentages.bikeCombined - idealDistribution.bike) +
      Math.abs(sportPercentages.run - idealDistribution.run)
    ) / 3;

    // ============================================
    // RACE READINESS PREDICTION
    // ============================================
    // Factors to consider:
    // 1. Total training volume (chronic load)
    // 2. Sport balance
    // 3. Training consistency
    // 4. Recent training trend (not overtrained)
    // 5. High-intensity work

    const today = new Date();
    const raceDate = new Date('2026-05-17'); // 70.3 Chattanooga
    const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksToRace = Math.ceil(daysToRace / 7);

    // Calculate training metrics for last 28 days
    const last28Days = activities.filter(a => {
      const actDate = new Date(a.start_date);
      const diffDays = (today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 28;
    });

    const last7Days = activities.filter(a => {
      const actDate = new Date(a.start_date);
      const diffDays = (today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });

    // Zone weights for training load
    const zoneWeights = [1, 1.5, 2, 3, 4];

    // Calculate daily loads
    const dailyLoads: Record<string, number> = {};
    for (const activity of activities) {
      const dateStr = new Date(activity.start_date).toISOString().split('T')[0];
      const hrZones = activity.heart_rate_zones?.[0] || activity.heart_rate_zones;

      let load = 0;
      if (hrZones) {
        const zoneTimes = [
          hrZones.zone_1_time_s || 0,
          hrZones.zone_2_time_s || 0,
          hrZones.zone_3_time_s || 0,
          hrZones.zone_4_time_s || 0,
          hrZones.zone_5_time_s || 0,
        ];
        load = zoneTimes.reduce((sum, time, idx) => sum + (time / 60) * zoneWeights[idx], 0);
      } else {
        load = parseFloat(activity.zone_points) || 0;
      }

      dailyLoads[dateStr] = (dailyLoads[dateStr] || 0) + load;
    }

    // Calculate chronic load (28-day average)
    let chronicLoad = 0;
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      chronicLoad += dailyLoads[dateStr] || 0;
    }
    chronicLoad /= 28;

    // Calculate acute load (7-day average)
    let acuteLoad = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      acuteLoad += dailyLoads[dateStr] || 0;
    }
    acuteLoad /= 7;

    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;

    // Calculate consistency (active days in last 28 days)
    const activeDaysLast28 = new Set(
      last28Days.map(a => new Date(a.start_date).toISOString().split('T')[0])
    ).size;
    const consistencyScore = (activeDaysLast28 / 28) * 100;

    // Calculate high-intensity ratio (Z4+Z5 time / total time)
    let totalZoneTime = 0;
    let highZoneTime = 0;
    for (const activity of last28Days) {
      const hrZones = activity.heart_rate_zones?.[0] || activity.heart_rate_zones;
      if (hrZones) {
        totalZoneTime += (hrZones.zone_1_time_s || 0) + (hrZones.zone_2_time_s || 0) +
                         (hrZones.zone_3_time_s || 0) + (hrZones.zone_4_time_s || 0) +
                         (hrZones.zone_5_time_s || 0);
        highZoneTime += (hrZones.zone_4_time_s || 0) + (hrZones.zone_5_time_s || 0);
      }
    }
    const highIntensityRatio = totalZoneTime > 0 ? (highZoneTime / totalZoneTime) * 100 : 0;

    // ============================================
    // RACE READINESS SCORE CALCULATION
    // ============================================
    // Weighted factors:
    // - Training volume (chronic load): 30%
    // - Sport balance: 20%
    // - Consistency: 25%
    // - ACWR (not overtrained): 15%
    // - High intensity work: 10%

    // Normalize chronic load (assume 100 daily load = "race ready" baseline)
    const volumeScore = Math.min(100, (chronicLoad / 100) * 100);

    // ACWR score (optimal is 0.8-1.5)
    let acwrScore = 100;
    if (acwr < 0.8) {
      acwrScore = (acwr / 0.8) * 100;
    } else if (acwr > 1.5) {
      acwrScore = Math.max(0, 100 - ((acwr - 1.5) * 100));
    }

    // High intensity score (ideal is 15-25%)
    let intensityScore = 100;
    if (highIntensityRatio < 10) {
      intensityScore = (highIntensityRatio / 10) * 100;
    } else if (highIntensityRatio > 30) {
      intensityScore = Math.max(0, 100 - ((highIntensityRatio - 30) * 2));
    }

    // Calculate overall race readiness
    const raceReadinessScore = Math.round(
      volumeScore * 0.30 +
      balanceScore * 0.20 +
      consistencyScore * 0.25 +
      acwrScore * 0.15 +
      intensityScore * 0.10
    );

    // Determine readiness level
    let readinessLevel: 'excellent' | 'good' | 'building' | 'needs_work';
    let readinessMessage: string;

    if (raceReadinessScore >= 80) {
      readinessLevel = 'excellent';
      readinessMessage = 'Your training is on track for a strong race performance.';
    } else if (raceReadinessScore >= 60) {
      readinessLevel = 'good';
      readinessMessage = 'Good progress. Stay consistent to reach peak fitness.';
    } else if (raceReadinessScore >= 40) {
      readinessLevel = 'building';
      readinessMessage = 'Building your base. Focus on consistency and volume.';
    } else {
      readinessLevel = 'needs_work';
      readinessMessage = 'Time to ramp up training. Increase weekly volume gradually.';
    }

    // Generate specific recommendations
    const recommendations: string[] = [];

    // Sport balance recommendations
    if (sportPercentages.swim < 10 && totalTriathlonTime > 0) {
      recommendations.push('Add more swim sessions - currently under 10% of training');
    }
    if (sportPercentages.run < 20 && totalTriathlonTime > 0) {
      recommendations.push('Consider more run training for race-day endurance');
    }
    if (sportPercentages.bikeCombined < 40 && totalTriathlonTime > 0) {
      recommendations.push('The bike is 56 miles - increase cycling volume');
    }

    // Volume recommendations
    if (chronicLoad < 50) {
      recommendations.push('Gradually increase weekly training volume');
    }

    // Consistency recommendations
    if (consistencyScore < 50) {
      recommendations.push('Aim for more consistent training - at least 4 days per week');
    }

    // Intensity recommendations
    if (highIntensityRatio < 10) {
      recommendations.push('Include more threshold and interval work');
    } else if (highIntensityRatio > 30) {
      recommendations.push('Consider more Zone 2 base training');
    }

    // Recovery recommendations based on ACWR
    if (acwr > 1.5) {
      recommendations.push('Recovery week recommended - high acute:chronic ratio');
    }

    return NextResponse.json({
      success: true,
      data: {
        hasData: true,
        sportBalance: {
          swim: sportBalance.swim,
          bike: sportBalance.bike,
          bikeIndoor: sportBalance.bikeIndoor,
          run: sportBalance.run,
          other: sportBalance.other,
          percentages: sportPercentages,
          idealDistribution,
          balanceScore: Math.round(balanceScore),
        },
        raceReadiness: {
          score: raceReadinessScore,
          level: readinessLevel,
          message: readinessMessage,
          daysToRace,
          weeksToRace,
          raceDate: raceDate.toISOString(),
          factors: {
            volume: { score: Math.round(volumeScore), weight: 30, chronicLoad: Math.round(chronicLoad) },
            balance: { score: Math.round(balanceScore), weight: 20 },
            consistency: { score: Math.round(consistencyScore), weight: 25, activeDays: activeDaysLast28 },
            recovery: { score: Math.round(acwrScore), weight: 15, acwr: acwr.toFixed(2) },
            intensity: { score: Math.round(intensityScore), weight: 10, ratio: highIntensityRatio.toFixed(1) },
          },
          recommendations,
        },
        totals: {
          activities: activities.length,
          triathlonActivities: sportBalance.swim.activities + sportBalance.bike.activities + sportBalance.run.activities,
          totalTime: sportBalance.swim.time + sportBalance.bike.time + sportBalance.run.time + sportBalance.other.time,
          totalDistance: sportBalance.swim.distance + sportBalance.bike.distance + sportBalance.run.distance,
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
