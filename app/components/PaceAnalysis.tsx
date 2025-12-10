'use client';

import { useEffect, useState } from 'react';

interface PaceData {
  activityCount: number;
  paceUnit: string;
  isSpeedSport: boolean;
  currentAvgPace: number;
  overallAvgPace: number;
  improvement: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  bestPace: {
    value: number;
    date: string;
    name: string;
  };
  worstPace: {
    value: number;
    date: string;
    name: string;
  };
  chartData: Array<{
    week: string;
    avgPace: number;
    count: number;
  }>;
  recentActivities: Array<{
    id: string;
    name: string;
    date: string;
    pace: number;
    paceUnit: string;
  }>;
}

interface PaceAnalysisData {
  hasData: boolean;
  sports: Record<string, PaceData>;
}

function formatPace(pace: number, unit: string): string {
  if (unit === 'min/mi' || unit === 'min/100m') {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return pace.toFixed(1);
}

function formatSportType(sport: string): string {
  return sport.replace(/([A-Z])/g, ' $1').trim();
}

export default function PaceAnalysis({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<PaceAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/pace-analysis`);
        const result = await response.json();

        if (result.success && result.data.hasData) {
          setData(result.data);
          // Select first sport by default
          const sports = Object.keys(result.data.sports);
          if (sports.length > 0) {
            setSelectedSport(sports[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch pace data:', err);
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

  if (!data || !data.hasData || !selectedSport) {
    return null;
  }

  const sportData = data.sports[selectedSport];
  const sports = Object.keys(data.sports);

  // Calculate chart dimensions
  const chartWidth = 100;
  const chartHeight = 60;
  const padding = 5;

  const paces = sportData.chartData.map(d => d.avgPace);
  const minPace = Math.min(...paces) * 0.95;
  const maxPace = Math.max(...paces) * 1.05;
  const paceRange = maxPace - minPace;

  // For speed sports (higher is better), invert the Y axis
  const getY = (pace: number) => {
    if (sportData.isSpeedSport) {
      return padding + ((maxPace - pace) / paceRange) * (chartHeight - padding * 2);
    }
    return padding + ((pace - minPace) / paceRange) * (chartHeight - padding * 2);
  };

  const pathPoints = sportData.chartData.map((d, i) => {
    const x = padding + (i / (sportData.chartData.length - 1)) * (chartWidth - padding * 2);
    const y = getY(d.avgPace);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Trend line (linear regression approximation - simple average slope)
  const trendStartY = getY(sportData.chartData[0]?.avgPace || 0);
  const trendEndY = getY(sportData.chartData[sportData.chartData.length - 1]?.avgPace || 0);

  return (
    <div className="card p-4 sm:p-6 mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
              Pace Analysis
            </h3>
            <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
              Speed & Performance Trends
            </p>
          </div>
        </div>

        {/* Sport Selector */}
        {sports.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1.5 text-xs font-body uppercase tracking-wider border transition-all duration-300 ${
                  selectedSport === sport
                    ? 'bg-gold/20 border-gold text-gold'
                    : 'bg-background border-gold/20 text-muted hover:border-gold/40'
                }`}
              >
                {formatSportType(sport)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Current Pace */}
        <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Current Avg</div>
          <div className="text-xl sm:text-2xl font-display gradient-text">
            {formatPace(sportData.currentAvgPace, sportData.paceUnit)}
          </div>
          <div className="text-xs text-muted font-body">{sportData.paceUnit}</div>
        </div>

        {/* Improvement */}
        <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Improvement</div>
          <div className={`text-xl sm:text-2xl font-display ${
            sportData.improvement > 0 ? 'text-green-500' : sportData.improvement < 0 ? 'text-red-500' : 'text-muted'
          }`}>
            {sportData.improvement > 0 ? '+' : ''}{sportData.improvement.toFixed(1)}%
          </div>
          <div className="text-xs text-muted font-body">vs earlier</div>
        </div>

        {/* Best Pace */}
        <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Best</div>
          <div className="text-xl sm:text-2xl font-display text-foreground">
            {formatPace(sportData.bestPace.value, sportData.paceUnit)}
          </div>
          <div className="text-xs text-muted font-body">{sportData.paceUnit}</div>
        </div>

        {/* Trend */}
        <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Trend</div>
          <div className={`text-lg sm:text-xl font-display flex items-center justify-center gap-1 ${
            sportData.recentTrend === 'improving' ? 'text-green-500' :
            sportData.recentTrend === 'declining' ? 'text-red-500' : 'text-muted'
          }`}>
            {sportData.recentTrend === 'improving' && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm uppercase">Up</span>
              </>
            )}
            {sportData.recentTrend === 'declining' && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm uppercase">Down</span>
              </>
            )}
            {sportData.recentTrend === 'stable' && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
                <span className="text-sm uppercase">Stable</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted font-body">last 5 activities</div>
        </div>
      </div>

      {/* Chart */}
      {sportData.chartData.length >= 2 && (
        <div className="bg-background border border-gold/20 p-4 mb-6">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-4">
            Weekly Average {sportData.isSpeedSport ? 'Speed' : 'Pace'} (Last 12 Weeks)
          </div>
          <div className="relative" style={{ height: '120px' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1={padding}
                  y1={padding + ratio * (chartHeight - padding * 2)}
                  x2={chartWidth - padding}
                  y2={padding + ratio * (chartHeight - padding * 2)}
                  stroke="var(--gold)"
                  strokeOpacity={0.1}
                  strokeWidth={0.5}
                />
              ))}

              {/* Trend line */}
              <line
                x1={padding}
                y1={trendStartY}
                x2={chartWidth - padding}
                y2={trendEndY}
                stroke="var(--gold)"
                strokeOpacity={0.3}
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Main line */}
              <path
                d={pathPoints}
                fill="none"
                stroke="var(--gold)"
                strokeWidth={1.5}
                className="transition-all duration-500"
              />

              {/* Area fill */}
              <path
                d={`${pathPoints} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
                fill="url(#paceGradient)"
              />

              {/* Data points */}
              {sportData.chartData.map((d, i) => {
                const x = padding + (i / (sportData.chartData.length - 1)) * (chartWidth - padding * 2);
                const y = getY(d.avgPace);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={1.5}
                    fill="var(--gold)"
                  />
                );
              })}

              <defs>
                <linearGradient id="paceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            </svg>

            {/* Labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted font-body px-1">
              {sportData.chartData.length > 0 && (
                <>
                  <span>{new Date(sportData.chartData[0].week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(sportData.chartData[sportData.chartData.length - 1].week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personal Records */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Best Performance */}
        <div className="bg-background border border-green-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-body text-green-500 uppercase tracking-wider">Best Performance</span>
          </div>
          <div className="text-lg font-display text-foreground truncate">{sportData.bestPace.name}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-display gradient-text">
              {formatPace(sportData.bestPace.value, sportData.paceUnit)} {sportData.paceUnit}
            </span>
            <span className="text-xs text-muted font-body">
              {new Date(sportData.bestPace.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Activity Count */}
        <div className="bg-background border border-gold/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-body text-muted uppercase tracking-wider">Total Activities</span>
          </div>
          <div className="text-2xl font-display text-foreground">{sportData.activityCount}</div>
          <div className="text-xs text-muted font-body mt-1">
            {formatSportType(selectedSport)} activities analyzed
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      {sportData.recentActivities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gold/20">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-3">Recent {formatSportType(selectedSport)} Activities</div>
          <div className="space-y-2">
            {sportData.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gold/10 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-body text-foreground truncate">{activity.name}</div>
                  <div className="text-xs text-muted font-body">
                    {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-display text-gold">
                    {formatPace(activity.pace, activity.paceUnit)}
                  </div>
                  <div className="text-xs text-muted font-body">{activity.paceUnit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
