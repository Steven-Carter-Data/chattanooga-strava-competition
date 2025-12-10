'use client';

import { useEffect, useState } from 'react';

interface PersonalBestsData {
  hasData: boolean;
  personalBests?: {
    highestPoints: {
      activity: { id: string; name: string; sport_type: string; start_date: string };
      points: number;
    } | null;
    longestDuration: {
      activity: { id: string; name: string; sport_type: string; start_date: string };
      time_seconds: number;
    } | null;
    longestDistance: {
      activity: { id: string; name: string; sport_type: string; start_date: string };
      distance_m: number;
    } | null;
    zoneRecords: Record<string, {
      activity: { id: string; name: string; sport_type: string; start_date: string };
      time_seconds: number;
    }>;
    highestAvgHR: {
      activity: { id: string; name: string; sport_type: string; start_date: string };
      avg_hr: number;
    } | null;
    sportBests: Record<string, {
      count: number;
      bestPoints: { activity: any; points: number } | null;
      longestTime: { activity: any; time_seconds: number } | null;
    }>;
  };
  weeklyStats?: {
    bestWeekPoints: { weekStart: string; points: number; activities: number } | null;
    mostActiveWeek: { weekStart: string; activities: number; points: number } | null;
    averages: { pointsPerWeek: number; activitiesPerWeek: number };
    totalWeeks: number;
  };
  streaks?: {
    longestStreak: number;
    currentStreak: number;
    totalActiveDays: number;
  };
  milestones?: {
    totals: { points: number; distance_m: number; time_s: number; activities: number };
    achieved: { points: number[]; distance: number[]; time: number[]; activities: number[] };
    nextGoals: { points: number | null; distance: number | null; time: number | null; activities: number | null };
    progress: { points: number; distance: number; time: number; activities: number };
  };
  totalActivities?: number;
}

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeek(dateStr: string): string {
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// Zone colors matching the design system
const zoneColors = [
  { bg: 'bg-zone-1', text: 'text-zone-1', name: 'Recovery' },
  { bg: 'bg-zone-2', text: 'text-zone-2', name: 'Endurance' },
  { bg: 'bg-zone-3', text: 'text-zone-3', name: 'Tempo' },
  { bg: 'bg-zone-4', text: 'text-zone-4', name: 'Threshold' },
  { bg: 'bg-zone-5', text: 'text-zone-5', name: 'VO2 Max' },
];

export default function PersonalBests({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<PersonalBestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'zones' | 'milestones'>('records');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/athlete/${athleteId}/personal-bests`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch personal bests');
        }
      } catch (err) {
        setError('Failed to fetch personal bests');
        console.error(err);
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

  if (error || !data || !data.hasData) {
    return null;
  }

  const { personalBests, weeklyStats, streaks, milestones } = data;

  return (
    <div className="card p-4 sm:p-6 mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="diamond-frame flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-display text-foreground tracking-wider uppercase">
              Personal Bests
            </h3>
            <p className="text-xs text-muted font-body uppercase tracking-wider mt-1">
              Your Micro-Achievements
            </p>
          </div>
        </div>

        {/* Streak Badge */}
        {streaks && streaks.currentStreak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-lg font-display text-gold">{streaks.currentStreak} Day Streak</div>
              <div className="text-xs text-muted font-body">Keep it going!</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gold/20 pb-2">
        {[
          { id: 'records', label: 'Records', icon: '🏆' },
          { id: 'zones', label: 'Zone PRs', icon: '❤️' },
          { id: 'milestones', label: 'Milestones', icon: '🎯' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm uppercase tracking-wider transition-all duration-300 ${
              activeTab === tab.id
                ? 'text-gold border-b-2 border-gold -mb-[10px]'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Records Tab */}
      {activeTab === 'records' && personalBests && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Top Records Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Highest Points */}
            {personalBests.highestPoints && (
              <div className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚡</span>
                  <span className="text-xs text-muted font-body uppercase tracking-wider">Highest Points</span>
                </div>
                <div className="text-3xl font-display gradient-text mb-2">
                  {personalBests.highestPoints.points.toFixed(1)}
                </div>
                <div className="text-sm font-body text-foreground truncate">
                  {personalBests.highestPoints.activity.name}
                </div>
                <div className="text-xs text-muted font-body mt-1">
                  {personalBests.highestPoints.activity.sport_type} • {formatDate(personalBests.highestPoints.activity.start_date)}
                </div>
              </div>
            )}

            {/* Longest Duration */}
            {personalBests.longestDuration && (
              <div className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⏱️</span>
                  <span className="text-xs text-muted font-body uppercase tracking-wider">Longest Activity</span>
                </div>
                <div className="text-3xl font-display gradient-text mb-2">
                  {formatDuration(personalBests.longestDuration.time_seconds)}
                </div>
                <div className="text-sm font-body text-foreground truncate">
                  {personalBests.longestDuration.activity.name}
                </div>
                <div className="text-xs text-muted font-body mt-1">
                  {personalBests.longestDuration.activity.sport_type} • {formatDate(personalBests.longestDuration.activity.start_date)}
                </div>
              </div>
            )}

            {/* Longest Distance */}
            {personalBests.longestDistance && personalBests.longestDistance.distance_m > 0 && (
              <div className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📏</span>
                  <span className="text-xs text-muted font-body uppercase tracking-wider">Longest Distance</span>
                </div>
                <div className="text-3xl font-display gradient-text mb-2">
                  {formatDistance(personalBests.longestDistance.distance_m)}
                </div>
                <div className="text-sm font-body text-foreground truncate">
                  {personalBests.longestDistance.activity.name}
                </div>
                <div className="text-xs text-muted font-body mt-1">
                  {personalBests.longestDistance.activity.sport_type} • {formatDate(personalBests.longestDistance.activity.start_date)}
                </div>
              </div>
            )}
          </div>

          {/* Weekly Records */}
          {weeklyStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Best Week */}
              {weeklyStats.bestWeekPoints && (
                <div className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📅</span>
                    <span className="text-xs text-muted font-body uppercase tracking-wider">Best Week Ever</span>
                  </div>
                  <div className="text-2xl font-display gradient-text mb-1">
                    {weeklyStats.bestWeekPoints.points.toFixed(1)} pts
                  </div>
                  <div className="text-sm text-muted font-body">
                    {formatWeek(weeklyStats.bestWeekPoints.weekStart)}
                  </div>
                  <div className="text-xs text-muted/60 font-body mt-1">
                    {weeklyStats.bestWeekPoints.activities} activities
                  </div>
                </div>
              )}

              {/* Streaks */}
              {streaks && (
                <div className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🔥</span>
                    <span className="text-xs text-muted font-body uppercase tracking-wider">Activity Streaks</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-display text-foreground">{streaks.longestStreak}</div>
                      <div className="text-xs text-muted font-body">Best Streak</div>
                    </div>
                    <div>
                      <div className="text-xl font-display text-gold">{streaks.currentStreak}</div>
                      <div className="text-xs text-muted font-body">Current</div>
                    </div>
                    <div>
                      <div className="text-xl font-display text-foreground">{streaks.totalActiveDays}</div>
                      <div className="text-xs text-muted font-body">Active Days</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zone PRs Tab */}
      {activeTab === 'zones' && personalBests && (
        <div className="space-y-4 animate-fade-in-up">
          <p className="text-sm text-muted font-body mb-4">
            Your record time in each heart rate zone from a single activity
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5].map((zone) => {
              const zoneData = personalBests.zoneRecords[`zone${zone}`];
              const zoneStyle = zoneColors[zone - 1];

              return (
                <div
                  key={zone}
                  className="bg-background border border-gold/20 p-4 hover:border-gold/40 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${zoneStyle.bg}`}></div>
                      <span className="text-sm font-display text-foreground">Zone {zone}</span>
                    </div>
                    <span className="text-xs text-muted font-body">{zoneStyle.name}</span>
                  </div>

                  {zoneData && zoneData.time_seconds > 0 ? (
                    <>
                      <div className={`text-2xl font-display ${zoneStyle.text} mb-2`}>
                        {formatDuration(zoneData.time_seconds)}
                      </div>
                      <div className="text-xs font-body text-foreground truncate">
                        {zoneData.activity.name}
                      </div>
                      <div className="text-xs text-muted font-body mt-1">
                        {formatDate(zoneData.activity.start_date)}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted font-body text-sm">No data yet</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && milestones && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Progress to Next Goals */}
          <div className="space-y-4">
            <h4 className="text-sm font-display text-gold uppercase tracking-wider">Progress to Next Goal</h4>

            {/* Points Progress */}
            {milestones.nextGoals.points && (
              <div className="bg-background border border-gold/20 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-body text-foreground">Total Points</span>
                  <span className="text-sm font-body text-muted">
                    {milestones.totals.points.toFixed(0)} / {milestones.nextGoals.points}
                  </span>
                </div>
                <div className="h-2 bg-background border border-gold/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
                    style={{ width: `${Math.min(100, milestones.progress.points)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Activities Progress */}
            {milestones.nextGoals.activities && (
              <div className="bg-background border border-gold/20 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-body text-foreground">Total Activities</span>
                  <span className="text-sm font-body text-muted">
                    {milestones.totals.activities} / {milestones.nextGoals.activities}
                  </span>
                </div>
                <div className="h-2 bg-background border border-gold/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
                    style={{ width: `${Math.min(100, milestones.progress.activities)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Time Progress */}
            {milestones.nextGoals.time && (
              <div className="bg-background border border-gold/20 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-body text-foreground">Total Training Time</span>
                  <span className="text-sm font-body text-muted">
                    {formatDuration(milestones.totals.time_s)} / {formatDuration(milestones.nextGoals.time)}
                  </span>
                </div>
                <div className="h-2 bg-background border border-gold/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
                    style={{ width: `${Math.min(100, milestones.progress.time)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Achieved Milestones */}
          <div>
            <h4 className="text-sm font-display text-gold uppercase tracking-wider mb-4">Achievements Unlocked</h4>
            <div className="flex flex-wrap gap-2">
              {milestones.achieved.points.map((m) => (
                <div key={`points-${m}`} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs font-body uppercase tracking-wider">
                  ⚡ {m}+ Points
                </div>
              ))}
              {milestones.achieved.activities.map((m) => (
                <div key={`activities-${m}`} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs font-body uppercase tracking-wider">
                  🏃 {m}+ Activities
                </div>
              ))}
              {milestones.achieved.time.map((m) => (
                <div key={`time-${m}`} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs font-body uppercase tracking-wider">
                  ⏱️ {formatDuration(m)}+ Training
                </div>
              ))}
              {milestones.achieved.distance.map((m) => (
                <div key={`distance-${m}`} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs font-body uppercase tracking-wider">
                  📏 {formatDistance(m)}+ Distance
                </div>
              ))}
            </div>

            {milestones.achieved.points.length === 0 &&
             milestones.achieved.activities.length === 0 &&
             milestones.achieved.time.length === 0 &&
             milestones.achieved.distance.length === 0 && (
              <p className="text-muted font-body text-sm">
                Keep training to unlock your first achievements!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
