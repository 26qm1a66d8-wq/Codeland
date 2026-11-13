import React, { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { VoxelTreasureChestArt } from './VoxelHubArtwork';

interface DailyRewardChestCardProps {
  claimedToday: boolean;
  effectiveStreak: number;
  onClaim: () => Promise<{
    claimed: boolean;
    xpAwarded: number;
    coinsAwarded: number;
    streakBonusCoins: number;
  }>;
}

export const DailyRewardChestCard: React.FC<DailyRewardChestCardProps> = ({
  claimedToday,
  effectiveStreak,
  onClaim,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [justGranted, setJustGranted] = useState<{
    xp: number;
    coins: number;
    streakBonus: number;
  } | null>(null);

  const previewStreakBonus = Math.min(20, Math.max(0, effectiveStreak) * 2);
  const previewCoins = 20 + previewStreakBonus;

  const handleClaimClick = async () => {
    if (claimedToday || claiming) return;
    setClaiming(true);
    try {
      const res = await onClaim();
      if (res.claimed) {
        setJustGranted({
          xp: res.xpAwarded,
          coins: res.coinsAwarded,
          streakBonus: res.streakBonusCoins,
        });
      }
    } finally {
      setClaiming(false);
    }
  };

  const isOpen = claimedToday || Boolean(justGranted);

  return (
    <section
      aria-label="Daily Reward Chest"
      className={`rounded-2xl p-3.5 border transition-all shadow-lg ${
        isOpen
          ? 'bg-gradient-to-r from-[#191F45] via-[#241B4D] to-[#191F45] border-indigo-400/35'
          : 'bg-gradient-to-r from-[#2E1065] via-[#4C1D95] to-[#2E1065] border-amber-400/55'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="transition-transform duration-200 hover:scale-105 shrink-0">
            <VoxelTreasureChestArt isOpen={isOpen} size={66} />
          </div>

          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-[#FBBF24] leading-tight truncate">
              Daily Reward
            </h2>

            {justGranted ? (
              <p className="text-xs font-semibold text-emerald-300 leading-snug">
                Granted +{justGranted.xp} XP &amp; +{justGranted.coins} Byte Coins!
              </p>
            ) : claimedToday ? (
              <p className="text-xs text-slate-300 leading-snug">
                Claimed for today · Next chest unlocks tomorrow
              </p>
            ) : (
              <p className="text-xs text-purple-100 leading-snug">
                Claim +30 XP &amp; +{previewCoins} Coins
              </p>
            )}

            <div className="text-[11px] font-mono tabular-nums text-indigo-200/85">
              {previewStreakBonus > 0
                ? `Includes +${previewStreakBonus} Streak Bonus Coins`
                : 'Build a streak for bonus Byte Coins'}
            </div>
          </div>
        </div>

        {claimedToday ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs font-bold text-emerald-300 whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Claimed</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={claiming}
            onClick={() => void handleClaimClick()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-b from-[#FDE047] via-[#FBBF24] to-[#F59E0B] hover:from-[#FEF08A] hover:to-[#FBBF24] disabled:opacity-60 text-[#111827] shadow-md transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{claiming ? 'Opening...' : 'Claim'}</span>
          </button>
        )}
      </div>
    </section>
  );
};
