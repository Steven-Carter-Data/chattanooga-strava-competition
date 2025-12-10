'use client';

import { useEffect, useState } from 'react';

interface SportData {
  time: number;
  distance: number;
  activities: number;
  points: number;
}

interface TrainingInsightsData {
  hasData: boolean;
  sportBalance: {
    swim: SportData;
    bike: SportData;
    bikeIndoor: SportData;
    run: SportData;
    other: SportData;
    percentages: { swim: number; bike: number; bikeIndoor: number; bikeCombined: number; run: number };
    idealDistribution: { swim: number; bike: number; run: number };
    balanceScore: number;
  };
  raceReadiness: {
    score: number;
    level: 'excellent' | 'good' | 'building' | 'needs_work';
    message: string;
    daysToRace: number;
    weeksToRace: number;
    raceDate: string;
    factors: {
      volume: { score: number; weight: number; chronicLoad: number };
      balance: { score: number; weight: number };
      consistency: { score: number; weight: number; activeDays: number };
      recovery: { score: number; weight: number; acwr: string };
      intensity: { score: number; weight: number; ratio: string };
    };
    recommendations: string[];
  };
  totals: {
    activities: number;
    triathlonActivities: number;
    totalTime: number;
    totalDistance: number;
  };
}

const levelColors = {
  excellent: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-500' },
  good: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' },
  building: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-500' },
  needs_work: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-500' },
};

const levelLabels = {
  excellent: 'Race Ready',
  good: 'On Track',
  building: 'Building Base',
  needs_work: 'Ramp Up',
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 100) {
    return `${Math.round(km)} km`;
  }
  return `${km.toFixed(1)} km`;
}

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

// SVG Pie Chart Component
function PieChart({
  swim,
  bikeOutdoor,
  bikeIndoor,
  run,
}: {
  swim: number;
  bikeOutdoor: number;
  bikeIndoor: number;
  run: number;
}) {
  const total = swim + bikeOutdoor + bikeIndoor + run;
  if (total === 0) return null;

  const swimPercent = (swim / total) * 100;
  const bikeOutdoorPercent = (bikeOutdoor / total) * 100;
  const bikeIndoorPercent = (bikeIndoor / total) * 100;
  const runPercent = (run / total) * 100;

  // Calculate stroke-dasharray for each segment
  const circumference = 2 * Math.PI * 40; // radius = 40

  const swimDash = (swimPercent / 100) * circumference;
  const bikeOutdoorDash = (bikeOutdoorPercent / 100) * circumference;
  const bikeIndoorDash = (bikeIndoorPercent / 100) * circumference;
  const runDash = (runPercent / 100) * circumference;

  // Calculate rotation offsets (segments go: swim -> bike outdoor -> bike indoor -> run)
  const swimOffset = 0;
  const bikeOutdoorOffset = swimDash;
  const bikeIndoorOffset = swimDash + bikeOutdoorDash;
  const runOffset = swimDash + bikeOutdoorDash + bikeIndoorDash;

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="20"
          strokeOpacity="0.1"
        />

        {/* Swim segment (blue) */}
        {swimPercent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="20"
            strokeDasharray={`${swimDash} ${circumference}`}
            strokeDashoffset={-swimOffset}
            className="transition-all duration-500"
          />
        )}

        {/* Bike Outdoor segment (amber/gold) */}
        {bikeOutdoorPercent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="20"
            strokeDasharray={`${bikeOutdoorDash} ${circumference}`}
            strokeDashoffset={-bikeOutdoorOffset}
            className="transition-all duration-500"
          />
        )}

        {/* Bike Indoor/Trainer segment (darker orange) */}
        {bikeIndoorPercent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#EA580C"
            strokeWidth="20"
            strokeDasharray={`${bikeIndoorDash} ${circumference}`}
            strokeDashoffset={-bikeIndoorOffset}
            className="transition-all duration-500"
          />
        )}

        {/* Run segment (green) */}
        {runPercent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#22C55E"
            strokeWidth="20"
            strokeDasharray={`${runDash} ${circumference}`}
            strokeDashoffset={-runOffset}
            className="transition-all duration-500"
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display text-foreground">{total > 0 ? '100%' : '0%'}</span>
        <span className="text-xs text-muted font-body uppercase tracking-wider">Tri Training</span>
      </div>
    </div>
  );
}

// Readiness gauge component
function ReadinessGauge({ score, level }: { score: number; level: string }) {
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-48 h-24 mx-auto">
      <svg viewBox="0 0 100 50" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
          strokeOpacity="0.2"
          strokeLinecap="round"
        />

        {/* Colored segments */}
        <path
          d="M 5 50 A 45 45 0 0 1 27.5 12.5"
          fill="none"
          stroke="#EF4444"
          strokeWidth="8"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M 27.5 12.5 A 45 45 0 0 1 50 5"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="8"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M 50 5 A 45 45 0 0 1 72.5 12.5"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="8"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M 72.5 12.5 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="#22C55E"
          strokeWidth="8"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />

        {/* Needle */}
        <g transform={`rotate(${rotation} 50 50)`}>
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="12"
            stroke="var(--gold)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="4" fill="var(--gold)" />
        </g>
      </svg>

      {/* Score display */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-3xl font-display gradient-text">{score}</div>
        <div className="text-xs text-muted font-body uppercase tracking-wider">/ 100</div>
      </div>
    </div>
  );
}

export default function TrainingInsights({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<TrainingInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFactors, setShowFactors] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/training-insights`);
        const result = await response.json();

        if (result.success && result.data.hasData) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch training insights:', err);
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

  const { sportBalance, raceReadiness, totals } = data;
  const levelStyle = levelColors[raceReadiness.level];

  return (
    <div className="card p-4 sm:p-6 mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
            Training Insights
          </h3>
          <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
            70.3 Race Preparation Analysis
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Sport Balance Section */}
        <div className="bg-background border border-gold/20 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-display text-gold uppercase tracking-wider">
              Sport Balance
            </h4>
            <Tooltip
              content={
                <div>
                  <div className="font-display text-gold mb-2">Triathlon Training Balance</div>
                  <p className="text-muted text-xs mb-2">
                    Shows how your training time is distributed across swim, bike, and run.
                  </p>
                  <p className="text-muted text-xs">
                    <strong>Ideal 70.3 split:</strong> ~18% swim, ~55% bike, ~27% run (based on typical race time ratios)
                  </p>
                </div>
              }
            >
              <span className="text-xs text-muted flex items-center gap-1 cursor-help">
                Balance Score: <span className="text-gold font-display">{sportBalance.balanceScore}%</span>
                <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </Tooltip>
          </div>

          {/* Pie Chart */}
          <div className="w-40 h-40 mx-auto mb-4">
            <PieChart
              swim={sportBalance.percentages.swim}
              bikeOutdoor={sportBalance.percentages.bike}
              bikeIndoor={sportBalance.percentages.bikeIndoor}
              run={sportBalance.percentages.run}
            />
          </div>

          {/* Legend with stats */}
          <div className="space-y-2">
            {/* Swim */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500"></div>
                <span className="text-sm font-body text-foreground">Swim</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-display text-foreground">{sportBalance.percentages.swim.toFixed(0)}%</span>
                <span className="text-xs text-muted ml-2">({formatTime(sportBalance.swim.time)})</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted/70 pl-5 mb-2">
              <span>{sportBalance.swim.activities} activities</span>
              <span className="mx-2">•</span>
              <span>{formatDistance(sportBalance.swim.distance)}</span>
              <span className="ml-auto text-gold/50">ideal: {sportBalance.idealDistribution.swim}%</span>
            </div>

            {/* Bike Outdoor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500"></div>
                <span className="text-sm font-body text-foreground">Bike (Outdoor)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-display text-foreground">{sportBalance.percentages.bike.toFixed(0)}%</span>
                <span className="text-xs text-muted ml-2">({formatTime(sportBalance.bike.time)})</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted/70 pl-5 mb-2">
              <span>{sportBalance.bike.activities} activities</span>
              <span className="mx-2">•</span>
              <span>{formatDistance(sportBalance.bike.distance)}</span>
            </div>

            {/* Bike Indoor/Trainer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-600"></div>
                <span className="text-sm font-body text-foreground">Bike (Trainer)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-display text-foreground">{sportBalance.percentages.bikeIndoor.toFixed(0)}%</span>
                <span className="text-xs text-muted ml-2">({formatTime(sportBalance.bikeIndoor.time)})</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted/70 pl-5 mb-2">
              <span>{sportBalance.bikeIndoor.activities} activities</span>
              <span className="mx-2">•</span>
              <span>{formatDistance(sportBalance.bikeIndoor.distance)}</span>
              <span className="ml-auto text-gold/50">bike ideal: {sportBalance.idealDistribution.bike}%</span>
            </div>

            {/* Run */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500"></div>
                <span className="text-sm font-body text-foreground">Run</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-display text-foreground">{sportBalance.percentages.run.toFixed(0)}%</span>
                <span className="text-xs text-muted ml-2">({formatTime(sportBalance.run.time)})</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted/70 pl-5">
              <span>{sportBalance.run.activities} activities</span>
              <span className="mx-2">•</span>
              <span>{formatDistance(sportBalance.run.distance)}</span>
              <span className="ml-auto text-gold/50">ideal: {sportBalance.idealDistribution.run}%</span>
            </div>
          </div>

          {/* Other activities note */}
          {sportBalance.other.activities > 0 && (
            <div className="mt-4 pt-4 border-t border-gold/10 text-xs text-muted">
              + {sportBalance.other.activities} other activities ({formatTime(sportBalance.other.time)})
            </div>
          )}
        </div>

        {/* Race Readiness Section */}
        <div className="bg-background border border-gold/20 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-display text-gold uppercase tracking-wider">
              Race Readiness
            </h4>
            <Tooltip
              content={
                <div>
                  <div className="font-display text-gold mb-2">Predicted Race Readiness</div>
                  <p className="text-muted text-xs mb-2">
                    Estimates your preparedness for race day based on training volume, consistency, sport balance, recovery status, and intensity mix.
                  </p>
                  <p className="text-muted text-xs">
                    This is a guide, not a guarantee. Listen to your body and adjust as needed.
                  </p>
                </div>
              }
            >
              <span className="text-xs text-muted flex items-center gap-1 cursor-help">
                <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </Tooltip>
          </div>

          {/* Readiness Gauge */}
          <ReadinessGauge score={raceReadiness.score} level={raceReadiness.level} />

          {/* Status */}
          <div className={`${levelStyle.bg} border ${levelStyle.border} p-3 mt-4 text-center`}>
            <span className={`text-lg font-display ${levelStyle.text} uppercase tracking-wider`}>
              {levelLabels[raceReadiness.level]}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-foreground/80 font-body text-center mt-3">
            {raceReadiness.message}
          </p>

          {/* Countdown */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-background/50 border border-gold/10 p-3 text-center">
              <div className="text-2xl font-display gradient-text">{raceReadiness.daysToRace}</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Days to Race</div>
            </div>
            <div className="bg-background/50 border border-gold/10 p-3 text-center">
              <div className="text-2xl font-display text-foreground">{raceReadiness.weeksToRace}</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Weeks to Race</div>
            </div>
          </div>

          {/* Race Date */}
          <div className="text-center mt-3 text-xs text-muted font-body">
            70.3 Chattanooga: {new Date(raceReadiness.raceDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Readiness Factors - Collapsible */}
      <div className="border-t border-gold/20 pt-4">
        <button
          onClick={() => setShowFactors(!showFactors)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-body text-gold uppercase tracking-wider">
              Readiness Breakdown
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gold transition-transform duration-300 ${showFactors ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFactors && (
          <div className="mt-4 space-y-4 animate-fade-in-up">
            {/* Factors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Volume */}
              <div className="bg-background border border-gold/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase">Volume</span>
                  <span className="text-xs text-gold/50">{raceReadiness.factors.volume.weight}%</span>
                </div>
                <div className="text-xl font-display text-foreground">{raceReadiness.factors.volume.score}</div>
                <div className="text-xs text-muted mt-1">Chronic: {raceReadiness.factors.volume.chronicLoad}</div>
                <div className="h-1 bg-gold/10 mt-2">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${raceReadiness.factors.volume.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Balance */}
              <div className="bg-background border border-gold/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase">Balance</span>
                  <span className="text-xs text-gold/50">{raceReadiness.factors.balance.weight}%</span>
                </div>
                <div className="text-xl font-display text-foreground">{raceReadiness.factors.balance.score}</div>
                <div className="text-xs text-muted mt-1">Sport mix</div>
                <div className="h-1 bg-gold/10 mt-2">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${raceReadiness.factors.balance.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Consistency */}
              <div className="bg-background border border-gold/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase">Consistency</span>
                  <span className="text-xs text-gold/50">{raceReadiness.factors.consistency.weight}%</span>
                </div>
                <div className="text-xl font-display text-foreground">{raceReadiness.factors.consistency.score}</div>
                <div className="text-xs text-muted mt-1">{raceReadiness.factors.consistency.activeDays} days / 28</div>
                <div className="h-1 bg-gold/10 mt-2">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${raceReadiness.factors.consistency.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Recovery */}
              <div className="bg-background border border-gold/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase">Recovery</span>
                  <span className="text-xs text-gold/50">{raceReadiness.factors.recovery.weight}%</span>
                </div>
                <div className="text-xl font-display text-foreground">{raceReadiness.factors.recovery.score}</div>
                <div className="text-xs text-muted mt-1">ACWR: {raceReadiness.factors.recovery.acwr}</div>
                <div className="h-1 bg-gold/10 mt-2">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${raceReadiness.factors.recovery.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Intensity */}
              <div className="bg-background border border-gold/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase">Intensity</span>
                  <span className="text-xs text-gold/50">{raceReadiness.factors.intensity.weight}%</span>
                </div>
                <div className="text-xl font-display text-foreground">{raceReadiness.factors.intensity.score}</div>
                <div className="text-xs text-muted mt-1">High zone: {raceReadiness.factors.intensity.ratio}%</div>
                <div className="h-1 bg-gold/10 mt-2">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${raceReadiness.factors.intensity.score}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {raceReadiness.recommendations.length > 0 && (
              <div className="bg-background border border-gold/20 p-4">
                <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {raceReadiness.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground/80 font-body">
                      <span className="text-gold mt-1">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* How it works */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                How Race Readiness is Calculated
              </h4>
              <p className="text-xs text-muted font-body mb-3">
                Your race readiness score is a weighted combination of five key training factors:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-body">
                <div className="flex justify-between">
                  <span className="text-muted">Training Volume</span>
                  <span className="text-foreground">30% weight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Sport Balance</span>
                  <span className="text-foreground">20% weight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Consistency</span>
                  <span className="text-foreground">25% weight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Recovery Status (ACWR)</span>
                  <span className="text-foreground">15% weight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Intensity Mix</span>
                  <span className="text-foreground">10% weight</span>
                </div>
              </div>
              <p className="text-xs text-muted/70 font-body mt-3 pt-3 border-t border-gold/10">
                <strong className="text-gold/70">Note:</strong> This is an estimate based on training data. Factors like nutrition, sleep, race experience, and course familiarity also significantly impact race-day performance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
