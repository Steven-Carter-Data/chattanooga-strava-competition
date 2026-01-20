/**
 * Timezone utilities for Eastern Standard Time (EST/EDT)
 * All week boundaries are calculated in America/New_York timezone
 * Week runs Monday 12:00 AM EST to Sunday 11:59:59 PM EST
 */

// Eastern timezone identifier
const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Convert a UTC date to Eastern Time
 * Returns a new Date object adjusted to Eastern Time
 */
export function toEasternTime(date: Date): Date {
  // Get the date string in Eastern timezone
  const easternString = date.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
  });
  return new Date(easternString);
}

/**
 * Get the start of the week (Monday 12:00 AM EST) for a given date
 * @param date - Any date (will be converted to EST first)
 * @returns Date object representing Monday 12:00:00.000 AM EST of that week
 */
export function getWeekStartEST(date: Date): Date {
  // Convert to Eastern Time first
  const eastern = toEasternTime(date);

  const dayOfWeek = eastern.getDay();
  // Convert Sunday=0 to 6, Monday=1 to 0, etc. (Monday-based week)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(eastern);
  weekStart.setDate(eastern.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

/**
 * Get the end of the week (Sunday 11:59:59.999 PM EST) for a given date
 * @param date - Any date (will be converted to EST first)
 * @returns Date object representing Sunday 11:59:59.999 PM EST of that week
 */
export function getWeekEndEST(date: Date): Date {
  const weekStart = getWeekStartEST(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get a unique key for a week based on the Monday start date
 * Format: YYYY-MM-DD (the Monday of that week in EST)
 */
export function getWeekKeyEST(date: Date): string {
  const weekStart = getWeekStartEST(date);
  return weekStart.toISOString().split('T')[0];
}

/**
 * Format a date for display in Eastern Time
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 */
export function formatDateEST(
  date: Date,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  return date.toLocaleDateString('en-US', {
    ...options,
    timeZone: EASTERN_TIMEZONE,
  });
}

/**
 * Check if a date falls within a specific week (in EST)
 * @param date - Date to check
 * @param weekStart - Start of the week to check against
 */
export function isInWeekEST(date: Date, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const dateEST = toEasternTime(date);
  return dateEST >= weekStart && dateEST <= weekEnd;
}
