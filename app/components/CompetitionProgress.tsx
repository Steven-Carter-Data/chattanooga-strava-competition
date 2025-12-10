'use client';

import { useEffect, useState } from 'react';

interface CompetitionData {
  competition: {
    name: string;
    start_date: string;
    end_date: string;
    status: 'upcoming' | 'active' | 'completed';
  };
  timeline: {
    total_days: number;
    days_elapsed: number;
    days_remaining: number;
    days_until_start: number;
    progress_percent: number;
    has_started: boolean;
    has_ended: boolean;
  };
  projections: Array<{
    athlete_id: string;
    firstname: string;
    lastname: string;
    current_points: number;
    points_per_day: number;
    projected_final_points: number;
    activity_count: number;
  }>;
  current_standings: Array<{
    athlete_id: string;
    firstname: string;
    lastname: string;
    current_points: number;
    points_per_day: number;
    projected_final_points: number;
    activity_count: number;
  }>;
}

// Helper function to convert number to Roman numeral
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

export default function CompetitionProgress() {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProjections, setShowProjections] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/competition-progress');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch competition data');
        }
      } catch (err) {
        setError('Failed to fetch competition progress');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card p-6 mb-10">
        <div className="flex items-center justify-center py-8">
          <div className="diamond-frame animate-gold-pulse">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { competition, timeline, projections } = data;

  // Format dates
  const startDate = new Date(competition.start_date);
  const endDate = new Date(competition.end_date);
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="card p-4 sm:p-6 mb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
              Competition Progress
            </h3>
            <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`bourbon-badge text-center ${
          competition.status === 'active' ? 'border-green-500 text-green-500' :
          competition.status === 'completed' ? 'border-muted text-muted' :
          'border-gold text-gold'
        }`}>
          {competition.status === 'active' ? 'In Progress' :
           competition.status === 'completed' ? 'Completed' :
           'Upcoming'}
        </div>
      </div>

      {/* Countdown / Progress Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Main countdown card */}
        <div className="sm:col-span-1 bg-background border border-gold/20 p-4 sm:p-6 text-center">
          {!timeline.has_started ? (
            <>
              <div className="text-4xl sm:text-5xl font-display gradient-text mb-2">
                {timeline.days_until_start}
              </div>
              <div className="text-xs sm:text-sm text-muted font-body uppercase tracking-wider">
                Days Until Start
              </div>
            </>
          ) : timeline.has_ended ? (
            <>
              <div className="text-3xl sm:text-4xl font-display text-muted mb-2">
                Complete
              </div>
              <div className="text-xs sm:text-sm text-muted font-body uppercase tracking-wider">
                Competition Ended
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl sm:text-5xl font-display gradient-text mb-2">
                {timeline.days_remaining}
              </div>
              <div className="text-xs sm:text-sm text-muted font-body uppercase tracking-wider">
                Days Remaining
              </div>
            </>
          )}
        </div>

        {/* Progress stats */}
        <div className="sm:col-span-2 bg-background border border-gold/20 p-4 sm:p-6">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted font-body uppercase tracking-wider">
                Competition Progress
              </span>
              <span className="text-sm font-display gradient-text">
                {timeline.progress_percent}%
              </span>
            </div>
            <div className="h-3 bg-background border border-gold/30 relative overflow-hidden">
              {/* Animated progress fill */}
              <div
                className="h-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${timeline.progress_percent}%`,
                  background: 'linear-gradient(90deg, #D4AF37 0%, #F2E8C4 50%, #D4AF37 100%)',
                }}
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: timeline.has_started && !timeline.has_ended ? 'shimmer 2s infinite' : 'none',
                  }}
                />
              </div>
              {/* Progress markers */}
              <div className="absolute top-0 left-1/4 w-px h-full bg-gold/20"></div>
              <div className="absolute top-0 left-1/2 w-px h-full bg-gold/20"></div>
              <div className="absolute top-0 left-3/4 w-px h-full bg-gold/20"></div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <div className="text-lg sm:text-2xl font-display text-foreground">
                {timeline.days_elapsed}
              </div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">
                Days In
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-display text-foreground">
                {timeline.total_days}
              </div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">
                Total Days
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-display text-foreground">
                {Math.round((timeline.days_elapsed / timeline.total_days) * 13)} / 13
              </div>
              <div className="text-xs text-muted font-body uppercase tracking-wider">
                Weeks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projected Final Standings - Collapsible */}
      {timeline.has_started && projections.length > 0 && (
        <div className="border-t border-gold/20 pt-6">
          <button
            onClick={() => setShowProjections(!showProjections)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm sm:text-base font-display text-foreground tracking-wider uppercase">
                Projected Final Standings
              </span>
              <span className="text-xs text-muted font-body hidden sm:inline">
                (Based on current pace)
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gold transition-transform duration-500 ${showProjections ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProjections && (
            <div className="mt-6 space-y-3 animate-fade-in-up">
              <p className="text-xs text-muted font-body mb-4">
                Projections assume each athlete maintains their current points-per-day pace
              </p>

              {projections.slice(0, 5).map((athlete, index) => {
                const currentRank = data.current_standings.findIndex(a => a.athlete_id === athlete.athlete_id) + 1;
                const projectedRank = index + 1;
                const rankChange = currentRank - projectedRank;

                return (
                  <div
                    key={athlete.athlete_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background border border-gold/20 hover:border-gold/40 transition-all duration-300 gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Projected rank */}
                      <div className={`w-8 h-8 flex items-center justify-center border-2 rotate-45 flex-shrink-0 ${
                        index === 0 ? 'border-gold bg-gold/10' :
                        index === 1 ? 'border-muted bg-muted/10' :
                        index === 2 ? 'border-orange-700 bg-orange-700/10' :
                        'border-gold/30'
                      }`}>
                        <span className={`-rotate-45 font-display text-sm ${
                          index === 0 ? 'text-gold' :
                          index === 1 ? 'text-muted' :
                          index === 2 ? 'text-orange-700' :
                          'text-muted'
                        }`}>
                          {toRoman(index + 1)}
                        </span>
                      </div>

                      <div>
                        <span className="font-body font-semibold text-foreground text-sm sm:text-base">
                          {athlete.firstname} {athlete.lastname}
                        </span>
                        {/* Rank change indicator */}
                        {rankChange !== 0 && (
                          <span className={`ml-2 text-xs font-body ${
                            rankChange > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                          </span>
                        )}
                        <div className="text-xs text-muted font-body mt-0.5">
                          Currently: {toRoman(currentRank)} • {athlete.points_per_day.toFixed(1)} pts/day
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 pl-11 sm:pl-0">
                      {/* Current points */}
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-body text-muted">
                          {athlete.current_points.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted/60 font-body">current</div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-4 h-4 text-gold/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>

                      {/* Projected points */}
                      <div className="text-left sm:text-right">
                        <div className="text-lg sm:text-xl font-display gradient-text">
                          {athlete.projected_final_points.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted font-body">projected</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Disclaimer */}
              <p className="text-xs text-muted/60 font-body italic text-center pt-2">
                Projections are estimates based on current activity levels and may change significantly
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pre-competition message */}
      {!timeline.has_started && (
        <div className="border-t border-gold/20 pt-6 text-center">
          <p className="text-muted font-body">
            The competition begins on <span className="text-gold font-semibold">{formatDate(startDate)}</span>
          </p>
          <p className="text-sm text-muted/70 font-body mt-2">
            Connect your Strava account now to be ready when it starts!
          </p>
        </div>
      )}

      {/* Add shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
