/**
 * Swim Cap Logic for Last 4 Weeks of Competition
 *
 * Rule: During the last 4 weeks of competition, the 4x swim multiplier
 * is capped at 3 hours per week. Swim time beyond 3 hours uses HR zone
 * scoring (same as any other activity type).
 */

import { toEasternTime, getWeekStartEST, getWeekEndEST } from '@/lib/timezone';

// 3 hours in seconds
const SWIM_CAP_SECONDS = 3 * 60 * 60; // 10,800 seconds

// Number of final weeks where the cap applies
const CAP_WEEKS_FROM_END = 4;

/**
 * Calculate the week number for an activity date relative to competition start.
 * Week 0 = partial week from competition start to first Sunday.
 * Week 1+ = full Monday-Sunday weeks.
 */
export function getActivityWeekNumber(activityDate: Date, competitionStart: Date): number {
  const compStartEST = toEasternTime(competitionStart);
  const compStartDay = compStartEST.getDay();
  const startsOnMonday = compStartDay === 1;

  let week1Start: Date;
  if (startsOnMonday) {
    week1Start = new Date(competitionStart);
  } else {
    week1Start = getWeekStartEST(competitionStart);
    week1Start.setDate(week1Start.getDate() + 7);
  }

  const actDate = toEasternTime(activityDate);
  if (actDate < week1Start) return 0;
  const diffMs = actDate.getTime() - week1Start.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Calculate the total number of full weeks in the competition.
 */
export function getTotalCompetitionWeeks(competitionStart: Date, competitionEnd: Date): number {
  const compStartEST = toEasternTime(competitionStart);
  const compStartDay = compStartEST.getDay();
  const startsOnMonday = compStartDay === 1;

  let week1Start: Date;
  if (startsOnMonday) {
    week1Start = new Date(competitionStart);
  } else {
    week1Start = getWeekStartEST(competitionStart);
    week1Start.setDate(week1Start.getDate() + 7);
  }

  const endEST = toEasternTime(competitionEnd);
  const diffMs = endEST.getTime() - week1Start.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Check if a given week number falls within the swim cap period (last 4 weeks).
 */
export function isSwimCapWeek(weekNumber: number, competitionStart: Date, competitionEnd: Date): boolean {
  if (weekNumber === 0) return false;
  const totalWeeks = getTotalCompetitionWeeks(competitionStart, competitionEnd);
  const capStartWeek = totalWeeks - CAP_WEEKS_FROM_END + 1;
  return weekNumber >= capStartWeek && weekNumber <= totalWeeks;
}

/**
 * Get the Monday-Sunday date range for a given week number.
 */
export function getWeekDateRange(weekNumber: number, competitionStart: Date): { weekStart: Date; weekEnd: Date } {
  const compStartEST = toEasternTime(competitionStart);
  const compStartDay = compStartEST.getDay();
  const startsOnMonday = compStartDay === 1;

  let week1Start: Date;
  if (startsOnMonday) {
    week1Start = new Date(competitionStart);
  } else {
    week1Start = getWeekStartEST(competitionStart);
    week1Start.setDate(week1Start.getDate() + 7);
  }

  const weekStart = new Date(week1Start);
  weekStart.setDate(week1Start.getDate() + (weekNumber - 1) * 7);
  const weekEnd = getWeekEndEST(weekStart);

  return { weekStart, weekEnd };
}

/**
 * Calculate swim points with the 3-hour weekly cap applied.
 *
 * @param movingTimeS - This swim's moving time in seconds
 * @param priorSwimTimeS - Total swim time already recorded this week for this athlete
 * @param hrZones - HR zone data for this swim (zone times in seconds), null if unavailable
 * @returns The calculated zone points for this swim activity
 */
export function calculateCappedSwimPoints(
  movingTimeS: number,
  priorSwimTimeS: number,
  hrZones: { zone_1: number; zone_2: number; zone_3: number; zone_4: number; zone_5: number } | null
): number {
  const capRemaining = Math.max(0, SWIM_CAP_SECONDS - priorSwimTimeS);
  const cappedTime = Math.min(movingTimeS, capRemaining);
  const overflowTime = movingTimeS - cappedTime;

  // 4x multiplier portion
  const fourXPoints = Math.round((cappedTime / 60) * 4);

  if (overflowTime <= 0) {
    return fourXPoints;
  }

  // HR zone scoring for overflow portion
  let overflowPoints = 0;
  if (hrZones) {
    // Calculate full HR zone points for this swim
    const fullHRZonePoints =
      (hrZones.zone_1 / 60) * 1 +
      (hrZones.zone_2 / 60) * 2 +
      (hrZones.zone_3 / 60) * 3 +
      (hrZones.zone_4 / 60) * 4 +
      (hrZones.zone_5 / 60) * 5;

    // Prorate HR zone points for the overflow portion
    if (movingTimeS > 0) {
      overflowPoints = fullHRZonePoints * (overflowTime / movingTimeS);
    }
  } else {
    // No HR data available - fall back to Zone 1 (1 pt/min) for overflow
    overflowPoints = overflowTime / 60;
  }

  return Math.round(fourXPoints + overflowPoints);
}
