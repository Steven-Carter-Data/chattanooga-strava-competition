'use client';

import { useEffect, useState } from 'react';

interface RadarData {
  hasData: boolean;
  rawStats?: {
    totalPoints: number;
    totalTime: number;
    totalDistance: number;
    activityCount: number;
    activeDays: number;
    consistency: number;
    intensity: number;
    highZoneRatio: number;
    enduranceRatio: number;
    variety: number;
    volumePerWeek: number;
  };
  normalized?: {
    volume: number;
    intensity: number;
    consistency: number;
    endurance: number;
    power: number;
    variety: number;
  };
  dimensions?: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

// Get qualitative rating based on normalized score
function getQualitativeRating(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Strong', color: 'text-green-500' };
  if (score >= 50) return { label: 'Good', color: 'text-blue-500' };
  if (score >= 25) return { label: 'Building', color: 'text-yellow-500' };
  return { label: 'Needs Work', color: 'text-red-500' };
}

// Detailed metric explanations
const metricExplanations: Record<string, {
  what: string;
  calculation: string;
  goodScore: string;
  benchmark: string;
}> = {
  volume: {
    what: 'Total weekly training hours averaged across your active period',
    calculation: 'Total training time ÷ weeks active',
    goodScore: '10+ hours/week = 100',
    benchmark: 'Elite 70.3 athletes typically train 15-20+ hrs/week; recreational athletes 6-10 hrs/week',
  },
  intensity: {
    what: 'How hard you train on average, measured by zone points earned per minute',
    calculation: 'Total zone points ÷ total training minutes',
    goodScore: '3+ points/minute = 100',
    benchmark: 'Higher = more time in elevated HR zones; Zone 2-focused training typically scores 1.5-2.5',
  },
  consistency: {
    what: 'How regularly you train (percentage of days with activities)',
    calculation: 'Days with activities ÷ total days in period × 100',
    goodScore: '66%+ active days = 100',
    benchmark: 'Training 4-5 days/week = ~60-70% consistency',
  },
  endurance: {
    what: 'Proportion of training time spent in Zone 2 (aerobic base building)',
    calculation: 'Zone 2 time ÷ total HR zone time × 100',
    goodScore: '66%+ Zone 2 time = 100',
    benchmark: '80/20 rule: elite athletes spend 80% in Z1-Z2, 20% in Z3+',
  },
  power: {
    what: 'High-intensity training focus (time in Zone 4 and Zone 5)',
    calculation: '(Zone 4 + Zone 5 time) ÷ total HR zone time × 100',
    goodScore: '33%+ high zone time = 100',
    benchmark: 'For 70.3 racing, 10-20% high zone work is typical during build phase',
  },
  variety: {
    what: 'Number of different sport types in your training',
    calculation: 'Count of unique sport types',
    goodScore: '5+ sports = 100',
    benchmark: 'Core triathlon = 3 (swim, bike, run); cross-training adds strength, yoga, etc.',
  },
};

export default function AthleteRadarChart({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/stats-radar`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch radar data:', err);
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

  if (!data || !data.hasData || !data.normalized || !data.dimensions) {
    return null;
  }

  const { normalized, dimensions, rawStats } = data;

  // SVG radar chart dimensions
  const size = 280;
  const center = size / 2;
  const maxRadius = size / 2 - 40;

  // Calculate points for the radar polygon
  const numAxes = dimensions.length;
  const angleStep = (2 * Math.PI) / numAxes;

  const getPoint = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const radarPoints = dimensions.map((dim, idx) => {
    const value = normalized[dim.key as keyof typeof normalized] || 0;
    return getPoint(value, idx);
  });

  const polygonPath = radarPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  // Grid circles
  const gridLevels = [20, 40, 60, 80, 100];

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
            Training Profile
          </h3>
          <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
            Multi-Dimensional Analysis
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center">
        {/* Radar Chart */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="overflow-visible">
            {/* Grid circles */}
            {gridLevels.map((level) => {
              const radius = (level / 100) * maxRadius;
              return (
                <circle
                  key={level}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="var(--gold)"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                />
              );
            })}

            {/* Axis lines */}
            {dimensions.map((_, idx) => {
              const endPoint = getPoint(100, idx);
              return (
                <line
                  key={idx}
                  x1={center}
                  y1={center}
                  x2={endPoint.x}
                  y2={endPoint.y}
                  stroke="var(--gold)"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              );
            })}

            {/* Radar polygon fill */}
            <path
              d={polygonPath}
              fill="url(#radarGradient)"
              stroke="var(--gold)"
              strokeWidth={2}
              className="transition-all duration-500"
            />

            {/* Gradient definition */}
            <defs>
              <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.1} />
              </radialGradient>
            </defs>

            {/* Data points */}
            {radarPoints.map((point, idx) => {
              const dim = dimensions[idx];
              const isHovered = hoveredDimension === dim.key;
              return (
                <g key={idx}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isHovered ? 8 : 5}
                    fill="var(--gold)"
                    stroke="var(--background)"
                    strokeWidth={2}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredDimension(dim.key)}
                    onMouseLeave={() => setHoveredDimension(null)}
                  />
                </g>
              );
            })}

            {/* Labels */}
            {dimensions.map((dim, idx) => {
              const labelPoint = getPoint(120, idx);
              const isHovered = hoveredDimension === dim.key;
              return (
                <text
                  key={idx}
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-body text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isHovered ? 'fill-gold' : 'fill-muted'
                  }`}
                  onMouseEnter={() => setHoveredDimension(dim.key)}
                  onMouseLeave={() => setHoveredDimension(null)}
                >
                  {dim.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Stats List */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          {dimensions.map((dim) => {
            const value = normalized[dim.key as keyof typeof normalized] || 0;
            const isHovered = hoveredDimension === dim.key;
            const rating = getQualitativeRating(value);
            return (
              <div
                key={dim.key}
                className={`bg-background border p-3 transition-all duration-300 cursor-pointer ${
                  isHovered ? 'border-gold bg-gold/5' : 'border-gold/20 hover:border-gold/40'
                }`}
                onMouseEnter={() => setHoveredDimension(dim.key)}
                onMouseLeave={() => setHoveredDimension(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted font-body uppercase tracking-wider">{dim.label}</span>
                  <span className={`text-lg font-display ${isHovered ? 'gradient-text' : 'text-foreground'}`}>
                    {Math.round(value)}
                  </span>
                </div>
                {/* Qualitative rating */}
                <div className={`text-xs font-body uppercase tracking-wider mb-2 ${rating.color}`}>
                  {rating.label}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-background border border-gold/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="text-xs text-muted/60 font-body mt-1">{dim.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Stats Summary */}
      {rawStats && (
        <div className="mt-6 pt-6 border-t border-gold/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-display gradient-text">{rawStats.activityCount}</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Activities</div>
            </div>
            <div>
              <div className="text-xl font-display text-foreground">{rawStats.activeDays}</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Active Days</div>
            </div>
            <div>
              <div className="text-xl font-display text-foreground">{rawStats.volumePerWeek.toFixed(1)}h</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Hrs/Week</div>
            </div>
            <div>
              <div className="text-xl font-display text-foreground">{rawStats.variety}</div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">Sports</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Metrics Explained - Collapsible */}
      <div className="border-t border-gold/20 pt-4 mt-6">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-body text-gold uppercase tracking-wider">
              Understanding Your Profile
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gold transition-transform duration-300 ${showExplanation ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showExplanation && (
          <div className="mt-4 space-y-4 animate-fade-in-up">
            {/* Rating Scale Legend */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                Score Rating Scale
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500"></div>
                  <span className="text-xs font-body text-foreground">Strong (75-100)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500"></div>
                  <span className="text-xs font-body text-foreground">Good (50-74)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500"></div>
                  <span className="text-xs font-body text-foreground">Building (25-49)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500"></div>
                  <span className="text-xs font-body text-foreground">Needs Work (0-24)</span>
                </div>
              </div>
            </div>

            {/* Metric Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dimensions.map((dim) => {
                const explanation = metricExplanations[dim.key];
                const value = normalized[dim.key as keyof typeof normalized] || 0;
                const rating = getQualitativeRating(value);

                // Get raw value for context
                let rawValue = '';
                if (rawStats) {
                  switch (dim.key) {
                    case 'volume':
                      rawValue = `${rawStats.volumePerWeek.toFixed(1)} hrs/week`;
                      break;
                    case 'intensity':
                      rawValue = `${rawStats.intensity.toFixed(2)} pts/min`;
                      break;
                    case 'consistency':
                      rawValue = `${rawStats.consistency.toFixed(0)}% active days`;
                      break;
                    case 'endurance':
                      rawValue = `${rawStats.enduranceRatio.toFixed(0)}% Zone 2`;
                      break;
                    case 'power':
                      rawValue = `${rawStats.highZoneRatio.toFixed(0)}% Z4+Z5`;
                      break;
                    case 'variety':
                      rawValue = `${rawStats.variety} sports`;
                      break;
                  }
                }

                return (
                  <div key={dim.key} className="bg-background border border-gold/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-display text-gold uppercase tracking-wider">
                        {dim.label}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-body uppercase ${rating.color}`}>{rating.label}</span>
                        <span className="text-lg font-display text-foreground">{Math.round(value)}</span>
                      </div>
                    </div>

                    {/* Your actual value */}
                    {rawValue && (
                      <div className="mb-3 px-2 py-1 bg-gold/5 border-l-2 border-gold">
                        <span className="text-xs text-muted font-body">Your stats: </span>
                        <span className="text-xs text-foreground font-body">{rawValue}</span>
                      </div>
                    )}

                    {explanation && (
                      <div className="space-y-2 text-xs font-body">
                        <div>
                          <span className="text-muted">What it measures: </span>
                          <span className="text-foreground/80">{explanation.what}</span>
                        </div>
                        <div>
                          <span className="text-muted">Max score: </span>
                          <span className="text-foreground/80">{explanation.goodScore}</span>
                        </div>
                        <div className="pt-2 border-t border-gold/10">
                          <span className="text-gold/70">Benchmark: </span>
                          <span className="text-muted">{explanation.benchmark}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* How to read the radar chart */}
            <div className="bg-background border border-gold/20 p-4">
              <h4 className="text-sm font-display text-gold mb-3 uppercase tracking-wider">
                How to Read Your Profile
              </h4>
              <div className="space-y-2 text-xs font-body text-foreground/80">
                <p>
                  The radar chart shows 6 dimensions of your training on a 0-100 scale.
                  A larger, more balanced shape indicates well-rounded training.
                </p>
                <p>
                  <strong className="text-gold">Balanced profile:</strong> All metrics between 40-80 suggests
                  healthy training variety without overemphasis in any area.
                </p>
                <p>
                  <strong className="text-gold">Specialist profile:</strong> Very high scores in some areas with
                  lower scores in others may indicate targeted training focus.
                </p>
                <p className="text-muted/70 pt-2 border-t border-gold/10">
                  <strong>Note:</strong> These metrics describe your training patterns, not performance predictions.
                  Use them to identify areas to develop, but remember that optimal profiles vary by athlete
                  and training phase.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
