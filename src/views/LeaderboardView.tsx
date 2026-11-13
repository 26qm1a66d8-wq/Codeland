import React, { useMemo, useState } from 'react';
import { Trophy, Flame, Users } from 'lucide-react';
import { LeaderboardPlayer } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { formatLocalDateKey, getIsoWeekKey } from '../lib/dateUtils';
import { AvatarImage } from '../components/BadgeIcon';

type BoardPeriod = 'daily' | 'weekly' | 'all_time';

export const LeaderboardView: React.FC = () => {
  const { profile, effectiveStreak, cloudLeaderboard, demoChallengers } = usePlayer();
  const [period, setPeriod] = useState<BoardPeriod>('all_time');
  const [includeChallengers, setIncludeChallengers] = useState<boolean>(true);

  const rankedPlayers = useMemo(() => {
    if (!profile) return [];
    const today = formatLocalDateKey();
    const week = getIsoWeekKey();

    const selfEntry: LeaderboardPlayer = {
      uid: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      totalXp: profile.totalXp,
      dailyXp: profile.lastDailyKey === today ? profile.dailyXp : 0,
      weeklyXp: profile.lastWeeklyKey === week ? profile.weeklyXp : 0,
      lastDailyKey: today,
      lastWeeklyKey: week,
      currentStreak: effectiveStreak,
      achievementsCount: profile.unlockedAchievements.length,
      lessonsCompletedCount: profile.completedLessons.length,
      missionsCompletedCount: profile.completedMissions.length,
    };

    const byUid = new Map<string, LeaderboardPlayer>();
    for (const p of cloudLeaderboard) {
      byUid.set(p.uid, {
        ...p,
        dailyXp: p.lastDailyKey === today ? p.dailyXp : 0,
        weeklyXp: p.lastWeeklyKey === week ? p.weeklyXp : 0,
      });
    }
    if (includeChallengers) {
      for (const npc of demoChallengers) {
        if (!byUid.has(npc.uid)) {
          byUid.set(npc.uid, npc);
        }
      }
    }
    byUid.set(selfEntry.uid, selfEntry);

    const scoreFor = (item: LeaderboardPlayer) => {
      if (period === 'daily') return item.dailyXp;
      if (period === 'weekly') return item.weeklyXp;
      return item.totalXp;
    };

    return Array.from(byUid.values())
      .map((item) => ({ item, periodXp: scoreFor(item) }))
      .sort((a, b) => b.periodXp - a.periodXp || b.item.totalXp - a.item.totalXp);
  }, [profile, effectiveStreak, cloudLeaderboard, demoChallengers, includeChallengers, period]);

  if (!profile) return null;

  const topThree = rankedPlayers.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-[#F5C451]">
            Explorer Standings
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CODELAND Leaderboard
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Earn XP from lessons, practice challenges, daily goals, and 3D world completions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 rounded-xl bg-stone-200/90 dark:bg-[#14261E] border border-stone-300 dark:border-emerald-900/60">
            {[
              { id: 'daily' as BoardPeriod, label: 'Daily' },
              { id: 'weekly' as BoardPeriod, label: 'Weekly' },
              { id: 'all_time' as BoardPeriod, label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  period === tab.id
                    ? 'bg-[#2F7D46] text-white'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIncludeChallengers((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#69B9E7]" />
            <span>{includeChallengers ? 'Showing NPC Challengers' : 'Cloud Players Only'}</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topThree.map(({ item, periodXp }, index) => {
            const rank = index + 1;
            const isMe = item.uid === profile.uid;
            const medalColors = ['#F5C451', '#A8B5B0', '#E08E55'];
            return (
              <div
                key={item.uid}
                className={`p-5 rounded-2xl border flex flex-col items-center text-center gap-2.5 ${
                  rank === 1
                    ? 'border-[#F5C451] bg-amber-50/50 dark:bg-[#1A3125] shadow-md'
                    : 'border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E]'
                }`}
              >
                <div
                  className="font-display text-sm"
                  style={{ color: medalColors[index] || '#F5C451' }}
                >
                  RANK #{rank}
                </div>
                <AvatarImage avatarId={item.avatarId} sizeClass="w-16 h-16" />
                <div>
                  <div className="font-bold text-base">
                    {item.displayName} {isMe ? '(You)' : ''}
                  </div>
                  <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                    @{item.username}
                    {item.isDemoNpc ? ' · Practice Challenger' : ''}
                  </div>
                </div>
                <div className="text-lg font-mono font-extrabold tabular-nums text-[#2F7D46] dark:text-[#F5C451]">
                  {periodXp} XP
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Standings Table */}
      <div className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-emerald-900/60 text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#101F18]">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Explorer</th>
                <th className="py-3 px-4">Streak</th>
                <th className="py-3 px-4">Lessons</th>
                <th className="py-3 px-4">3D Worlds</th>
                <th className="py-3 px-4">Badges</th>
                <th className="py-3 px-4 text-right">
                  {period === 'daily'
                    ? 'Today XP'
                    : period === 'weekly'
                    ? 'Weekly XP'
                    : 'Total XP'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-emerald-900/40 text-sm">
              {rankedPlayers.map(({ item, periodXp }, idx) => {
                const isMe = item.uid === profile.uid;
                return (
                  <tr
                    key={item.uid}
                    className={
                      isMe
                        ? 'bg-[#2F7D46]/12 dark:bg-[#1E3B2D] font-semibold'
                        : 'hover:bg-stone-50 dark:hover:bg-[#182D23]'
                    }
                  >
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs">
                      <span className="inline-flex items-center gap-1">
                        {idx < 3 && <Trophy className="w-3.5 h-3.5 text-[#F5C451]" />}#{idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarImage avatarId={item.avatarId} sizeClass="w-9 h-9" />
                        <div>
                          <div className="text-sm font-bold">
                            {item.displayName} {isMe ? '(You)' : ''}
                          </div>
                          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                            @{item.username}
                            {item.isDemoNpc ? ' · Practice Challenger' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#F28C45]">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {item.currentStreak}d
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs">
                      {item.lessonsCompletedCount}/18
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs">
                      {item.missionsCompletedCount}/6
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs">
                      {item.achievementsCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-[#2F7D46] dark:text-[#F5C451]">
                      {periodXp} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
