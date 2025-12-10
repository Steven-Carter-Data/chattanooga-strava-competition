'use client';

import { useEffect, useState } from 'react';

interface TrainingLoadData {
  hasData: boolean;
  summary: {
    totalActivities: number;
    totalTrainingLoad: number;
    avgWeeklyLoad: number;
  };
  currentStatus: {
    acuteLoad: number;
    chronicLoad: number;
    acuteChronicRatio: number;
    trainingStatus: 'optimal' | 'overreaching' | 'undertraining' | 'high_risk';
    statusDescription: string;
    loadTrend: 'increasing' | 'stable' | 'decreasing';
    recoveryRecommendation: string;
  };
  highestLoadWeek: {
    weekStart: string;
    load: number;
    activities: number;
  } | null;
  chartData: Array<{
    weekStart: string;
    load: number;
    activities: number;
    avgDailyLoad: number;
  }>;
  recentActivities: Array<{
    id: string;
    name: string;
    sport_type: string;
    date: string;
    training_load: number;
  }>;
}

const statusColors = {
  optimal: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-500' },
  overreaching: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-500' },
  undertraining: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' },
  high_risk: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-500' },
};

const statusLabels = {
  optimal: 'Optimal Zone',
  overreaching: 'Pushing Hard',
  undertraining: 'Recovery Mode',
  high_risk: 'Caution',
};

// Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-80 p-3 bg-card border border-gold/30 shadow-lg text-sm font-body text-foreground">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gold/30"></div>
        </div>
      )}
    </div>
  );
}

export default function TrainingLoadGraph({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<TrainingLoadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLearnMore, setShowLearnMore] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/training-load`);
        const result = await response.json();

        if (result.success && result.data.hasData) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch training load:', err);
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

  if (!data || !data.hasData) {
    return null;
  }

  const { summary, currentStatus, highestLoadWeek, chartData } = data;
  const statusStyle = statusColors[currentStatus.trainingStatus];

  // Calculate chart dimensions
  const chartWidth = 100;
  const chartHeight = 60;
  const padding = 5;

  const loads = chartData.map(d => d.load);
  const maxLoad = Math.max(...loads, 1);

  // Create bar chart data
  const barWidth = (chartWidth - padding * 2) / chartData.length - 1;

  return (
    <div className="card p-4 sm:p-6 mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
            Training Load
          </h3>
          <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
            Are you training smart?
          </p>
        </div>
      </div>

      {/* Main Status Card - The Key Insight */}
      <div className={`${statusStyle.bg} border ${statusStyle.border} p-4 sm:p-6 mb-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg font-display ${statusStyle.text} uppercase tracking-wider`}>
                {statusLabels[currentStatus.trainingStatus]}
              </span>
              {currentStatus.loadTrend === 'increasing' && (
                <span className="text-xs text-green-500 font-body">(trending up)</span>
              )}
              {currentStatus.loadTrend === 'decreasing' && (
                <span className="text-xs text-blue-500 font-body">(easing off)</span>
              )}
            </div>
            <p className="text-sm text-foreground/80 font-body">{currentStatus.statusDescription}</p>

            {/* Simple explanation */}
            <div className="mt-3 p-3 bg-background/50 border border-gold/10">
              <p className="text-xs text-muted font-body leading-relaxed">
                {currentStatus.trainingStatus === 'optimal' && (
                  <>Your recent training matches what your body is used to. This is the sweet spot for building fitness while avoiding burnout.</>
                )}
                {currentStatus.trainingStatus === 'overreaching' && (
                  <>You&apos;re training harder than usual. This can be good for short periods, but watch for signs of fatigue.</>
                )}
                {currentStatus.trainingStatus === 'undertraining' && (
                  <>You&apos;re training less than your recent average. Great for recovery weeks, but don&apos;t stay here too long if you want to improve.</>
                )}
                {currentStatus.trainingStatus === 'high_risk' && (
                  <>Your recent training is much higher than usual. Consider backing off to avoid injury or burnout.</>
                )}
              </p>
            </div>
          </div>

          {/* The Ratio - with tooltip */}
          <Tooltip
            content={
              <div>
                <div className="font-display text-gold mb-2">Acute:Chronic Ratio</div>
                <p className="text-muted mb-2">
                  This compares your <strong>recent effort</strong> (last 7 days) to your <strong>baseline fitness</strong> (last 28 days).
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-400">Below 0.8</span>
                    <span>Detraining/Recovery</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-400">0.8 - 1.8</span>
                    <span>Optimal zone</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">1.8 - 2.2</span>
                    <span>Pushing limits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">Above 2.2</span>
                    <span>Injury risk zone</span>
                  </div>
                </div>
                <p className="text-muted/70 text-xs mt-2 pt-2 border-t border-gold/10">
                  <em>Thresholds adjusted for endurance athletes training for Ironman 70.3</em>
                </p>
              </div>
            }
          >
            <div className="text-center p-3 bg-background/50 border border-gold/20 hover:border-gold/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-display gradient-text">
                {currentStatus.acuteChronicRatio.toFixed(2)}
              </div>
              <div className="text-xs text-muted font-body uppercase tracking-wider flex items-center justify-center gap-1">
                Workload Ratio
                <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Recommendation */}
        <div className="mt-4 pt-4 border-t border-gold/20">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <span className="text-xs text-gold font-body uppercase tracking-wider">Suggestion: </span>
              <span className="text-sm text-foreground/80 font-body">{currentStatus.recoveryRecommendation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid with Tooltips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Tooltip
          content={
            <div>
              <div className="font-display text-gold mb-2">Acute Training Load</div>
              <p className="text-muted text-xs">
                Your average daily training load over the <strong>last 7 days</strong>. This represents your current fatigue level and recent training stress.
              </p>
            </div>
          }
        >
          <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center hover:border-gold/40 transition-colors cursor-help">
            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              Acute Load
              <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-display text-foreground">
              {currentStatus.acuteLoad.toFixed(0)}
            </div>
            <div className="text-xs text-muted font-body">last 7 days</div>
          </div>
        </Tooltip>

        <Tooltip
          content={
            <div>
              <div className="font-display text-gold mb-2">Chronic Training Load</div>
              <p className="text-muted text-xs">
                Your average daily training load over the <strong>last 28 days</strong>. This represents your fitness base - what your body has adapted to handle.
              </p>
            </div>
          }
        >
          <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center hover:border-gold/40 transition-colors cursor-help">
            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              Chronic Load
              <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-display text-foreground">
              {currentStatus.chronicLoad.toFixed(0)}
            </div>
            <div className="text-xs text-muted font-body">last 28 days</div>
          </div>
        </Tooltip>

        <Tooltip
          content={
            <div>
              <div className="font-display text-gold mb-2">Average Weekly Load</div>
              <p className="text-muted text-xs">
                Your typical weekly training load across all tracked weeks. Use this as a benchmark for planning training volume.
              </p>
            </div>
          }
        >
          <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center hover:border-gold/40 transition-colors cursor-help">
            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              Avg Weekly
              <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-display gradient-text">
              {summary.avgWeeklyLoad.toFixed(0)}
            </div>
            <div className="text-xs text-muted font-body">load units</div>
          </div>
        </Tooltip>

        <div className="bg-background border border-gold/20 p-3 sm:p-4 text-center">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Total Load</div>
          <div className="text-xl sm:text-2xl font-display text-foreground">
            {summary.totalTrainingLoad.toFixed(0)}
          </div>
          <div className="text-xs text-muted font-body">all time</div>
        </div>
      </div>

      {/* Weekly Load Chart */}
      {chartData.length >= 2 && (
        <div className="bg-background border border-gold/20 p-4 mb-6">
          <div className="text-xs text-muted font-body uppercase tracking-wider mb-4">
            Weekly Training Load (Last 12 Weeks)
          </div>
          <div className="relative" style={{ height: '140px' }}>
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

              {/* Average line */}
              {summary.avgWeeklyLoad > 0 && (
                <line
                  x1={padding}
                  y1={chartHeight - padding - (summary.avgWeeklyLoad / maxLoad) * (chartHeight - padding * 2)}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding - (summary.avgWeeklyLoad / maxLoad) * (chartHeight - padding * 2)}
                  stroke="var(--gold)"
                  strokeOpacity={0.5}
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
              )}

              {/* Bars */}
              {chartData.map((week, i) => {
                const barHeight = (week.load / maxLoad) * (chartHeight - padding * 2);
                const x = padding + i * (barWidth + 1);
                const y = chartHeight - padding - barHeight;

                const isAboveAvg = week.load > summary.avgWeeklyLoad;
                const isRecent = i >= chartData.length - 2;

                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={isRecent ? 'var(--gold)' : (isAboveAvg ? 'var(--gold)' : 'var(--muted)')}
                      fillOpacity={isRecent ? 0.8 : 0.4}
                      className="transition-all duration-300"
                    />
                    {week.activities > 0 && (
                      <circle
                        cx={x + barWidth / 2}
                        cy={y - 2}
                        r={1}
                        fill="var(--gold)"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted font-body px-1">
              {chartData.length > 0 && (
                <>
                  <span>{new Date(chartData[0].weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(chartData[chartData.length - 1].weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs font-body text-muted">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gold/80"></div>
              <span>Recent weeks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-px h-3 bg-gold/50 border-dashed"></div>
              <span>Your average</span>
            </div>
          </div>
        </div>
      )}

      {/* Highest Load Week */}
      {highestLoadWeek && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-background border border-gold/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-xs font-body text-gold uppercase tracking-wider">Biggest Week</span>
            </div>
            <div className="text-2xl font-display text-foreground">{highestLoadWeek.load.toFixed(0)} load</div>
            <div className="text-sm text-muted font-body mt-1">
              Week of {new Date(highestLoadWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span className="mx-2">•</span>
              {highestLoadWeek.activities} activities
            </div>
          </div>

          <div className="bg-background border border-gold/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-body text-muted uppercase tracking-wider">Total Activities</span>
            </div>
            <div className="text-2xl font-display text-foreground">{summary.totalActivities}</div>
            <div className="text-sm text-muted font-body mt-1">
              Tracked in competition
            </div>
          </div>
        </div>
      )}

      {/* Learn More - Collapsible */}
      <div className="border-t border-gold/20 pt-4">
        <button
          onClick={() => setShowLearnMore(!showLearnMore)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-body text-gold uppercase tracking-wider">
              How is this calculated?
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gold transition-transform duration-300 ${showLearnMore ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLearnMore && (
          <div className="mt-4 space-y-4 animate-fade-in-up">
            {/* Training Load Calculation */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                Training Load Calculation
              </h4>
              <p className="text-sm text-muted font-body mb-3">
                Training Load is calculated by weighting time spent in each heart rate zone by its intensity:
              </p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-body mb-3">
                <div className="p-2 bg-zone-1/20 border border-zone-1/30">
                  <div className="text-zone-1 font-display">Z1</div>
                  <div className="text-muted">×1.0</div>
                </div>
                <div className="p-2 bg-zone-2/20 border border-zone-2/30">
                  <div className="text-zone-2 font-display">Z2</div>
                  <div className="text-muted">×1.5</div>
                </div>
                <div className="p-2 bg-zone-3/20 border border-zone-3/30">
                  <div className="text-zone-3 font-display">Z3</div>
                  <div className="text-muted">×2.0</div>
                </div>
                <div className="p-2 bg-zone-4/20 border border-zone-4/30">
                  <div className="text-zone-4 font-display">Z4</div>
                  <div className="text-muted">×3.0</div>
                </div>
                <div className="p-2 bg-zone-5/20 border border-zone-5/30">
                  <div className="text-zone-5 font-display">Z5</div>
                  <div className="text-muted">×4.0</div>
                </div>
              </div>
              <p className="text-xs text-muted/70 font-body">
                Example: 30 min in Zone 2 + 30 min in Zone 4 = (30×1.5) + (30×3) = <strong className="text-foreground">135 load units</strong>
              </p>
            </div>

            {/* Acute vs Chronic */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                Acute vs Chronic Load
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-body">
                <div>
                  <div className="text-foreground font-semibold mb-1">Acute Load (Fatigue)</div>
                  <p className="text-muted text-xs">
                    Average daily load over the <strong>last 7 days</strong>. Represents your current fatigue and recent training stress.
                  </p>
                </div>
                <div>
                  <div className="text-foreground font-semibold mb-1">Chronic Load (Fitness)</div>
                  <p className="text-muted text-xs">
                    Average daily load over the <strong>last 28 days</strong>. Represents your fitness base - what your body has adapted to.
                  </p>
                </div>
              </div>
            </div>

            {/* The Ratio */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                The Workload Ratio (ACWR)
              </h4>
              <p className="text-sm text-muted font-body mb-3">
                The Acute:Chronic Workload Ratio compares recent effort to your baseline fitness:
              </p>
              <div className="space-y-2 text-sm font-body">
                <div className="flex items-center gap-3 p-2 bg-blue-500/10 border border-blue-500/20">
                  <div className="text-blue-400 font-display w-20">{"< 0.8"}</div>
                  <div className="text-muted">Undertraining - You&apos;re doing less than your body is used to</div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-green-500/10 border border-green-500/20">
                  <div className="text-green-400 font-display w-20">0.8 - 1.8</div>
                  <div className="text-muted">Optimal - Sweet spot for building fitness safely</div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-yellow-400 font-display w-20">1.8 - 2.2</div>
                  <div className="text-muted">Overreaching - Pushing hard, monitor for fatigue</div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-red-500/10 border border-red-500/20">
                  <div className="text-red-400 font-display w-20">{"> 2.2"}</div>
                  <div className="text-muted">High Risk - Significantly more than usual, injury risk increases</div>
                </div>
              </div>
              <p className="text-xs text-muted/70 font-body mt-3 pt-3 border-t border-gold/10">
                <strong className="text-gold/70">Note:</strong> These thresholds are adjusted for Ironman 70.3 training. Endurance athletes typically sustain higher ratios than general research suggests (0.8-1.3 for general population).
              </p>
            </div>

            {/* Sources */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                Scientific Background
              </h4>
              <p className="text-xs text-muted font-body mb-3">
                This model is based on the Acute:Chronic Workload Ratio (ACWR), widely used in sports science to monitor training load and injury risk.
              </p>
              <div className="space-y-2 text-xs text-muted/70 font-body">
                <p>
                  <strong className="text-muted">Key Research:</strong> Gabbett, T.J. (2016). &quot;The training-injury prevention paradox: should athletes be training smarter and harder?&quot; <em>British Journal of Sports Medicine</em>.
                </p>
                <p>
                  <strong className="text-muted">Similar to:</strong> Training Peaks&apos; ATL (Acute Training Load) and CTL (Chronic Training Load) metrics used by professional athletes.
                </p>
                <p className="pt-2 border-t border-gold/10">
                  <strong className="text-gold/70">Note:</strong> While research supports the ACWR concept, optimal ratios can vary by sport and individual. Use this as a guide, not an absolute rule.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
