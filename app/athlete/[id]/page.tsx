'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

// Helper function to format sport type names (e.g., "WeightTraining" -> "Weight Training")
function formatSportType(sport: string): string {
  // Insert space before capital letters and trim
  return sport.replace(/([A-Z])/g, ' $1').trim();
}

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="diamond-frame mx-auto animate-gold-pulse">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-6 text-muted font-body tracking-wide">Loading athlete data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-10 text-center max-w-md">
          <div className="diamond-frame mx-auto mb-6">
            <svg className="w-8 h-8 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-display mb-4 text-foreground uppercase tracking-wider">Athlete Not Found</h2>
          <p className="text-muted font-body mb-8">{error}</p>
          <Link href="/" className="btn-primary">
            Back to Leaderboard
          </Link>
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

  // Zone colors for Art Deco theme
  const zoneColors = [
    { text: 'text-zone-1', bg: 'bg-zone-1', border: 'border-zone-1' },
    { text: 'text-zone-2', bg: 'bg-zone-2', border: 'border-zone-2' },
    { text: 'text-zone-3', bg: 'bg-zone-3', border: 'border-zone-3' },
    { text: 'text-zone-4', bg: 'bg-zone-4', border: 'border-zone-4' },
    { text: 'text-zone-5', bg: 'bg-zone-5', border: 'border-zone-5' },
  ];

  return (
    <div className="min-h-screen">
      {/* Art Deco Header */}
      <div className="bourbon-hero text-foreground relative overflow-hidden">
        {/* Sunburst effect */}
        <div className="absolute inset-0 sunburst-bg"></div>

        {/* Decorative vertical lines */}
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gold/10"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gold/10"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-muted hover:text-gold mb-6 sm:mb-8 transition-colors duration-300 font-body uppercase tracking-wider text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Leaderboard
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-8">
            {/* Profile Image in Double Frame */}
            {data.athlete.profile_image_url && (
              <div className="double-frame">
                <div className="double-frame-inner">
                  <img
                    src={data.athlete.profile_image_url}
                    alt={`${data.athlete.firstname} ${data.athlete.lastname}`}
                    className="w-20 h-20 sm:w-28 sm:h-28 object-cover"
                  />
                </div>
              </div>
            )}

            <div className="text-center md:text-left flex-1">
              {/* Athlete Name */}
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-display mb-2 sm:mb-3 tracking-widest uppercase text-foreground">
                {data.athlete.firstname} {data.athlete.lastname}
              </h1>

              {/* Decorative line */}
              <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="h-px w-8 sm:w-12 bg-gold/50"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 border border-gold rotate-45"></div>
                <div className="h-px w-8 sm:w-12 bg-gold/50"></div>
              </div>

              <p className="text-muted font-body uppercase tracking-wider text-xs sm:text-base">Athlete Performance Dashboard</p>
            </div>

            {/* Logo */}
            <div className="hidden md:block">
              <div className="double-frame">
                <div className="double-frame-inner">
                  <img
                    src="/images/ironman_chattanooga_logo.png"
                    alt="Ironman 70.3 Chattanooga"
                    className="h-16 w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Sync Message */}
        {syncMessage && (
          <div className="mb-8 p-6 card border-gold/50">
            <div className="flex items-center">
              <div className="diamond-frame mr-4">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-foreground font-body font-semibold tracking-wide">{syncMessage}</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-8 sm:mb-10">
          <div className="card p-4 sm:p-8 text-center">
            <div className="text-xs text-muted font-body uppercase tracking-widest mb-2 sm:mb-3">Total Points</div>
            <div className="text-3xl sm:text-6xl font-display gradient-text">{data.summary.total_points.toFixed(1)}</div>
          </div>
          <div className="card p-4 sm:p-8 text-center">
            <div className="text-xs text-muted font-body uppercase tracking-widest mb-2 sm:mb-3">Total Activities</div>
            <div className="text-3xl sm:text-6xl font-display text-foreground">{data.summary.activity_count}</div>
          </div>
        </div>

        {/* Sync Button */}
        <div className="mb-8 sm:mb-10">
          <button
            onClick={handleSyncActivities}
            disabled={syncing}
            className="btn-primary inline-flex items-center text-sm sm:text-base px-4 sm:px-8 py-2 sm:py-3"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Syncing Activities</span>
                <span className="sm:hidden">Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Sync Activities from Strava</span>
                <span className="sm:hidden">Sync Strava</span>
              </>
            )}
          </button>
          <p className="text-xs sm:text-sm text-muted font-body mt-2 sm:mt-3 tracking-wide">
            Manually fetch and sync your latest activities from Strava
          </p>
        </div>

        {/* HR Zone Configuration (from Strava) */}
        {data.athlete.hr_zones && (
          <div className="card p-4 sm:p-8 mb-8 sm:mb-10">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-display text-gold tracking-wider uppercase">
                  <span className="hidden sm:inline">Strava Heart Rate Zones Configuration</span>
                  <span className="sm:hidden">HR Zones Config</span>
                </h3>
                <div className="h-px w-32 sm:w-48 bg-gold/30 mt-2"></div>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-background border border-gold/30 text-gold text-xs font-body font-semibold uppercase tracking-widest">
                {data.athlete.hr_zones.custom_zones ? 'Custom Zones' : 'Strava HR Zones'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {data.athlete.hr_zones.zones.map((zone, index) => {
                const displayMin = index === 0 ? zone.min : zone.min + 1;
                const displayMax = index === 4 ? 'Max' : zone.max;

                return (
                  <div key={index} className={`bg-background border-2 ${zoneColors[index].border} p-2 sm:p-4 text-center`}>
                    <div className={`text-xs font-display mb-1 sm:mb-2 ${zoneColors[index].text} uppercase tracking-wider`}>
                      Z{toRoman(index + 1)}
                    </div>
                    <div className="text-sm sm:text-lg font-body font-bold text-foreground">
                      {displayMin}-{displayMax}
                    </div>
                    <div className="text-xs text-muted font-body uppercase tracking-wider mt-0.5 sm:mt-1">bpm</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HR Zone Distribution */}
        <div className="card p-4 sm:p-8 mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-display gradient-text tracking-wider uppercase mb-2">
            <span className="hidden sm:inline">Heart Rate Zone Distribution</span>
            <span className="sm:hidden">HR Zone Distribution</span>
          </h2>
          <div className="h-px w-32 sm:w-48 bg-gold/30 mb-6 sm:mb-8"></div>

          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3, 4, 5].map((zone) => {
              const zoneKey = `zone_${zone}` as keyof typeof data.zone_distribution;
              const percentage = zonePercentages[zoneKey];
              const timeMinutes = Math.floor(data.zone_distribution[zoneKey] / 60);
              const hrZone = data.athlete.hr_zones?.zones[zone - 1];

              const displayMin = zone === 1 ? hrZone?.min : (hrZone?.min ?? 0) + 1;
              const displayMax = zone === 5 ? 'Max' : hrZone?.max;

              return (
                <div key={zone}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 gap-1">
                    <span className={`font-display text-sm sm:text-lg ${zoneColors[zone - 1].text} uppercase tracking-wider`}>
                      Zone {toRoman(zone)}
                      {hrZone && (
                        <span className="ml-2 sm:ml-3 text-xs font-body text-muted normal-case tracking-normal">
                          ({displayMin}-{displayMax} bpm)
                        </span>
                      )}
                    </span>
                    <span className="text-xs sm:text-sm text-foreground font-body">
                      {timeMinutes} min <span className="text-muted">({percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-background border border-gold/20 h-3 sm:h-4">
                    <div
                      className={`h-full transition-all duration-500 ${zoneColors[zone - 1].bg}`}
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
          <div className="card p-4 sm:p-8 mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-display mb-2 gradient-text tracking-wider uppercase">
              <span className="hidden sm:inline">Activity Breakdown by Sport</span>
              <span className="sm:hidden">Sport Breakdown</span>
            </h2>
            <div className="h-px w-32 sm:w-48 bg-gold/30 mb-6 sm:mb-8"></div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {Object.entries(data.sport_breakdown).map(([sport, stats]) => (
                <div key={sport} className="bg-background border border-gold/20 p-3 sm:p-6 hover:border-gold/40 transition-all duration-300">
                  <h3 className="font-display text-sm sm:text-xl mb-3 sm:mb-4 text-gold tracking-wider uppercase">{formatSportType(sport)}</h3>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm font-body">
                    <div className="flex justify-between border-b border-gold/10 pb-1.5 sm:pb-2">
                      <span className="text-muted uppercase tracking-wider text-xs">Acts</span>
                      <span className="font-semibold text-foreground">{stats.count}</span>
                    </div>
                    <div className="flex justify-between border-b border-gold/10 pb-1.5 sm:pb-2">
                      <span className="text-muted uppercase tracking-wider text-xs">Pts</span>
                      <span className="font-semibold gradient-text">{stats.points.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gold/10 pb-1.5 sm:pb-2">
                      <span className="text-muted uppercase tracking-wider text-xs">Dist</span>
                      <span className="font-semibold text-foreground">{(stats.distance_m / 1609.34).toFixed(1)} mi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted uppercase tracking-wider text-xs">Time</span>
                      <span className="font-semibold text-foreground">{Math.floor(stats.time_s / 3600)}h {Math.floor((stats.time_s % 3600) / 60)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        {data.recent_activities.length > 0 && (
          <div className="card p-4 sm:p-8">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-display mb-2 gradient-text tracking-wider uppercase">
              Recent Activities
            </h2>
            <div className="h-px w-32 sm:w-48 bg-gold/30 mb-6 sm:mb-8"></div>

            <div className="space-y-4">
              {data.recent_activities.map((activity) => {
                const activityZoneTime = {
                  zone_1: activity.zone_1_time_s || 0,
                  zone_2: activity.zone_2_time_s || 0,
                  zone_3: activity.zone_3_time_s || 0,
                  zone_4: activity.zone_4_time_s || 0,
                  zone_5: activity.zone_5_time_s || 0,
                };
                const activityTotalZoneTime = Object.values(activityZoneTime).reduce((sum, time) => sum + time, 0);
                const activityZonePercentages = {
                  zone_1: activityTotalZoneTime > 0 ? (activityZoneTime.zone_1 / activityTotalZoneTime) * 100 : 0,
                  zone_2: activityTotalZoneTime > 0 ? (activityZoneTime.zone_2 / activityTotalZoneTime) * 100 : 0,
                  zone_3: activityTotalZoneTime > 0 ? (activityZoneTime.zone_3 / activityTotalZoneTime) * 100 : 0,
                  zone_4: activityTotalZoneTime > 0 ? (activityZoneTime.zone_4 / activityTotalZoneTime) * 100 : 0,
                  zone_5: activityTotalZoneTime > 0 ? (activityZoneTime.zone_5 / activityTotalZoneTime) * 100 : 0,
                };

                return (
                  <div
                    key={activity.id}
                    className="bg-background border border-gold/20 p-4 sm:p-6 hover:border-gold/40 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base sm:text-xl text-foreground tracking-wide truncate">{activity.name}</h3>
                        <p className="text-xs sm:text-sm text-muted font-body mt-1">
                          <span className="text-gold uppercase tracking-wider">{formatSportType(activity.sport_type)}</span>
                          <span className="mx-1 sm:mx-2">•</span>
                          {new Date(activity.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="text-2xl sm:text-3xl font-display gradient-text">{activity.zone_points?.toFixed(1) || '0.0'}</div>
                        <div className="text-xs text-muted font-body uppercase tracking-wider">points</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gold/10">
                      <div>
                        <div className="text-muted font-body uppercase tracking-wider text-xs mb-0.5 sm:mb-1">Dist</div>
                        <div className="font-body font-semibold text-foreground">{((activity.distance_m || 0) / 1609.34).toFixed(1)} mi</div>
                      </div>
                      <div>
                        <div className="text-muted font-body uppercase tracking-wider text-xs mb-0.5 sm:mb-1">Time</div>
                        <div className="font-body font-semibold text-foreground">
                          {Math.floor((activity.moving_time_s || 0) / 3600)}h {Math.floor(((activity.moving_time_s || 0) % 3600) / 60)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-muted font-body uppercase tracking-wider text-xs mb-0.5 sm:mb-1">Avg HR</div>
                        <div className="font-body font-semibold text-foreground">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)}` : 'N/A'}</div>
                      </div>
                    </div>

                    {/* HR Zone Distribution for this activity */}
                    {activityTotalZoneTime > 0 && (
                      <div>
                        <div className="text-xs font-display text-gold mb-2 sm:mb-3 uppercase tracking-wider">HR Zone Distribution</div>
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {[1, 2, 3, 4, 5].map((zone) => {
                            const zoneKey = `zone_${zone}` as keyof typeof activityZoneTime;
                            const percentage = activityZonePercentages[zoneKey];
                            const timeMinutes = Math.floor(activityZoneTime[zoneKey] / 60);

                            return (
                              <div key={zone} className="text-center">
                                <div className={`text-xs font-display mb-1 sm:mb-2 ${zoneColors[zone - 1].text} uppercase`}>
                                  Z{toRoman(zone)}
                                </div>
                                <div className={`w-full bg-background border border-gold/10 h-1.5 sm:h-2 mb-1 sm:mb-2`}>
                                  <div
                                    className={`h-full transition-all duration-500 ${zoneColors[zone - 1].bg}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-xs text-foreground font-body">
                                  {timeMinutes}m
                                </div>
                                <div className="text-xs text-muted font-body hidden sm:block">
                                  {percentage.toFixed(0)}%
                                </div>
                              </div>
                            );
                          })}
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
