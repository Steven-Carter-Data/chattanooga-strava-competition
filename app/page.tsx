'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { LeaderboardEntry } from '@/lib/types';

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

function HomeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const athleteName = searchParams.get('athlete');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingAthletes, setSyncingAthletes] = useState<Set<string>>(new Set());
  const [syncMessages, setSyncMessages] = useState<Map<string, string>>(new Map());
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const [selectedWeeklyAthlete, setSelectedWeeklyAthlete] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch overall leaderboard
        const leaderboardResponse = await fetch('/api/leaderboard');
        const leaderboardData = await leaderboardResponse.json();
        if (leaderboardData.success) {
          setLeaderboard(leaderboardData.data);
        }

        // Fetch weekly stats
        const weeklyResponse = await fetch('/api/weekly-stats');
        const weeklyData = await weeklyResponse.json();
        if (weeklyData.success) {
          setWeeklyStats(weeklyData.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleSyncAthlete(athleteId: string) {
    setSyncingAthletes(prev => new Set(prev).add(athleteId));
    setSyncMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(athleteId);
      return newMap;
    });

    try {
      const response = await fetch(`/api/sync/${athleteId}`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        setSyncMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(athleteId, `Synced ${result.synced} activities!`);
          return newMap;
        });

        // Refresh leaderboard and weekly stats after 2 seconds
        setTimeout(async () => {
          const leaderboardResponse = await fetch('/api/leaderboard');
          const leaderboardData = await leaderboardResponse.json();
          if (leaderboardData.success) {
            setLeaderboard(leaderboardData.data);
          }

          const weeklyResponse = await fetch('/api/weekly-stats');
          const weeklyData = await weeklyResponse.json();
          if (weeklyData.success) {
            setWeeklyStats(weeklyData.data);
          }

          // Clear message after another 2 seconds
          setTimeout(() => {
            setSyncMessages(prev => {
              const newMap = new Map(prev);
              newMap.delete(athleteId);
              return newMap;
            });
          }, 2000);
        }, 2000);
      } else {
        // Show detailed error information
        const errorMsg = result.details
          ? `${result.error} (${result.details})`
          : result.error;
        setSyncMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(athleteId, `Sync failed: ${errorMsg}`);
          return newMap;
        });
        // Log full error details to console for debugging
        console.error('Sync error details:', result);
      }
    } catch (err) {
      setSyncMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(athleteId, 'Sync failed');
        return newMap;
      });
      console.error(err);
    } finally {
      setSyncingAthletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(athleteId);
        return newSet;
      });
    }
  }

  return (
    <div className="min-h-screen">
      {/* Art Deco Hero Section */}
      <div className="bourbon-hero text-foreground relative overflow-hidden">
        {/* Sunburst effect behind content */}
        <div className="absolute inset-0 sunburst-bg"></div>

        {/* Decorative vertical lines */}
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gold/10"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gold/10"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
          <div className="text-center">
            {/* Badge */}
            <div className="mb-6">
              <span className="bourbon-badge">Est. 2019</span>
            </div>

            {/* Main Title - Art Deco Typography */}
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 tracking-widest uppercase text-foreground">
              Bourbon Chasers
            </h1>

            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 md:w-24 bg-gold/50"></div>
              <div className="w-3 h-3 border border-gold rotate-45"></div>
              <div className="h-px w-16 md:w-24 bg-gold/50"></div>
            </div>

            {/* Logo in double frame */}
            <div className="mb-8 flex justify-center">
              <div className="double-frame inline-block">
                <div className="double-frame-inner">
                  <img
                    src="/images/ironman_chattanooga_logo_2.png"
                    alt="Ironman 70.3 Chattanooga"
                    className="h-20 md:h-28 w-auto"
                  />
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <h2 className="text-xl sm:text-2xl md:text-4xl font-display mb-6 tracking-wider uppercase gradient-text">
              Strava Training Championship
            </h2>

            {/* Competition dates */}
            <p className="text-lg md:text-xl font-body font-semibold mb-3 text-gold tracking-wider uppercase">
              January 1st - March 31st, 2026
            </p>

            {/* Tagline */}
            <p className="mt-6 text-base md:text-lg max-w-xl mx-auto text-muted font-body tracking-wide">
              Train hard, chase bourbon.
            </p>
          </div>
        </div>

        {/* Bottom decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Success/Error Messages */}
        {success === 'auth_complete' && (
          <div className="mb-8 p-6 card border-gold/50">
            <div className="flex items-center">
              <div className="diamond-frame mr-4">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-foreground font-body font-semibold tracking-wide">
                Welcome, {athleteName}! Your Strava account is now connected.
              </p>
            </div>
          </div>
        )}
        {error === 'auth_failed' && (
          <div className="mb-8 p-6 card border-red-500/50">
            <div className="flex items-center">
              <div className="diamond-frame mr-4 border-red-500/50">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-foreground font-body font-semibold tracking-wide">
                Authentication failed. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Connect with Strava - Compact Section */}
        <div className="card p-4 mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <span className="text-muted font-body text-sm">Connect here Bourbon Chaser. This will only need to be completed once.</span>
              <a href="/api/auth/strava" className="btn-small inline-flex items-center whitespace-nowrap">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Connect with Strava
              </a>
            </div>
            <div className="flex items-center text-xs text-muted/70 font-body tracking-wide">
              <svg className="w-4 h-4 mr-1.5 text-gold/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure OAuth
            </div>
          </div>
        </div>

        {/* Scoring Information - Collapsible */}
        <div className="card p-6 mb-10">
          <button
            onClick={() => setShowScoringInfo(!showScoringInfo)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="diamond-frame">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-display text-foreground tracking-wider uppercase">
                How Points Are Calculated
              </h3>
            </div>
            <svg
              className={`w-6 h-6 text-gold transition-transform duration-500 ${showScoringInfo ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showScoringInfo && (
            <div className="mt-8 pt-6 border-t border-gold/20">
              <div className="space-y-8">
                {/* Zone-Based Scoring */}
                <div>
                  <h4 className="text-lg font-display text-gold mb-4 tracking-wider uppercase">
                    Zone-Based Scoring
                  </h4>
                  <p className="text-muted mb-6 font-body leading-relaxed">
                    Points are earned based on time spent in each heart rate zone during your activities.
                    The higher the zone, the more points per minute you earn.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {[
                      { zone: 'I', points: '1', color: 'zone-1' },
                      { zone: 'II', points: '2', color: 'zone-2' },
                      { zone: 'III', points: '3', color: 'zone-3' },
                      { zone: 'IV', points: '4', color: 'zone-4' },
                      { zone: 'V', points: '5', color: 'zone-5' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-background border border-gold/20 p-3 sm:p-4 text-center group hover:border-gold/50 transition-all duration-300">
                        <div className={`text-sm sm:text-lg font-display mb-1 sm:mb-2 ${
                          idx === 0 ? 'text-zone-1' :
                          idx === 1 ? 'text-zone-2' :
                          idx === 2 ? 'text-zone-3' :
                          idx === 3 ? 'text-zone-4' : 'text-zone-5'
                        }`}>
                          Zone {item.zone}
                        </div>
                        <div className="text-2xl sm:text-3xl font-display gradient-text">{item.points}</div>
                        <div className="text-xs text-muted font-body uppercase tracking-wider mt-1">pt/min</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom HR Zones */}
                <div className="bg-background border border-gold/20 p-6">
                  <h4 className="text-lg font-display text-gold mb-3 tracking-wider uppercase">
                    Your Custom Heart Rate Zones
                  </h4>
                  <p className="text-muted text-sm font-body leading-relaxed">
                    We use your personalized heart rate zones from Strava, ensuring accurate scoring
                    based on your individual fitness level. Each athlete&apos;s zones are different and
                    calculated from your Strava profile settings.
                  </p>
                </div>

                {/* Example Calculation */}
                <div>
                  <h4 className="text-lg font-display text-gold mb-4 tracking-wider uppercase">
                    Example Calculation
                  </h4>
                  <div className="bg-background border border-gold/20 p-6">
                    <p className="text-muted mb-4 font-body">
                      A 60-minute run with the following zone distribution:
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                      <div className="text-center p-2 sm:p-3 border border-gold/10">
                        <div className="text-xs text-muted font-body uppercase mb-1">Zone I</div>
                        <div className="font-body text-sm sm:text-base">10 min</div>
                        <div className="text-xs text-gold">= 10 pts</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 border border-gold/10">
                        <div className="text-xs text-muted font-body uppercase mb-1">Zone II</div>
                        <div className="font-body text-sm sm:text-base">20 min</div>
                        <div className="text-xs text-gold">= 40 pts</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 border border-gold/10">
                        <div className="text-xs text-muted font-body uppercase mb-1">Zone III</div>
                        <div className="font-body text-sm sm:text-base">25 min</div>
                        <div className="text-xs text-gold">= 75 pts</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 border border-gold/10">
                        <div className="text-xs text-muted font-body uppercase mb-1">Zone IV</div>
                        <div className="font-body text-sm sm:text-base">5 min</div>
                        <div className="text-xs text-gold">= 20 pts</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 border border-gold/10">
                        <div className="text-xs text-muted font-body uppercase mb-1">Zone V</div>
                        <div className="font-body text-sm sm:text-base">0 min</div>
                        <div className="text-xs text-gold">= 0 pts</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gold/20 flex items-center justify-between">
                      <span className="text-muted font-body">Total Activity Points:</span>
                      <span className="text-4xl font-display gradient-text">145</span>
                    </div>
                  </div>
                </div>

                {/* Eligible Activities */}
                <div>
                  <h4 className="text-lg font-display text-gold mb-4 tracking-wider uppercase">
                    Eligible Activities
                  </h4>
                  <p className="text-muted mb-4 font-body">
                    All cardio activities with heart rate data count toward your score:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Run', 'Ride', 'Peloton', 'Swim', 'Elliptical', 'Workout', 'Yoga'].map((activity) => (
                      <span
                        key={activity}
                        className="px-4 py-2 bg-background border border-gold/30 text-foreground font-body text-sm uppercase tracking-wider hover:border-gold/60 transition-colors duration-300"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="card p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display gradient-text tracking-wider uppercase">
                Leaderboard
              </h2>
              <div className="h-px w-24 bg-gold/30 mt-2 sm:mt-3"></div>
            </div>
            {!loading && leaderboard.length > 0 && (
              <div className="text-xs sm:text-sm text-muted font-body uppercase tracking-wider">
                {leaderboard.length} {leaderboard.length === 1 ? 'athlete' : 'athletes'}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="diamond-frame mx-auto animate-gold-pulse">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-6 text-muted font-body tracking-wide">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="diamond-frame mx-auto mb-6">
                <svg className="w-8 h-8 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-foreground text-xl font-display tracking-wider uppercase mb-2">
                No Athletes Yet
              </p>
              <p className="text-muted font-body">
                Be the first to connect and start logging activities!
              </p>
            </div>
          ) : (
            <>
              {/* Mobile card-based layout */}
              <div className="md:hidden space-y-4">
                {leaderboard.map((entry, index) => {
                  const isSyncing = syncingAthletes.has(entry.athlete_id);
                  const syncMessage = syncMessages.get(entry.athlete_id);
                  const leaderPoints = leaderboard[0]?.total_points || 0;
                  const pointsBehind = leaderPoints - entry.total_points;

                  return (
                    <div
                      key={entry.athlete_id}
                      className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {index < 3 ? (
                            <div className={`w-8 h-8 flex items-center justify-center border-2 rotate-45 flex-shrink-0 ${
                              index === 0 ? 'border-gold bg-gold/10' :
                              index === 1 ? 'border-muted bg-muted/10' :
                              'border-orange-700 bg-orange-700/10'
                            }`}>
                              <span className={`-rotate-45 font-display text-sm ${
                                index === 0 ? 'text-gold' :
                                index === 1 ? 'text-muted' :
                                'text-orange-700'
                              }`}>
                                {toRoman(index + 1)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-display text-lg text-muted w-8 text-center flex-shrink-0">
                              {toRoman(index + 1)}
                            </span>
                          )}
                          <Link
                            href={`/athlete/${entry.athlete_id}`}
                            className="font-body font-semibold text-foreground hover:text-gold transition-colors duration-300"
                            title="View Bourbon Chaser Athlete Profile"
                          >
                            {entry.firstname} {entry.lastname}
                          </Link>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-display gradient-text">
                            {entry.total_points.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted font-body uppercase tracking-wider">points</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gold/10">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted font-body">{entry.activity_count}</span>
                            <span className="text-muted/60 font-body ml-1">{entry.activity_count === 1 ? 'activity' : 'activities'}</span>
                          </div>
                          {index > 0 && (
                            <div className="text-orange-500 font-body">
                              -{pointsBehind.toFixed(1)} behind
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSyncAthlete(entry.athlete_id)}
                          disabled={isSyncing}
                          className="btn-small inline-flex items-center text-xs px-3 py-1.5"
                          title="Sync activities from Strava"
                        >
                          {isSyncing ? (
                            <>
                              <svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Syncing
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Sync
                            </>
                          )}
                        </button>
                      </div>
                      {syncMessage && (
                        <div className="text-xs text-gold/80 mt-2 font-body text-center">
                          {syncMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto -mx-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/30">
                      <th className="text-left py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Rank</th>
                      <th className="text-left py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Athlete</th>
                      <th className="text-right py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Points</th>
                      <th className="text-right py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Behind</th>
                      <th className="text-right py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Activities</th>
                      <th className="text-center py-4 px-8 font-display text-gold uppercase text-xs tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => {
                      const isSyncing = syncingAthletes.has(entry.athlete_id);
                      const syncMessage = syncMessages.get(entry.athlete_id);
                      const leaderPoints = leaderboard[0]?.total_points || 0;
                      const pointsBehind = leaderPoints - entry.total_points;

                      return (
                        <tr
                          key={entry.athlete_id}
                          className="border-b border-gold/10 hover:bg-gold/5 transition-colors duration-300"
                        >
                          <td className="py-5 px-8">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <div className={`w-10 h-10 flex items-center justify-center border-2 rotate-45 ${
                                  index === 0 ? 'border-gold bg-gold/10' :
                                  index === 1 ? 'border-muted bg-muted/10' :
                                  'border-orange-700 bg-orange-700/10'
                                }`}>
                                  <span className={`-rotate-45 font-display text-lg ${
                                    index === 0 ? 'text-gold' :
                                    index === 1 ? 'text-muted' :
                                    'text-orange-700'
                                  }`}>
                                    {toRoman(index + 1)}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-display text-xl text-muted w-10 text-center">
                                  {toRoman(index + 1)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            <Link
                              href={`/athlete/${entry.athlete_id}`}
                              className="font-body font-semibold text-foreground text-lg hover:text-gold transition-colors duration-300 tracking-wide"
                              title="View Bourbon Chaser Athlete Profile"
                            >
                              {entry.firstname} {entry.lastname}
                            </Link>
                            {syncMessage && (
                              <div className="text-xs text-gold/80 mt-1 font-body">
                                {syncMessage}
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-8 text-right">
                            <div className="text-3xl font-display gradient-text">
                              {entry.total_points.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted font-body uppercase tracking-wider">points</div>
                          </td>
                          <td className="py-5 px-8 text-right">
                            {index === 0 ? (
                              <div className="text-muted font-display">—</div>
                            ) : (
                              <div className="text-lg font-body text-orange-500">
                                -{pointsBehind.toFixed(1)}
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-8 text-right">
                            <div className="text-xl font-display text-foreground">
                              {entry.activity_count}
                            </div>
                            <div className="text-xs text-muted font-body uppercase tracking-wider">
                              {entry.activity_count === 1 ? 'activity' : 'activities'}
                            </div>
                          </td>
                          <td className="py-5 px-8 text-center">
                            <button
                              onClick={() => handleSyncAthlete(entry.athlete_id)}
                              disabled={isSyncing}
                              className="btn-small inline-flex items-center"
                              title="Sync activities from Strava"
                            >
                              {isSyncing ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Syncing
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Sync
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Weekly Performance Tracker */}
        {!loading && weeklyStats && weeklyStats.leaderboard.length > 0 && (
          <div className="card p-4 sm:p-8 mt-8 sm:mt-10">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-display gradient-text tracking-wider uppercase">
                This Week&apos;s Performance
              </h2>
              <div className="h-px w-24 sm:w-32 bg-gold/30 mt-2 sm:mt-3"></div>
              <p className="text-xs sm:text-sm text-muted mt-2 sm:mt-3 font-body uppercase tracking-wider">
                {new Date(weeklyStats.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weeklyStats.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-muted font-body mb-4">Click on an athlete to view their weekly stats</p>
              {weeklyStats.leaderboard.slice(0, 5).map((entry: any, index: number) => {
                const weeklyLeaderPoints = weeklyStats.leaderboard[0]?.total_points || 0;
                const weeklyPointsBehind = weeklyLeaderPoints - entry.total_points;
                const isSelected = selectedWeeklyAthlete === entry.athlete_id;

                return (
                  <div key={entry.athlete_id}>
                    <button
                      onClick={() => setSelectedWeeklyAthlete(isSelected ? null : entry.athlete_id)}
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background border transition-all duration-300 text-left ${
                        isSelected ? 'border-gold bg-gold/5' : 'border-gold/20 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-0">
                        <div className="font-display text-gold w-6 sm:w-8 text-sm sm:text-base">
                          {toRoman(index + 1)}.
                        </div>
                        <span className="font-body font-semibold text-foreground text-sm sm:text-base">
                          {entry.firstname} {entry.lastname}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-9 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <div className="text-lg sm:text-xl font-display gradient-text">{entry.total_points.toFixed(1)}</div>
                          <div className="text-xs text-muted font-body uppercase tracking-wider">pts</div>
                        </div>
                        {index > 0 && (
                          <div className="text-left sm:text-right">
                            <div className="text-sm font-body text-orange-500">-{weeklyPointsBehind.toFixed(1)}</div>
                          </div>
                        )}
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-body text-muted">{entry.activity_count}</div>
                          <div className="text-xs text-muted/50">acts</div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gold transition-transform duration-300 flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Individual Athlete's Weekly Stats */}
                    {isSelected && (
                      <div className="border border-t-0 border-gold/20 bg-background p-4 sm:p-6 animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                          <h4 className="text-base sm:text-lg font-display text-gold tracking-wider uppercase">
                            {entry.firstname}&apos;s Week
                          </h4>
                          <Link
                            href={`/athlete/${entry.athlete_id}`}
                            className="text-xs sm:text-sm text-gold hover:text-gold-light font-body uppercase tracking-wider transition-colors"
                          >
                            View Profile →
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="bg-card border border-gold/10 p-3 sm:p-4 text-center">
                            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Activities</div>
                            <div className="text-xl sm:text-2xl font-display gradient-text">{entry.activity_count}</div>
                          </div>
                          <div className="bg-card border border-gold/10 p-3 sm:p-4 text-center">
                            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Points</div>
                            <div className="text-xl sm:text-2xl font-display gradient-text">{entry.total_points.toFixed(1)}</div>
                          </div>
                          <div className="bg-card border border-gold/10 p-3 sm:p-4 text-center">
                            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Distance</div>
                            <div className="text-xl sm:text-2xl font-display text-foreground">
                              {((entry.total_distance_m || 0) / 1609.34).toFixed(1)}
                            </div>
                            <div className="text-xs text-muted">miles</div>
                          </div>
                          <div className="bg-card border border-gold/10 p-3 sm:p-4 text-center">
                            <div className="text-xs text-muted font-body uppercase tracking-wider mb-1">Time</div>
                            <div className="text-xl sm:text-2xl font-display text-foreground">
                              {Math.floor((entry.total_time_s || 0) / 3600)}h {Math.floor(((entry.total_time_s || 0) % 3600) / 60)}m
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Art Deco Footer */}
      <footer className="mt-12 sm:mt-20 py-8 sm:py-12 bg-card border-t border-gold/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Top decorative line */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-10">
            <div className="h-px w-12 sm:w-16 bg-gold/30"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 border border-gold/50 rotate-45"></div>
            <div className="h-px w-12 sm:w-16 bg-gold/30"></div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="double-frame">
                <div className="double-frame-inner">
                  <img
                    src="/images/ironman_logo.png"
                    alt="Ironman"
                    className="h-10 sm:h-12 w-auto"
                  />
                </div>
              </div>
              <div>
                <p className="font-display text-lg sm:text-xl tracking-wider uppercase text-foreground">Bourbon Chasers</p>
                <p className="text-xs sm:text-sm text-muted font-body mt-1">Powered by caffeine and poor decisions</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-muted text-xs sm:text-sm font-body tracking-wide uppercase">
                Training for Ironman 70.3 Chattanooga
              </p>
              <p className="text-muted/50 text-xs mt-1 sm:mt-2 font-body tracking-wider">
                &copy; MMXXIV-MMXXVI Bourbon Chasers
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="diamond-frame animate-gold-pulse">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin"></div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
