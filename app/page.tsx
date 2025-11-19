'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { LeaderboardEntry } from '@/lib/types';

// Leaderboard with sync buttons for each athlete

function HomeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const athleteName = searchParams.get('athlete');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAthletes, setSyncingAthletes] = useState<Set<string>>(new Set());
  const [syncMessages, setSyncMessages] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
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

        // Refresh leaderboard after 2 seconds
        setTimeout(async () => {
          const response = await fetch('/api/leaderboard');
          const data = await response.json();
          if (data.success) {
            setLeaderboard(data.data);
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
        setSyncMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(athleteId, `Sync failed: ${result.error}`);
          return newMap;
        });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="ironman-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <img
                src="/images/ironman_chattanooga_logo_2.png"
                alt="Ironman 70.3 Chattanooga"
                className="h-24 md:h-32 w-auto"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-wide">
              Training Championship
            </h2>
            <p className="text-xl md:text-2xl font-semibold mb-6">
              January 1 - March 31, 2026
            </p>
            <p className="mt-4 text-lg max-w-2xl mx-auto opacity-90">
              Compete with heart rate zone-based scoring. Every minute in the zone counts!
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Success/Error Messages */}
        {success === 'auth_complete' && (
          <div className="mb-8 p-4 card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 dark:text-green-200 font-semibold">
                Welcome, {athleteName}! Your Strava account is now connected.
              </p>
            </div>
          </div>
        )}
        {error === 'auth_failed' && (
          <div className="mb-8 p-4 card bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200 font-semibold">
                Authentication failed. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Connect with Strava Card */}
        <div className="card p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00A99D]/10 to-[#008B82]/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <h2 className="text-3xl font-bold mb-4 gradient-text">Join the Competition</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg leading-relaxed">
              Connect your Strava account to participate in the championship.
              Your activities will be automatically tracked and scored based on heart rate zones.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <a href="/api/auth/strava" className="btn-primary">
                <svg className="inline-block w-5 h-5 mr-2 -mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Connect with Strava
              </a>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure OAuth authentication
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold gradient-text">Leaderboard</h2>
            {!loading && leaderboard.length > 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {leaderboard.length} {leaderboard.length === 1 ? 'athlete' : 'athletes'} competing
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A99D]"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                No athletes yet
              </p>
              <p className="text-slate-500 dark:text-slate-500 mt-2">
                Be the first to connect and start logging activities!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-8 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Rank</th>
                    <th className="text-left py-4 px-8 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Athlete</th>
                    <th className="text-right py-4 px-8 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Points</th>
                    <th className="text-right py-4 px-8 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Activities</th>
                    <th className="text-center py-4 px-8 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const isSyncing = syncingAthletes.has(entry.athlete_id);
                    const syncMessage = syncMessages.get(entry.athlete_id);

                    return (
                      <tr
                        key={entry.athlete_id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-8">
                          <div className="flex items-center">
                            {index === 0 && <span className="text-3xl">🥇</span>}
                            {index === 1 && <span className="text-3xl">🥈</span>}
                            {index === 2 && <span className="text-3xl">🥉</span>}
                            {index > 2 && (
                              <span className="text-xl font-bold text-slate-600 dark:text-slate-400">
                                {index + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-8">
                          <Link
                            href={`/athlete/${entry.athlete_id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 text-lg hover:text-[#00A99D] dark:hover:text-[#00A99D] transition-colors"
                          >
                            {entry.firstname} {entry.lastname}
                          </Link>
                          {syncMessage && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {syncMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-8 text-right">
                          <div className="text-2xl font-bold gradient-text">
                            {entry.total_points.toFixed(1)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500">points</div>
                        </td>
                        <td className="py-4 px-8 text-right">
                          <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                            {entry.activity_count}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            {entry.activity_count === 1 ? 'activity' : 'activities'}
                          </div>
                        </td>
                        <td className="py-4 px-8 text-center">
                          <button
                            onClick={() => handleSyncAthlete(entry.athlete_id)}
                            disabled={isSyncing}
                            className="inline-flex items-center px-3 py-1.5 bg-[#00A99D] hover:bg-[#008B82] text-white text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sync activities from Strava"
                          >
                            {isSyncing ? (
                              <>
                                <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Syncing...
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          )}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">💪</div>
            <h3 className="font-bold text-lg mb-2">Zone-Based Scoring</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Zone 1-5: 1-5 points per minute
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">🏊‍♂️🚴‍♂️🏃‍♂️</div>
            <h3 className="font-bold text-lg mb-2">All Disciplines</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Swim, bike, run, and more
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2">Auto-Sync</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Activities tracked automatically
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/ironman_logo.png"
                alt="Ironman"
                className="h-8 w-auto"
              />
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                <p>Powered by Strava API</p>
                <p className="text-xs">Built for Ironman 70.3 Chattanooga Training</p>
              </div>
            </div>
            <div className="text-slate-500 dark:text-slate-500 text-xs">
              © 2026 Training Championship
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
