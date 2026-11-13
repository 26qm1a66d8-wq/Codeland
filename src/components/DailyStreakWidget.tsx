import React, { useMemo, useState } from 'react';
import { CheckCircle2, Flame, Play, Trophy } from 'lucide-react';
import {
  formatLocalDateKey,
  getEncouragingStreakMessage,
  getLastNDaysCalendar,
  getNextStreakMilestone,
} from '../lib/dateUtils';

const DAILY_GOAL_TARGET_KEY = 'codeland_daily_xp_target_v1';
const GOAL_PRESETS = [
  { xp: 50, label: '50 XP' },
  { xp: 100, label: '100 XP' },
  { xp: 150, label: '150 XP' },
] as const;

export interface DailyStreakWidgetProps {
  effectiveStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  dailyXp: number;
  lastDailyKey: string;
  activityDates: string[];
  dailyGoalStatus: {
    lessonDone: boolean;
    exercisesCount: number;
    missionDone: boolean;
  };
  onContinueGoal: () => void;
  continueLabel?: string;
}

function getFlameTierVisuals(streakDays: number): {
  tierTitle: string;
  outerStroke: string;
  outerFill: string;
  innerCoreFill: string;
  containerBg: string;
  containerBorder: string;
  scaleClass: string;
} {
  if (streakDays <= 0) {
    return {
      tierTitle: 'Dormant Ember',
      outerStroke: '#78716C',
      outerFill: 'rgba(120, 113, 108, 0.22)',
      innerCoreFill: 'rgba(168, 162, 158, 0.35)',
      containerBg: 'bg-stone-100 dark:bg-[#101E17]',
      containerBorder: 'border-stone-300 dark:border-emerald-900/70',
      scaleClass: 'scale-95',
    };
  }
  if (streakDays < 3) {
    return {
      tierTitle: 'Kindled Spark',
      outerStroke: '#F28C45',
      outerFill: '#F28C45',
      innerCoreFill: '#F5C451',
      containerBg: 'bg-[#F28C45]/12 dark:bg-[#231C14]',
      containerBorder: 'border-[#F28C45]/50',
      scaleClass: 'scale-100',
    };
  }
  if (streakDays < 7) {
    return {
      tierTitle: 'Steady Flame',
      outerStroke: '#F28C45',
      outerFill: '#F28C45',
      innerCoreFill: '#FDE047',
      containerBg: 'bg-[#F28C45]/15 dark:bg-[#261E14]',
      containerBorder: 'border-[#F28C45]/70',
      scaleClass: 'scale-105',
    };
  }
  if (streakDays < 30) {
    return {
      tierTitle: 'Blazing Torch',
      outerStroke: '#F5C451',
      outerFill: '#F28C45',
      innerCoreFill: '#FEF08A',
      containerBg: 'bg-[#F5C451]/18 dark:bg-[#282213]',
      containerBorder: 'border-[#F5C451]/80',
      scaleClass: 'scale-110',
    };
  }
  return {
    tierTitle: 'Citadel Legend Flame',
    outerStroke: '#2F7D46',
    outerFill: '#F5C451',
    innerCoreFill: '#34D399',
    containerBg: 'bg-[#2F7D46]/15 dark:bg-[#183124]',
    containerBorder: 'border-[#F5C451]',
    scaleClass: 'scale-110',
  };
}

export const DailyStreakWidget: React.FC<DailyStreakWidgetProps> = ({
  effectiveStreak,
  longestStreak,
  totalActiveDays,
  dailyXp,
  lastDailyKey,
  activityDates,
  dailyGoalStatus,
  onContinueGoal,
  continueLabel = 'Continue Daily Goal',
}) => {
  const [targetXp, setTargetXp] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(DAILY_GOAL_TARGET_KEY));
      if (saved === 50 || saved === 100 || saved === 150) return saved;
    } catch {
      // Ignore storage access errors
    }
    return 100;
  });

  const handleSelectTarget = (xp: number) => {
    setTargetXp(xp);
    try {
      localStorage.setItem(DAILY_GOAL_TARGET_KEY, String(xp));
    } catch {
      // Ignore storage errors
    }
  };

  const todayKey = formatLocalDateKey();
  const earnedTodayXp = lastDailyKey === todayKey ? Math.max(0, dailyXp) : 0;

  // Combine XP earned today with quest completion milestones so progress reflects all daily effort
  const completedQuestsCount =
    (dailyGoalStatus.lessonDone ? 1 : 0) +
    (dailyGoalStatus.exercisesCount >= 3 ? 1 : 0) +
    (dailyGoalStatus.missionDone ? 1 : 0);

  const xpProgressPercent = Math.min(100, Math.round((earnedTodayXp / targetXp) * 100));
  const goalReached = earnedTodayXp >= targetXp || completedQuestsCount === 3;
  const displayProgressPercent = goalReached ? 100 : xpProgressPercent;
  const xpRemaining = Math.max(0, targetXp - earnedTodayXp);

  const flameVisual = useMemo(() => getFlameTierVisuals(effectiveStreak), [effectiveStreak]);
  const streakMessage = useMemo(
    () => getEncouragingStreakMessage(effectiveStreak),
    [effectiveStreak]
  );
  const nextMilestone = useMemo(
    () => getNextStreakMilestone(effectiveStreak),
    [effectiveStreak]
  );
  const last7Days = useMemo(
    () => getLastNDaysCalendar(7, activityDates),
    [activityDates]
  );

  return (
    <section
      aria-label="Daily Streak and Daily Goal Tracker"
      className="rounded-2xl border border-stone-300/90 dark:border-emerald-800/70 bg-white dark:bg-[#14261E] p-6 flex flex-col justify-between gap-5 shadow-sm"
    >
      {/* Header Row: Dynamic Flame Icon + Current Streak Length + Next Milestone */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Dynamic Multi-Layer Streak Flame Emblem */}
          <div
            className={`w-16 h-16 rounded-2xl border ${flameVisual.containerBorder} ${flameVisual.containerBg} flex flex-col items-center justify-center shrink-0 transition-transform duration-200`}
            title={`${effectiveStreak}-day streak (${flameVisual.tierTitle})`}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-200 ${flameVisual.scaleClass}`}
            >
              <path
                d="M18.6 4.5C19.8 10.6 28 13.4 28 21.6C28 27.5 23.6 31.8 18 31.8C12.4 31.8 8 27.4 8 21.3C8 16.9 10.7 13.5 13.4 11.2C13.1 14.5 15.1 16.5 17 16.5C16.4 11.8 16.9 7.6 18.6 4.5Z"
                fill={flameVisual.outerFill}
                stroke={flameVisual.outerStroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.2 15.5C19 18.4 22.8 19.8 22.8 23.8C22.8 26.7 20.7 28.8 18 28.8C15.3 28.8 13.2 26.7 13.2 23.8C13.2 21.4 14.8 19.6 16.4 18.4C16.5 19.8 17.3 20.6 18.1 20.6C17.8 18.7 17.8 16.9 18.2 15.5Z"
                fill={flameVisual.innerCoreFill}
              />
            </svg>
            <span className="text-[10px] font-mono font-bold tabular-nums text-stone-700 dark:text-stone-200 -mt-0.5">
              {effectiveStreak}d
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-[#F28C45]">Daily Streak</span>
              <span aria-hidden="true">·</span>
              <span>{flameVisual.tierTitle}</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#202923] dark:text-white">
                {effectiveStreak} {effectiveStreak === 1 ? 'Day' : 'Days'}
              </span>
              <span className="text-xs font-semibold text-[#2F7D46] dark:text-[#F5C451]">
                {streakMessage.headline}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
              <span>Longest: {longestStreak}d</span>
              <span aria-hidden="true">·</span>
              <span>Active Days: {totalActiveDays}d</span>
              <span aria-hidden="true">·</span>
              <span>
                Next Badge: {nextMilestone.targetDays}d ({nextMilestone.daysRemaining}d left)
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Daily Goal Target Selector (Functional Filter/Target Buttons) */}
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Daily XP Goal
          </span>
          <div
            role="group"
            aria-label="Select Daily XP Goal"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-[#0E1B15] border border-stone-200 dark:border-emerald-900/60"
          >
            {GOAL_PRESETS.map((preset) => {
              const active = targetXp === preset.xp;
              return (
                <button
                  key={preset.xp}
                  type="button"
                  onClick={() => handleSelectTarget(preset.xp)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#2F7D46] text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prominent Daily Goal Visual Progress Bar */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-900/60 bg-stone-50/90 dark:bg-[#0F1E17] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-800 dark:text-white">
            {goalReached ? (
              <CheckCircle2 className="w-4 h-4 text-[#2F7D46] dark:text-emerald-400 shrink-0" />
            ) : (
              <Flame className="w-4 h-4 text-[#F28C45] shrink-0" />
            )}
            <span>
              {goalReached
                ? 'Daily Goal Complete — Streak Protected!'
                : 'Today’s Daily Goal Progress'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            <span className="font-bold text-[#2F7D46] dark:text-[#F5C451]">
              {earnedTodayXp} / {targetXp} XP
            </span>
            <span aria-hidden="true" className="text-stone-400">
              ·
            </span>
            <span className="text-stone-600 dark:text-stone-300">{displayProgressPercent}%</span>
          </div>
        </div>

        {/* Visual Progress Bar with Milestone Ticks */}
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label="Daily XP Goal Progress"
            aria-valuenow={displayProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-3.5 rounded-full bg-stone-200 dark:bg-[#09120E] overflow-hidden border border-stone-300/60 dark:border-emerald-950"
          >
            <div
              className={`h-full transition-all duration-300 ${
                goalReached
                  ? 'bg-gradient-to-r from-[#2F7D46] to-emerald-400'
                  : 'bg-gradient-to-r from-[#F28C45] to-[#F5C451]'
              }`}
              style={{ width: `${displayProgressPercent}%` }}
            />
            {/* Quarter Tick Guides */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
              <div className="border-r border-black/10 dark:border-white/10" />
              <div className="border-r border-black/10 dark:border-white/10" />
              <div className="border-r border-black/10 dark:border-white/10" />
              <div />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
            <span>
              {goalReached
                ? `Goal met (+${earnedTodayXp} XP earned today)`
                : `${xpRemaining} XP remaining to hit your ${targetXp} XP daily target`}
            </span>
            <span>Quests: {completedQuestsCount}/3</span>
          </div>
        </div>

        {/* 3 Daily Quest Checkpoints (Unboxed Clean Row) */}
        <div className="pt-2 border-t border-stone-200/80 dark:border-emerald-900/50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            {
              label: '1 Java Lesson',
              stat: dailyGoalStatus.lessonDone ? '1/1' : '0/1',
              done: dailyGoalStatus.lessonDone,
            },
            {
              label: '3 Practice Tasks',
              stat: `${dailyGoalStatus.exercisesCount}/3`,
              done: dailyGoalStatus.exercisesCount >= 3,
            },
            {
              label: '1 3D Mission',
              stat: dailyGoalStatus.missionDone ? '1/1' : '0/1',
              done: dailyGoalStatus.missionDone,
            },
          ].map((quest) => (
            <div
              key={quest.label}
              className="flex items-center justify-between sm:justify-start gap-2 text-stone-700 dark:text-stone-300"
            >
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  quest.done
                    ? 'text-[#2F7D46] dark:text-emerald-400'
                    : 'text-stone-300 dark:text-stone-600'
                }`}
              />
              <span className={quest.done ? 'font-semibold text-[#2F7D46] dark:text-emerald-300' : ''}>
                {quest.label}
              </span>
              <span className="font-mono tabular-nums text-[11px] text-stone-500 dark:text-stone-400">
                ({quest.stat})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Encouraging Message + 7-Day Flame Calendar + Primary Action */}
      <div className="space-y-3.5">
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {streakMessage.encouragement}
        </p>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {last7Days.map((day) => (
            <div
              key={day.dateKey}
              className={`py-2 rounded-xl border text-xs flex flex-col items-center gap-1 ${
                day.active
                  ? 'border-[#F28C45] bg-[#F28C45]/12 text-[#F28C45] font-bold'
                  : day.isToday
                  ? 'border-stone-400 dark:border-emerald-700 text-stone-700 dark:text-stone-200'
                  : 'border-stone-200 dark:border-emerald-950 text-stone-400'
              }`}
            >
              <span className="text-[10px]">{day.dayLabel}</span>
              <Flame className={`w-3.5 h-3.5 ${day.active ? 'fill-current' : 'opacity-25'}`} />
              <span className="text-[10px] font-mono tabular-nums">{day.shortDate}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
            <Trophy className="w-3.5 h-3.5 text-[#F5C451] shrink-0" />
            <span>
              Milestone Progress: {effectiveStreak}/{nextMilestone.targetDays} days (
              {nextMilestone.progressPercent}%)
            </span>
          </div>

          <button
            type="button"
            onClick={onContinueGoal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{continueLabel}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
