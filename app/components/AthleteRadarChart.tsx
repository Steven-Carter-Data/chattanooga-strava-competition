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

export default function AthleteRadarChart({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);

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
            return (
              <div
                key={dim.key}
                className={`bg-background border p-3 transition-all duration-300 cursor-pointer ${
                  isHovered ? 'border-gold bg-gold/5' : 'border-gold/20 hover:border-gold/40'
                }`}
                onMouseEnter={() => setHoveredDimension(dim.key)}
                onMouseLeave={() => setHoveredDimension(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-body uppercase tracking-wider">{dim.label}</span>
                  <span className={`text-lg font-display ${isHovered ? 'gradient-text' : 'text-foreground'}`}>
                    {Math.round(value)}
                  </span>
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
    </div>
  );
}
