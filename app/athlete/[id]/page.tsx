'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AthleteData {
  athlete: {
    id: string;
    firstname: string;
    lastname: string;
    profile_image_url: string | null;
    hr_zones?: {
      custom_zones: boolean;
      zones: Array<{
        min: number;
        max: number;
      }>;
    } | null;
  };
  summary: {
    total_points: number;
    activity_count: number;
  };
  sport_breakdown: {
    [sport: string]: {
      count: number;
      points: number;
      distance_m: number;
      time_s: number;
    };
  };
  zone_distribution: {
    zone_1: number;
    zone_2: number;
    zone_3: number;
    zone_4: number;
    zone_5: number;
  };
  recent_activities: any[];
}

export default function AthletePage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;

  const [data, setData] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAthleteData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch athlete data');
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError('Athlete not found');
        }
      } catch (err) {
        setError('Failed to load athlete data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAthleteData();
  }, [athleteId]);

  async function handleSyncActivities() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch(`/api/sync/${athleteId}`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        setSyncMessage(`Successfully synced ${result.synced} activities!`);
        // Refresh athlete data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSyncMessage(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      setSyncMessage('Failed to sync activities');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A99D]"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading athlete data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="card p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">Athlete Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <Link href="/" className="btn-primary">
              Back to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalZoneTime = Object.values(data.zone_distribution).reduce((sum, time) => sum + time, 0);
  const zonePercentages = {
    zone_1: totalZoneTime > 0 ? (data.zone_distribution.zone_1 / totalZoneTime) * 100 : 0,
    zone_2: totalZoneTime > 0 ? (data.zone_distribution.zone_2 / totalZoneTime) * 100 : 0,
    zone_3: totalZoneTime > 0 ? (data.zone_distribution.zone_3 / totalZoneTime) * 100 : 0,
    zone_4: totalZoneTime > 0 ? (data.zone_distribution.zone_4 / totalZoneTime) * 100 : 0,
    zone_5: totalZoneTime > 0 ? (data.zone_distribution.zone_5 / totalZoneTime) * 100 : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="ironman-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Leaderboard
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {data.athlete.profile_image_url && (
              <img
                src={data.athlete.profile_image_url}
                alt={`${data.athlete.firstname} ${data.athlete.lastname}`}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
            )}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
                {data.athlete.firstname} {data.athlete.lastname}
              </h1>
              <p className="text-white/90 text-lg font-semibold">Athlete Performance Dashboard</p>
            </div>
            <div className="hidden md:block">
              <img
                src="/images/ironman_chattanooga_logo.png"
                alt="Ironman 70.3 Chattanooga"
                className="h-16 w-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Sync Message */}
        {syncMessage && (
          <div className="mb-6 p-4 card bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 dark:text-blue-200 font-semibold">{syncMessage}</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-8">
            <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Points</div>
            <div className="text-5xl font-bold gradient-text">{data.summary.total_points.toFixed(1)}</div>
          </div>
          <div className="card p-8">
            <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Activities</div>
            <div className="text-5xl font-bold text-slate-900 dark:text-slate-100">{data.summary.activity_count}</div>
          </div>
        </div>

        {/* Sync Button */}
        <div className="mb-8">
          <button
            onClick={handleSyncActivities}
            disabled={syncing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="inline-block animate-spin h-5 w-5 mr-2 -mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing Activities...
              </>
            ) : (
              <>
                <svg className="inline-block w-5 h-5 mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Activities from Strava
              </>
            )}
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Manually fetch and sync your latest activities from Strava
          </p>
        </div>

        {/* HR Zone Configuration (from Strava) */}
        {data.athlete.hr_zones && (
          <div className="card p-6 mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-bold mb-4 text-blue-900 dark:text-blue-100">
              Strava Heart Rate Zones Configuration
            </h3>
            <div className="mb-3">
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-full text-sm font-semibold">
                {data.athlete.hr_zones.custom_zones ? 'Custom Zones' : 'Auto Zones'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {data.athlete.hr_zones.zones.map((zone, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Zone {index + 1}</div>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    {zone.min} - {zone.max}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">bpm</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HR Zone Distribution */}
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 gradient-text">Heart Rate Zone Distribution</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((zone) => {
              const zoneKey = `zone_${zone}` as keyof typeof data.zone_distribution;
              const percentage = zonePercentages[zoneKey];
              const timeMinutes = Math.floor(data.zone_distribution[zoneKey] / 60);
              const hrZone = data.athlete.hr_zones?.zones[zone - 1];

              return (
                <div key={zone}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Zone {zone}
                      {hrZone && (
                        <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                          ({hrZone.min}-{hrZone.max} bpm)
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {timeMinutes} min ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        zone === 1 ? 'bg-blue-400' :
                        zone === 2 ? 'bg-green-400' :
                        zone === 3 ? 'bg-yellow-400' :
                        zone === 4 ? 'bg-orange-500' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sport Breakdown */}
        {Object.keys(data.sport_breakdown).length > 0 && (
          <div className="card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 gradient-text">Activity Breakdown by Sport</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(data.sport_breakdown).map(([sport, stats]) => (
                <div key={sport} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-slate-100">{sport}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Activities:</span>
                      <span className="font-semibold">{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Points:</span>
                      <span className="font-semibold">{stats.points.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Distance:</span>
                      <span className="font-semibold">{(stats.distance_m / 1000).toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Time:</span>
                      <span className="font-semibold">{Math.floor(stats.time_s / 3600)}h {Math.floor((stats.time_s % 3600) / 60)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        {data.recent_activities.length > 0 && (
          <div className="card p-8">
            <h2 className="text-2xl font-bold mb-6 gradient-text">Recent Activities</h2>
            <div className="space-y-4">
              {data.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{activity.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activity.sport_type} • {new Date(activity.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold gradient-text">{activity.zone_points?.toFixed(1) || '0.0'}</div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Distance</div>
                      <div className="font-semibold">{((activity.distance_m || 0) / 1000).toFixed(2)} km</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Time</div>
                      <div className="font-semibold">
                        {Math.floor((activity.moving_time_s || 0) / 3600)}h {Math.floor(((activity.moving_time_s || 0) % 3600) / 60)}m
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Avg HR</div>
                      <div className="font-semibold">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
