import React, { useMemo, useState } from 'react';
import { Flame, ShieldCheck, Trophy } from 'lucide-react';
import {
  formatLocalDateKey,
  getEncouragingStreakMessage,
  getLastNDaysCalendar,
  getNextStreakMilestone,
} from '../../lib/dateUtils';
import { useAnimatedCounter } from './useAnimatedCounter';

const DAILY_GOAL_TARGET_KEY = 'codeland_daily_xp_target_v1';
const GOAL_PRESETS = [50, 100, 150] as const;

interface StreakAndProgressCardProps {
  effectiveStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  dailyXp: number;
  lastDailyKey: string;
  activityDates: string[];
  totalXp: number;
  playerLevel: number;
  coins: number;
  lessonsCompletedCount: number;
  missionsCompletedCount: number;
  currentWorldCompletionPct: number;
  currentWorldName: string;
  playerRankNumber: number;
  dailyGoalStatus: {
    lessonDone: boolean;
    exercisesCount: number;
    missionDone: boolean;
  };
  onOpenProfile: () => void;
}

export const StreakAndProgressCard: React.FC<StreakAndProgressCardProps> = ({
  effectiveStreak,
  longestStreak,
  totalActiveDays,
  dailyXp,
  lastDailyKey,
  activityDates,
  totalXp,
  playerLevel,
  coins,
  lessonsCompletedCount,
  missionsCompletedCount,
  currentWorldCompletionPct,
  currentWorldName,
  playerRankNumber,
  dailyGoalStatus,
  onOpenProfile,
}) => {
  const [targetXp, setTargetXp] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(DAILY_GOAL_TARGET_KEY));
      if (saved === 50 || saved === 100 || saved === 150) return saved;
    } catch {
      // ignore storage errors
    }
    return 50;
  });

  const handleSelectTarget = (xp: number) => {
    setTargetXp(xp);
    try {
      localStorage.setItem(DAILY_GOAL_TARGET_KEY, String(xp));
    } catch {
      // ignore storage errors
    }
  };

  const animXp = useAnimatedCounter(totalXp);
  const animCoins = useAnimatedCounter(coins);
  const animStreak = useAnimatedCounter(effectiveStreak);

  const todayKey = formatLocalDateKey();
  const earnedTodayXp = lastDailyKey === todayKey ? Math.max(0, dailyXp) : 0;
  const completedQuestsCount =
    (dailyGoalStatus.lessonDone ? 1 : 0) +
    (dailyGoalStatus.exercisesCount >= 3 ? 1 : 0) +
    (dailyGoalStatus.missionDone ? 1 : 0);

  const streakProtectedToday =
    earnedTodayXp >= targetXp ||
    completedQuestsCount === 3 ||
    activityDates.includes(todayKey);

  const goalPct = Math.min(100, Math.round((earnedTodayXp / targetXp) * 100));

  const nextMilestone = useMemo(
    () => getNextStreakMilestone(effectiveStreak),
    [effectiveStreak]
  );
  const streakMessage = useMemo(
    () => getEncouragingStreakMessage(effectiveStreak),
    [effectiveStreak]
  );
  const last7Days = useMemo(
    () => getLastNDaysCalendar(7, activityDates),
    [activityDates]
  );

  // Circular SVG ring geometry
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const clampedWorldPct = Math.max(0, Math.min(100, currentWorldCompletionPct));
  const strokeDashoffset = ringCircumference * (1 - clampedWorldPct / 100);

  return (
    <section
      aria-label="Your Progress and Daily Streak"
      className="h-full rounded-2xl border border-indigo-400/30 bg-[#111936] p-5 flex flex-col justify-between gap-4 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] tracking-tight">
            Your Progress &amp; Streak
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          className="text-xs font-bold text-[#FBBF24] hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          View Details →
        </button>
      </div>

      {/* Circular World Completion Ring + Glowing Streak Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Progress Ring */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#0B1026] border border-indigo-400/20">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="hubRingGrad" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="55%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle
                cx="42"
                cy="42"
                r={ringRadius}
                stroke="#1E293B"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="42"
                cy="42"
                r={ringRadius}
                stroke="url(#hubRingGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-mono font-extrabold tabular-nums text-white">
                {clampedWorldPct}%
              </span>
              <span className="text-[10px] text-cyan-300 font-medium">World</span>
            </div>
          </div>
          <span className="mt-1 text-[11px] text-slate-300 font-medium truncate max-w-full">
            {currentWorldName}
          </span>
        </div>

        {/* Streak Flame + Longest Streak + Daily XP Target */}
        <div className="sm:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-400/45 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-[#F97316] fill-[#FBBF24]" />
              </div>
              <div>
                <div className="text-base font-mono font-extrabold tabular-nums text-white leading-tight">
                  {animStreak} {effectiveStreak === 1 ? 'Day' : 'Days'} Streak
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-300">
                  Longest: <strong className="text-[#FBBF24]">{longestStreak}d</strong> · Active:{' '}
                  {totalActiveDays}d
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-indigo-200/90 leading-snug line-clamp-2">
            {streakMessage.headline} — Next milestone at {nextMilestone.targetDays}d (
            {nextMilestone.daysRemaining}d left).
          </p>

          {/* Daily XP Target Bar + Streak Shield Status */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{streakProtectedToday ? 'Streak Shield Active' : 'Daily XP Goal'}</span>
              </span>
              <div className="inline-flex items-center gap-1">
                {GOAL_PRESETS.map((xpVal) => (
                  <button
                    key={xpVal}
                    type="button"
                    onClick={() => handleSelectTarget(xpVal)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      targetXp === xpVal
                        ? 'bg-[#6D28D9] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {xpVal}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#090D20] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F97316] via-[#FBBF24] to-[#10B981] transition-all duration-300"
                style={{ width: `${streakProtectedToday ? Math.max(goalPct, 100) : goalPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Weekly Streak Calendar */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {last7Days.map((day) => (
          <div
            key={day.dateKey}
            className={`py-1.5 rounded-lg border text-[10px] flex flex-col items-center gap-0.5 ${
              day.active
                ? 'border-amber-400/60 bg-orange-500/15 text-[#FBBF24] font-bold'
                : day.isToday
                ? 'border-cyan-400/50 bg-[#0B1026] text-cyan-200'
                : 'border-indigo-400/15 bg-[#0B1026]/70 text-slate-400'
            }`}
          >
            <span>{day.dayLabel}</span>
            <Flame className={`w-3 h-3 ${day.active ? 'fill-current text-[#F97316]' : 'opacity-25'}`} />
          </div>
        ))}
      </div>

      {/* Live 6-Metric Player Telemetry Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-indigo-400/15 text-center">
        {[
          { label: 'Total XP', val: animXp.toLocaleString(), tone: 'text-violet-300' },
          { label: 'Level', val: `Lv.${playerLevel}`, tone: 'text-cyan-300' },
          { label: 'Lessons', val: `${lessonsCompletedCount}/100`, tone: 'text-emerald-300' },
          { label: '3D Clears', val: `${missionsCompletedCount}/100`, tone: 'text-sky-300' },
          { label: 'Coins', val: animCoins.toLocaleString(), tone: 'text-[#FBBF24]' },
          { label: 'Rank', val: `#${playerRankNumber}`, tone: 'text-orange-300' },
        ].map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="text-[10px] text-slate-400 truncate">{m.label}</div>
            <div className={`text-xs font-mono font-bold tabular-nums ${m.tone}`}>{m.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
