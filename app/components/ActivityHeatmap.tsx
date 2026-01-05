'use client';

import { useEffect, useState } from 'react';

interface CalendarDay {
  date: string;
  points: number;
  activities: number;
  sports: string[];
  totalTime: number;
  totalDistance: number;
  intensity: number;
}

interface CalendarData {
  calendar: CalendarDay[];
  stats: {
    totalDays: number;
    totalPoints: number;
    maxDailyPoints: number;
    avgDailyPoints: number;
  };
  range: {
    start: string;
    end: string;
  };
}

// Intensity colors (Art Deco gold theme)
const intensityColors = [
  'bg-background border-gold/10', // 0 - no activity
  'bg-gold/20 border-gold/30',    // 1 - light
  'bg-gold/40 border-gold/50',    // 2 - moderate
  'bg-gold/60 border-gold/70',    // 3 - high
  'bg-gold border-gold',          // 4 - intense
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

export default function ActivityHeatmap({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<CalendarDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/activity-calendar`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-center py-8">
          <div className="diamond-frame animate-gold-pulse">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Build calendar grid (last 16 weeks)
  const weeks: (CalendarDay | null)[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 16 * 7); // Go back 16 weeks
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

  // Create a map for quick lookup
  const dayMap = new Map<string, CalendarDay>();
  data.calendar.forEach(day => dayMap.set(day.date, day));

  // Build weeks
  let currentDate = new Date(startDate);
  while (currentDate <= today) {
    const week: (CalendarDay | null)[] = [];
    for (let i = 0; i < 7; i++) {
      if (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        week.push(dayMap.get(dateStr) || {
          date: dateStr,
          points: 0,
          activities: 0,
          sports: [],
          totalTime: 0,
          totalDistance: 0,
          intensity: 0,
        });
      } else {
        week.push(null);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstDay = week.find(d => d !== null);
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: new Date(firstDay.date).toLocaleDateString('en-US', { month: 'short' }),
          weekIndex,
        });
        lastMonth = month;
      }
    }
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card p-4 sm:p-6 mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
              Activity Heatmap
            </h3>
            <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
              {data.stats.totalDays} Active Days
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-lg font-display gradient-text">{data.stats.totalPoints.toFixed(0)}</div>
            <div className="text-xs text-muted font-body">Total Pts</div>
          </div>
          <div>
            <div className="text-lg font-display text-foreground">{data.stats.avgDailyPoints.toFixed(1)}</div>
            <div className="text-xs text-muted font-body">Avg/Day</div>
          </div>
          <div>
            <div className="text-lg font-display text-foreground">{data.stats.maxDailyPoints.toFixed(0)}</div>
            <div className="text-xs text-muted font-body">Best Day</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[600px]">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map((month, idx) => (
              <div
                key={idx}
                className="text-xs text-muted font-body"
                style={{
                  marginLeft: idx === 0 ? `${month.weekIndex * 14}px` : `${(month.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0) - 1) * 14}px`,
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-2 text-xs text-muted font-body">
              {dayLabels.map((day, idx) => (
                <div key={idx} className="h-3 flex items-center" style={{ height: '12px' }}>
                  {idx % 2 === 1 ? day.charAt(0) : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 border transition-all duration-200 cursor-pointer hover:scale-125 hover:z-10 ${
                        day ? intensityColors[day.intensity] : 'bg-transparent border-transparent'
                      }`}
                      onMouseEnter={(e) => {
                        if (day && day.activities > 0) {
                          setHoveredDay(day);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs font-body text-muted">
        <span>Less</span>
        {intensityColors.map((color, idx) => (
          <div key={idx} className={`w-3 h-3 border ${color}`} />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-card border border-gold/30 p-3 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
          }}
        >
          <div className="text-sm font-display text-gold mb-1">
            {new Date(hoveredDay.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-lg font-display gradient-text">
            {hoveredDay.points.toFixed(1)} pts
          </div>
          <div className="text-xs text-muted font-body mt-1">
            {hoveredDay.activities} {hoveredDay.activities === 1 ? 'activity' : 'activities'}
          </div>
          {hoveredDay.totalTime > 0 && (
            <div className="text-xs text-muted font-body">
              {formatDuration(hoveredDay.totalTime)} • {formatDistance(hoveredDay.totalDistance)}
            </div>
          )}
          <div className="text-xs text-gold/80 font-body mt-1">
            {hoveredDay.sports.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
