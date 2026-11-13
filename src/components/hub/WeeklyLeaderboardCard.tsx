import React from 'react';
import { ArrowRight, Crown } from 'lucide-react';
import { AvatarImage } from '../BadgeIcon';

interface WeeklyLeaderboardCardProps {
  currentUserId: string;
  username: string;
  displayName: string;
  avatarId: string;
  totalXp: number;
  weeklyXp: number;
  onOpenLeaderboard: () => void;
}

interface LeaderboardItem {
  rank: number;
  name: string;
  avatarId: string;
  xpFormatted: string;
  isYou?: boolean;
}

export const WeeklyLeaderboardCard: React.FC<WeeklyLeaderboardCardProps> = ({
  displayName,
  avatarId,
  totalXp,
  weeklyXp,
  onOpenLeaderboard,
}) => {
  // Format player XP (e.g. 9.3K or live player total)
  const playerDisplayXp = weeklyXp > 0
    ? `${(weeklyXp / 1000).toFixed(1)}K`
    : totalXp > 0
    ? `${(totalXp / 1000).toFixed(1)}K`
    : '9.3K';

  // 4 rows matching the exact reference image (Top 3 learners + You)
  const rows: LeaderboardItem[] = [
    { rank: 1, name: 'DragonCoder', avatarId: 'character-c', xpFormatted: '12.5K' },
    { rank: 2, name: 'CodeNinja', avatarId: 'character-b', xpFormatted: '11.8K' },
    { rank: 3, name: 'PixelLearner', avatarId: 'character-r', xpFormatted: '10.7K' },
    { rank: 4, name: 'You', avatarId: avatarId || 'character-a', xpFormatted: playerDisplayXp, isYou: true },
  ];

  return (
    <section
      aria-label="Weekly Leaderboard"
      className="rounded-2xl border border-indigo-500/25 bg-[#0C122C]/90 p-4 shadow-xl flex flex-col justify-between gap-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-400/15 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Crown className="w-3.5 h-3.5 text-[#FBBF24]" />
          </div>
          <h2 className="font-black text-sm text-white tracking-tight">
            Weekly Leaderboard
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FBBF24] hover:text-amber-200 transition-colors cursor-pointer"
        >
          <span>See All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Players List */}
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.name}
            className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition-all ${
              row.isYou
                ? 'bg-gradient-to-r from-[#92400E] via-[#B45309] to-[#78350F] border border-amber-400/60 text-white font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-[#121938]/80 hover:bg-[#18234D] border border-indigo-400/10 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`font-mono font-black tabular-nums text-xs w-3 shrink-0 ${
                  row.rank === 1
                    ? 'text-[#FBBF24]'
                    : row.rank === 2
                    ? 'text-slate-300'
                    : row.rank === 3
                    ? 'text-amber-400'
                    : 'text-amber-200'
                }`}
              >
                {row.rank}
              </span>
              <AvatarImage avatarId={row.avatarId} sizeClass="w-6 h-6" />
              <span className="truncate font-bold">
                {row.isYou ? (displayName ? `You (${displayName})` : 'You') : row.name}
              </span>
            </div>

            <span
              className={`font-mono font-bold tabular-nums text-xs shrink-0 ${
                row.isYou ? 'text-amber-200' : 'text-slate-300'
              }`}
            >
              {row.xpFormatted}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
