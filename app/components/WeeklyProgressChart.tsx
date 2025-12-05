'use client';

import { useState, useEffect } from 'react';

interface WeekData {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  points: number;
  activityCount: number;
  cumulativePoints: number;
}

interface WeeklyHistoryData {
  weeks: WeekData[];
  summary: {
    totalPoints: number;
    avgPointsPerWeek: number;
    bestWeek: { label: string; points: number } | null;
    currentWeek: { label: string; points: number };
    weekOverWeekChange: number | null;
    totalWeeks: number;
  };
}

interface WeeklyProgressChartProps {
  athleteId: string;
}

export default function WeeklyProgressChart({ athleteId }: WeeklyProgressChartProps) {
  const [data, setData] = useState<WeeklyHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'cumulative'>('weekly');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchWeeklyHistory() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/weekly-history`);
        if (!response.ok) {
          throw new Error('Failed to fetch weekly history');
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError('Failed to load weekly history');
        }
      } catch (err) {
        setError('Failed to load weekly history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyHistory();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="card p-4 sm:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="diamond-frame animate-gold-pulse">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || data.weeks.length === 0) {
    return (
      <div className="card p-4 sm:p-8">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-display gradient-text tracking-wider uppercase mb-2">
          Weekly Progress
        </h2>
        <div className="h-px w-32 sm:w-48 bg-gold/30 mb-6"></div>
        <p className="text-muted font-body text-center py-8">
          {error || 'No activity data available yet. Start training to see your progress!'}
        </p>
      </div>
    );
  }

  const { weeks, summary } = data;
  const displayData = viewMode === 'weekly'
    ? weeks.map(w => w.points)
    : weeks.map(w => w.cumulativePoints);

  const maxValue = Math.max(...displayData, 1);
  const minValue = Math.min(...displayData);
  const chartHeight = 180;
  const chartWidth = 100; // percentage

  // Calculate padding for the chart area
  const paddingTop = 20;
  const paddingBottom = 10;
  const paddingLeft = 5;
  const paddingRight = 5;

  // Generate SVG path for the line
  const getPointCoordinates = (index: number, value: number) => {
    const x = paddingLeft + ((chartWidth - paddingLeft - paddingRight) / (weeks.length - 1 || 1)) * index;
    const y = paddingTop + ((chartHeight - paddingTop - paddingBottom) * (1 - (value - 0) / (maxValue || 1)));
    return { x, y };
  };

  // Create the line path
  const linePath = weeks.map((week, index) => {
    const value = viewMode === 'weekly' ? week.points : week.cumulativePoints;
    const { x, y } = getPointCoordinates(index, value);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create the gradient fill path (area under the line)
  const areaPath = `${linePath} L ${paddingLeft + chartWidth - paddingLeft - paddingRight} ${chartHeight - paddingBottom} L ${paddingLeft} ${chartHeight - paddingBottom} Z`;

  return (
    <div className="card p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-display gradient-text tracking-wider uppercase">
            Weekly Progress
          </h2>
          <div className="h-px w-32 sm:w-48 bg-gold/30 mt-2"></div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1.5 text-xs font-body uppercase tracking-wider border transition-all duration-300 ${
              viewMode === 'weekly'
                ? 'bg-gold text-background border-gold'
                : 'bg-transparent text-gold border-gold/50 hover:border-gold'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-3 py-1.5 text-xs font-body uppercase tracking-wider border transition-all duration-300 ${
              viewMode === 'cumulative'
                ? 'bg-gold text-background border-gold'
                : 'bg-transparent text-gold border-gold/50 hover:border-gold'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      {/* Summary Stats - Mobile optimized grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-background border border-gold/20 p-3 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">This Week</div>
          <div className="text-xl sm:text-2xl font-display gradient-text">
            {summary.currentWeek.points}
          </div>
        </div>
        <div className="bg-background border border-gold/20 p-3 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Week Change</div>
          <div className={`text-xl sm:text-2xl font-display ${
            summary.weekOverWeekChange === null
              ? 'text-muted'
              : summary.weekOverWeekChange >= 0
                ? 'text-zone-2'
                : 'text-zone-5'
          }`}>
            {summary.weekOverWeekChange === null
              ? '—'
              : summary.weekOverWeekChange >= 0
                ? `+${summary.weekOverWeekChange}`
                : summary.weekOverWeekChange}
          </div>
        </div>
        <div className="bg-background border border-gold/20 p-3 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Avg/Week</div>
          <div className="text-xl sm:text-2xl font-display text-foreground">
            {summary.avgPointsPerWeek}
          </div>
        </div>
        <div className="bg-background border border-gold/20 p-3 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Best Week</div>
          <div className="text-xl sm:text-2xl font-display text-gold">
            {summary.bestWeek?.points || 0}
          </div>
        </div>
      </div>

      {/* Line Chart Container */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-10 sm:w-14 flex flex-col justify-between text-right pr-2 pointer-events-none">
          <span className="text-xs text-muted font-body">{Math.round(maxValue)}</span>
          <span className="text-xs text-muted font-body">{Math.round(maxValue / 2)}</span>
          <span className="text-xs text-muted font-body">0</span>
        </div>

        {/* Chart Area */}
        <div className="ml-10 sm:ml-14">
          <div className="relative border-l border-b border-gold/20" style={{ height: `${chartHeight}px` }}>
            {/* Horizontal grid lines */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gold/10"></div>
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gold/5"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gold/10"></div>
            <div className="absolute top-3/4 left-0 right-0 h-px bg-gold/5"></div>

            {/* SVG Line Chart - just for line and area */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#F2E8C4" stopOpacity="1" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Area fill under the line */}
              <path
                d={areaPath}
                fill="url(#areaGradient)"
                className="transition-all duration-500"
              />

              {/* Main line with glow */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="transition-all duration-500"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Data points as HTML elements - perfectly circular */}
            {weeks.map((week, index) => {
              const value = viewMode === 'weekly' ? week.points : week.cumulativePoints;
              const { x, y } = getPointCoordinates(index, value);
              const isCurrentWeek = index === weeks.length - 1;
              const isBestWeek = summary.bestWeek && week.weekLabel === summary.bestWeek.label && viewMode === 'weekly';
              const isHovered = hoveredIndex === index;

              // Size based on state
              const size = isHovered ? 16 : isCurrentWeek ? 14 : 12;

              return (
                <div
                  key={week.weekStart}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${x}%`,
                    top: `${(y / chartHeight) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Large invisible hit area */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: '32px',
                      height: '32px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />

                  {/* Outer ripple rings on hover */}
                  {isHovered && (
                    <>
                      <div
                        className="absolute rounded-full border-2 animate-ping"
                        style={{
                          width: '28px',
                          height: '28px',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          borderColor: isCurrentWeek ? '#D4AF37' : isBestWeek ? '#22C55E' : '#D4AF37',
                          opacity: 0.4,
                        }}
                      />
                      <div
                        className="absolute rounded-full border"
                        style={{
                          width: '24px',
                          height: '24px',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          borderColor: isCurrentWeek ? '#D4AF37' : isBestWeek ? '#22C55E' : '#D4AF37',
                          opacity: 0.6,
                        }}
                      />
                    </>
                  )}

                  {/* The actual circular point */}
                  <div
                    className={`rounded-full border-2 transition-all duration-200 ${
                      isCurrentWeek || isBestWeek || isHovered ? 'shadow-lg' : ''
                    }`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: isCurrentWeek
                        ? '#D4AF37'
                        : isBestWeek
                          ? '#22C55E'
                          : '#FFFFFF',
                      borderColor: isCurrentWeek
                        ? '#B8960C'
                        : isBestWeek
                          ? '#16A34A'
                          : '#D4AF37',
                      boxShadow: isCurrentWeek
                        ? '0 0 12px rgba(212, 175, 55, 0.7)'
                        : isBestWeek
                          ? '0 0 12px rgba(34, 197, 94, 0.7)'
                          : isHovered
                            ? '0 0 10px rgba(212, 175, 55, 0.5)'
                            : 'none',
                    }}
                  />
                </div>
              );
            })}

            {/* Tooltips (rendered outside SVG for better styling) */}
            {hoveredIndex !== null && (
              <div
                className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${getPointCoordinates(hoveredIndex, 0).x}%`,
                  top: `${getPointCoordinates(hoveredIndex, viewMode === 'weekly' ? weeks[hoveredIndex].points : weeks[hoveredIndex].cumulativePoints).y - 10}px`,
                }}
              >
                <div className="bg-card border border-gold/60 px-3 py-2 text-xs font-body shadow-lg shadow-gold/20 whitespace-nowrap animate-fade-in-up">
                  <div className="text-gold font-semibold text-sm">{weeks[hoveredIndex].weekLabel}</div>
                  <div className="text-foreground mt-1">
                    <span className="text-lg font-display gradient-text">
                      {viewMode === 'weekly' ? weeks[hoveredIndex].points : weeks[hoveredIndex].cumulativePoints}
                    </span>
                    <span className="text-muted ml-1">pts</span>
                  </div>
                  {viewMode === 'weekly' && (
                    <div className="text-muted mt-0.5">{weeks[hoveredIndex].activityCount} activities</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-3 px-1">
            {weeks.map((week, index) => {
              // Show fewer labels on mobile
              const showLabel = weeks.length <= 6 || index % Math.ceil(weeks.length / 5) === 0 || index === weeks.length - 1;
              const isCurrentWeek = index === weeks.length - 1;

              return (
                <div
                  key={week.weekStart}
                  className="text-center flex-1"
                  style={{ maxWidth: `${100 / weeks.length}%` }}
                >
                  {showLabel && (
                    <span className={`text-xs font-body whitespace-nowrap ${isCurrentWeek ? 'text-gold font-semibold' : 'text-muted'}`}>
                      <span className="hidden sm:inline">{week.weekLabel}</span>
                      <span className="sm:hidden">{week.weekLabel.split(' ')[0].slice(0, 3)} {week.weekLabel.split(' ')[1]}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-6 text-xs font-body text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gold border-2 border-gold-dark shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
          <span>Current Week</span>
        </div>
        {viewMode === 'weekly' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span>Best Week</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white border-2 border-gold"></div>
          <span>Previous Weeks</span>
        </div>
      </div>
    </div>
  );
}
