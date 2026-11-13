import React, { useMemo } from 'react';
import { ArrowRight, Award } from 'lucide-react';
import { ActivityLogItem } from '../../types/codeland';
import { ACHIEVEMENTS_CATALOG } from '../../data/charactersAndBadges';
import { BadgeIcon } from '../BadgeIcon';

interface RecentAchievementsCardProps {
  unlockedAchievementIds: string[];
  activityLogs: ActivityLogItem[];
  onViewAll: () => void;
  onStartFirstLesson: () => void;
}

function formatShortDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const RecentAchievementsCard: React.FC<RecentAchievementsCardProps> = ({
  unlockedAchievementIds,
  activityLogs,
  onViewAll,
  onStartFirstLesson,
}) => {
  const recentBadges = useMemo(() => {
    const matched = ACHIEVEMENTS_CATALOG.filter((b) => unlockedAchievementIds.includes(b.id));
    return matched
      .slice(-4)
      .reverse()
      .map((badge) => {
        const logMatch = activityLogs.find(
          (log) =>
            log.activityId.includes(badge.id) ||
            log.title.toLowerCase().includes(badge.title.toLowerCase())
        );
        return {
          ...badge,
          unlockedDateLabel: formatShortDate(logMatch?.timestampIso),
        };
      });
  }, [unlockedAchievementIds, activityLogs]);

  return (
    <section
      aria-label="Recent Achievements"
      className="h-full rounded-2xl border border-indigo-400/25 bg-[#111936] p-5 flex flex-col justify-between gap-4 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] tracking-tight truncate">
              Recent Achievements
            </h2>
            <p className="text-[11px] font-mono tabular-nums text-slate-300">
              {unlockedAchievementIds.length} / {ACHIEVEMENTS_CATALOG.length} Badges Unlocked
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FBBF24] hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Badges List or Empty State */}
      {recentBadges.length === 0 ? (
        <div className="rounded-xl border border-indigo-400/20 bg-[#0B1026] p-5 text-center space-y-3">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Complete your first Java lesson or restore a Starter Forest landmark to earn your first
            badge: <strong className="text-[#FBBF24]">First Steps (+20 XP)</strong>.
          </p>
          <button
            type="button"
            onClick={onStartFirstLesson}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#6D28D9] hover:bg-[#7C3AED] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Start First Quest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recentBadges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={onViewAll}
              className="text-left p-3 rounded-xl bg-[#0B1026] border border-indigo-400/20 hover:border-amber-400/50 transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="transition-transform duration-150 group-hover:scale-105 shrink-0">
                <BadgeIcon kind={badge.iconKind} accentHex={badge.accentHex} size={38} />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-extrabold text-white truncate">{badge.title}</div>
                <div className="text-[11px] text-slate-300 line-clamp-1">{badge.description}</div>
                <div className="text-[10px] font-mono tabular-nums text-amber-300">
                  +{badge.bonusXp} XP
                  {badge.unlockedDateLabel ? ` · ${badge.unlockedDateLabel}` : ' · Unlocked'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
