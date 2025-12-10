'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AthleteData {
  athlete: {
    id: string;
    firstname: string;
    lastname: string;
    profile_image_url: string | null;
  };
  stats: {
    totalPoints: number;
    activityCount: number;
    totalDistance: number;
    totalTime: number;
    avgPointsPerWeek: number;
    avgPointsPerActivity: number;
    activeDays: number;
    consistency: number;
    highZoneRatio: number;
  };
  zoneDistribution: {
    zone_1: number;
    zone_2: number;
    zone_3: number;
    zone_4: number;
    zone_5: number;
  };
  sportBreakdown: Record<string, { count: number; points: number; distance: number; time: number }>;
  sportCount: number;
}

interface ComparisonData {
  athlete1: AthleteData;
  athlete2: AthleteData;
  comparison: {
    metrics: Array<{
      key: string;
      label: string;
      format: string;
      athlete1Value: number;
      athlete2Value: number;
      winner: number | null;
      diffPercent: number;
    }>;
    athlete1Wins: number;
    athlete2Wins: number;
    overallLeader: number | null;
  };
}

interface SimpleAthlete {
  id: string;
  firstname: string;
  lastname: string;
  profile_image_url: string | null;
}

// Zone colors
const zoneColors = [
  { bg: 'bg-zone-1', text: 'text-zone-1' },
  { bg: 'bg-zone-2', text: 'text-zone-2' },
  { bg: 'bg-zone-3', text: 'text-zone-3' },
  { bg: 'bg-zone-4', text: 'text-zone-4' },
  { bg: 'bg-zone-5', text: 'text-zone-5' },
];

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'number':
      return value.toFixed(0);
    case 'decimal':
      return value.toFixed(1);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'distance':
      return `${(value / 1609.34).toFixed(1)} mi`;
    case 'time':
      const hours = Math.floor(value / 3600);
      const mins = Math.floor((value % 3600) / 60);
      return `${hours}h ${mins}m`;
    default:
      return value.toString();
  }
}

function formatSportType(sport: string): string {
  return sport.replace(/([A-Z])/g, ' $1').trim();
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [athletes, setAthletes] = useState<SimpleAthlete[]>([]);
  const [selectedAthlete1, setSelectedAthlete1] = useState<string>('');
  const [selectedAthlete2, setSelectedAthlete2] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available athletes
  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        if (result.success) {
          setAthletes(result.data);
          // Pre-select from URL params if available
          const urlAthletes = searchParams.get('athletes')?.split(',');
          if (urlAthletes && urlAthletes.length === 2) {
            setSelectedAthlete1(urlAthletes[0]);
            setSelectedAthlete2(urlAthletes[1]);
          } else if (result.data.length >= 2) {
            setSelectedAthlete1(result.data[0].athlete_id);
            setSelectedAthlete2(result.data[1].athlete_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch athletes:', err);
      }
    }
    fetchAthletes();
  }, [searchParams]);

  // Fetch comparison data when athletes are selected
  useEffect(() => {
    if (!selectedAthlete1 || !selectedAthlete2) return;
    if (selectedAthlete1 === selectedAthlete2) return;

    async function fetchComparison() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/compare?athletes=${selectedAthlete1},${selectedAthlete2}`);
        const result = await response.json();
        if (result.success) {
          setComparisonData(result.data);
        } else {
          setError(result.error || 'Failed to fetch comparison');
        }
      } catch (err) {
        setError('Failed to fetch comparison data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [selectedAthlete1, selectedAthlete2]);

  return (
    <div className="min-h-screen">
      {/* Art Deco Header */}
      <div className="bourbon-hero text-foreground relative overflow-hidden">
        <div className="absolute inset-0 sunburst-bg"></div>
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gold/10"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gold/10"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
          <Link
            href="/"
            className="inline-flex items-center text-muted hover:text-gold mb-6 transition-colors duration-300 font-body uppercase tracking-wider text-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Leaderboard
          </Link>

          <h1 className="text-3xl sm:text-5xl font-display tracking-widest uppercase text-foreground mb-3">
            Compare Athletes
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-12 bg-gold/50"></div>
            <div className="w-2 h-2 border border-gold rotate-45"></div>
            <div className="h-px w-12 bg-gold/50"></div>
          </div>
          <p className="text-muted font-body uppercase tracking-wider">Side-by-Side Performance Analysis</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Athlete Selection */}
        <div className="card p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-body text-muted uppercase tracking-wider mb-2">
                Athlete 1
              </label>
              <select
                value={selectedAthlete1}
                onChange={(e) => setSelectedAthlete1(e.target.value)}
                className="w-full bg-background border border-gold/30 text-foreground font-body p-3 focus:border-gold focus:outline-none"
              >
                <option value="">Select Athlete</option>
                {athletes.map((a) => (
                  <option key={a.id || (a as any).athlete_id} value={a.id || (a as any).athlete_id}>
                    {a.firstname} {a.lastname}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body text-muted uppercase tracking-wider mb-2">
                Athlete 2
              </label>
              <select
                value={selectedAthlete2}
                onChange={(e) => setSelectedAthlete2(e.target.value)}
                className="w-full bg-background border border-gold/30 text-foreground font-body p-3 focus:border-gold focus:outline-none"
              >
                <option value="">Select Athlete</option>
                {athletes.map((a) => (
                  <option key={a.id || (a as any).athlete_id} value={a.id || (a as any).athlete_id}>
                    {a.firstname} {a.lastname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAthlete1 === selectedAthlete2 && selectedAthlete1 && (
            <p className="text-red-500 text-sm font-body mt-4">Please select two different athletes</p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="diamond-frame animate-gold-pulse">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card p-6 text-center">
            <p className="text-red-500 font-body">{error}</p>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonData && !loading && (
          <>
            {/* Athlete Headers with Photos */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[comparisonData.athlete1, comparisonData.athlete2].map((athleteData, idx) => {
                const isWinner = comparisonData.comparison.overallLeader === idx + 1;
                return (
                  <div
                    key={athleteData.athlete.id}
                    className={`card p-4 sm:p-6 text-center ${isWinner ? 'border-gold' : ''}`}
                  >
                    {athleteData.athlete.profile_image_url && (
                      <div className={`mx-auto mb-4 ${isWinner ? 'double-frame' : ''}`}>
                        <div className={isWinner ? 'double-frame-inner' : ''}>
                          <img
                            src={athleteData.athlete.profile_image_url}
                            alt={`${athleteData.athlete.firstname} ${athleteData.athlete.lastname}`}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover mx-auto"
                          />
                        </div>
                      </div>
                    )}
                    <h2 className="text-lg sm:text-2xl font-display text-foreground tracking-wider uppercase">
                      {athleteData.athlete.firstname}
                    </h2>
                    <p className="text-sm text-muted font-body uppercase tracking-wider">
                      {athleteData.athlete.lastname}
                    </p>
                    {isWinner && (
                      <div className="mt-3 inline-block px-3 py-1 bg-gold/20 border border-gold text-gold text-xs font-body uppercase tracking-wider">
                        Leader
                      </div>
                    )}
                    <div className="mt-4 text-3xl sm:text-4xl font-display gradient-text">
                      {athleteData.stats.totalPoints.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted font-body uppercase tracking-wider">Total Points</div>
                  </div>
                );
              })}
            </div>

            {/* Metrics Comparison */}
            <div className="card p-4 sm:p-6 mb-8">
              <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase mb-6">
                Head to Head
              </h3>

              <div className="space-y-4">
                {comparisonData.comparison.metrics.map((metric) => {
                  const total = metric.athlete1Value + metric.athlete2Value;
                  const pct1 = total > 0 ? (metric.athlete1Value / total) * 100 : 50;
                  const pct2 = total > 0 ? (metric.athlete2Value / total) * 100 : 50;

                  return (
                    <div key={metric.key} className="bg-background border border-gold/20 p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-body ${metric.winner === 1 ? 'text-gold font-semibold' : 'text-foreground'}`}>
                          {formatValue(metric.athlete1Value, metric.format)}
                        </span>
                        <span className="text-xs text-muted font-body uppercase tracking-wider">
                          {metric.label}
                        </span>
                        <span className={`text-sm font-body ${metric.winner === 2 ? 'text-gold font-semibold' : 'text-foreground'}`}>
                          {formatValue(metric.athlete2Value, metric.format)}
                        </span>
                      </div>
                      <div className="flex h-2 overflow-hidden">
                        <div
                          className={`transition-all duration-500 ${metric.winner === 1 ? 'bg-gold' : 'bg-gold/40'}`}
                          style={{ width: `${pct1}%` }}
                        />
                        <div className="w-px bg-background"></div>
                        <div
                          className={`transition-all duration-500 ${metric.winner === 2 ? 'bg-gold' : 'bg-gold/40'}`}
                          style={{ width: `${pct2}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Win Count */}
              <div className="mt-6 pt-6 border-t border-gold/20 flex justify-center items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-display text-foreground">{comparisonData.comparison.athlete1Wins}</div>
                  <div className="text-xs text-muted font-body uppercase">Categories Won</div>
                </div>
                <div className="text-2xl font-display text-gold">VS</div>
                <div className="text-center">
                  <div className="text-2xl font-display text-foreground">{comparisonData.comparison.athlete2Wins}</div>
                  <div className="text-xs text-muted font-body uppercase">Categories Won</div>
                </div>
              </div>
            </div>

            {/* Zone Distribution Comparison */}
            <div className="card p-4 sm:p-6 mb-8">
              <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase mb-6">
                HR Zone Distribution
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {[comparisonData.athlete1, comparisonData.athlete2].map((athleteData, idx) => {
                  const totalZoneTime = Object.values(athleteData.zoneDistribution).reduce((sum, t) => sum + t, 0);

                  return (
                    <div key={idx}>
                      <div className="text-sm font-body text-muted mb-3 text-center uppercase tracking-wider">
                        {athleteData.athlete.firstname}
                      </div>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((zone) => {
                          const zoneKey = `zone_${zone}` as keyof typeof athleteData.zoneDistribution;
                          const time = athleteData.zoneDistribution[zoneKey];
                          const pct = totalZoneTime > 0 ? (time / totalZoneTime) * 100 : 0;

                          return (
                            <div key={zone}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={zoneColors[zone - 1].text}>Z{zone}</span>
                                <span className="text-muted">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-background border border-gold/10">
                                <div
                                  className={`h-full ${zoneColors[zone - 1].bg} transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sport Breakdown Comparison */}
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase mb-6">
                Sport Breakdown
              </h3>

              {/* Get all unique sports */}
              {(() => {
                const allSports = new Set([
                  ...Object.keys(comparisonData.athlete1.sportBreakdown),
                  ...Object.keys(comparisonData.athlete2.sportBreakdown),
                ]);

                return (
                  <div className="space-y-4">
                    {Array.from(allSports).map((sport) => {
                      const a1 = comparisonData.athlete1.sportBreakdown[sport];
                      const a2 = comparisonData.athlete2.sportBreakdown[sport];

                      return (
                        <div key={sport} className="bg-background border border-gold/20 p-3 sm:p-4">
                          <div className="text-sm font-display text-gold uppercase tracking-wider mb-3">
                            {formatSportType(sport)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              {a1 ? (
                                <>
                                  <div className="text-lg font-display text-foreground">{a1.points.toFixed(0)}</div>
                                  <div className="text-xs text-muted font-body">{a1.count} activities</div>
                                </>
                              ) : (
                                <div className="text-muted">-</div>
                              )}
                            </div>
                            <div>
                              {a2 ? (
                                <>
                                  <div className="text-lg font-display text-foreground">{a2.points.toFixed(0)}</div>
                                  <div className="text-xs text-muted font-body">{a2.count} activities</div>
                                </>
                              ) : (
                                <div className="text-muted">-</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 bg-card border-t border-gold/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gold/30"></div>
            <div className="w-2 h-2 border border-gold/50 rotate-45"></div>
            <div className="h-px w-12 bg-gold/30"></div>
          </div>
          <p className="text-muted text-sm font-body tracking-wide uppercase">
            Bourbon Chasers • Ironman 70.3 Chattanooga Training
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="diamond-frame animate-gold-pulse">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin"></div>
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
