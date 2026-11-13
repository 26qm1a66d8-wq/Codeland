import React from 'react';
import { ArrowRight, CheckCircle2, Compass, Lock, Sparkles } from 'lucide-react';
import { World1PersistentState } from '../../types/codeland';
import { CAMPAIGN_WORLDS, getLevelsForWorld } from '../../data/campaign100';
import { WORLD1_SITE_ORDER } from '../../data/world1ForestData';
import { WorldBiomePortalArt } from './VoxelHubArtwork';

interface WorldPortalsGridProps {
  completedMissions: string[];
  world1State: World1PersistentState;
  isCampaignLevelUnlocked: (levelNumber: number) => boolean;
  onEnterWorld1: (levelNumber: number) => void;
  onOpenCampaignLevel: (levelNumber: number) => void;
  onExploreAllWorlds: () => void;
  onLockedWorldClick: (worldId: string) => void;
}

const PORTAL_THEMES: Record<
  number,
  {
    borderClass: string;
    glowShadow: string;
    barClass: string;
    accentText: string;
    buttonClass: string;
  }
> = {
  1: {
    borderClass: 'border-emerald-400/55 hover:border-emerald-300',
    glowShadow: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.28)]',
    barClass: 'from-[#10B981] to-[#34D399]',
    accentText: 'text-emerald-300',
    buttonClass: 'bg-emerald-500 hover:bg-emerald-400 text-[#061A14]',
  },
  2: {
    borderClass: 'border-cyan-400/55 hover:border-cyan-300',
    glowShadow: 'hover:shadow-[0_0_28px_rgba(34,211,238,0.28)]',
    barClass: 'from-[#06B6D4] to-[#67E8F9]',
    accentText: 'text-cyan-300',
    buttonClass: 'bg-cyan-400 hover:bg-cyan-300 text-[#071926]',
  },
  3: {
    borderClass: 'border-amber-400/55 hover:border-amber-300',
    glowShadow: 'hover:shadow-[0_0_28px_rgba(245,158,11,0.28)]',
    barClass: 'from-[#F59E0B] to-[#FDE047]',
    accentText: 'text-amber-300',
    buttonClass: 'bg-amber-400 hover:bg-amber-300 text-[#1F1304]',
  },
  4: {
    borderClass: 'border-sky-400/55 hover:border-sky-300',
    glowShadow: 'hover:shadow-[0_0_28px_rgba(56,189,248,0.28)]',
    barClass: 'from-[#0EA5E9] to-[#7DD3FC]',
    accentText: 'text-sky-300',
    buttonClass: 'bg-sky-400 hover:bg-sky-300 text-[#071929]',
  },
  5: {
    borderClass: 'border-purple-400/55 hover:border-purple-300',
    glowShadow: 'hover:shadow-[0_0_28px_rgba(168,85,247,0.3)]',
    barClass: 'from-[#9333EA] to-[#D8B4FE]',
    accentText: 'text-purple-300',
    buttonClass: 'bg-purple-500 hover:bg-purple-400 text-white',
  },
  6: {
    borderClass: 'border-violet-400/60 hover:border-amber-300',
    glowShadow: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]',
    barClass: 'from-[#8B5CF6] via-[#EC4899] to-[#FBBF24]',
    accentText: 'text-violet-300',
    buttonClass: 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#A855F7] hover:to-[#7C3AED] text-white',
  },
};

export const WorldPortalsGrid: React.FC<WorldPortalsGridProps> = ({
  completedMissions,
  world1State,
  isCampaignLevelUnlocked,
  onEnterWorld1,
  onOpenCampaignLevel,
  onExploreAllWorlds,
  onLockedWorldClick,
}) => {
  return (
    <section
      aria-label="Six Magical World Portals"
      className="rounded-2xl border border-indigo-400/25 bg-[#0F1633] p-5 sm:p-6 space-y-5 shadow-lg"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC] tracking-tight">
              Six Magical World Portals
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Step through each realm&apos;s stone gateway to master Java concepts from{' '}
            <code className="font-mono text-cyan-300">System.out.println()</code> to Object-Oriented
            Citadel engineering.
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreAllWorlds}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#192350] hover:bg-[#23316D] text-[#FBBF24] border border-indigo-400/35 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Explore All Realms</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6 Arched Voxel Portal Gateways */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {CAMPAIGN_WORLDS.map((w) => {
          const levels = getLevelsForWorld(w.worldNumber);
          const clearedCount = levels.filter((l) =>
            completedMissions.includes(`M${l.levelNumber}`)
          ).length;
          const totalInWorld = levels.length;
          const isW1 = w.worldNumber === 1;

          const w1Stages = isW1
            ? WORLD1_SITE_ORDER.reduce(
                (sum, k) => sum + Math.min(4, world1State.structureStages[k] || 0),
                0
              )
            : 0;

          const completionPct = isW1
            ? Math.round((w1Stages / 40) * 100)
            : Math.round((clearedCount / totalInWorld) * 100);

          const worldUnlocked = isCampaignLevelUnlocked(w.levelRange[0]);
          const worldCompleted = clearedCount === totalInWorld;
          const nextInWorld =
            levels.find((l) => !completedMissions.includes(`M${l.levelNumber}`)) || levels[0];

          const theme = PORTAL_THEMES[w.worldNumber] || PORTAL_THEMES[1];

          const handlePortalActivate = () => {
            if (!worldUnlocked) {
              onLockedWorldClick(w.worldId);
              return;
            }
            if (isW1) {
              onEnterWorld1(nextInWorld.levelNumber);
            } else {
              onOpenCampaignLevel(nextInWorld.levelNumber);
            }
          };

          return (
            <div
              key={w.worldId}
              onClick={handlePortalActivate}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePortalActivate();
                }
              }}
              className={`group relative rounded-t-[2.25rem] rounded-b-2xl border-2 bg-[#0B1026] p-3 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer ${
                worldUnlocked
                  ? `${theme.borderClass} ${theme.glowShadow} hover:-translate-y-1`
                  : 'border-slate-700/70 opacity-80 hover:border-slate-500'
              }`}
            >
              <div className="space-y-2.5">
                {/* Carved Portal Arch Viewport */}
                <div className="relative rounded-t-[1.75rem] rounded-b-xl overflow-hidden border border-white/15 bg-[#070B1C] aspect-[16/11]">
                  <div className="w-full h-full transition-transform duration-200 group-hover:scale-105">
                    <WorldBiomePortalArt worldNumber={w.worldNumber} />
                  </div>

                  {/* Top Keystone Rune Emblem */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#0B1026]/90 border border-white/20 text-[10px] font-mono font-bold tabular-nums text-white whitespace-nowrap">
                    W{w.worldNumber} · Lv.{w.levelRange[0]}–{w.levelRange[1]}
                  </div>

                  {/* Status Corner Indicator */}
                  <div className="absolute bottom-1.5 right-1.5">
                    {worldCompleted ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-[#051B11] text-[10px] font-extrabold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>100%</span>
                      </span>
                    ) : !worldUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-600 text-[10px] font-semibold">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0B1026]/90 text-[#FBBF24] border border-amber-400/40 text-[10px] font-mono font-bold tabular-nums">
                        {completionPct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* World Title & Mentor */}
                <div className="space-y-1 px-0.5">
                  <div className={`text-[10px] font-mono font-bold tracking-wider ${theme.accentText}`}>
                    WORLD {w.worldNumber}
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-tight truncate">
                    {w.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Levels {w.levelRange[0]}–{w.levelRange[1]} · {w.mentorName}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 px-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-300">
                    <span>{isW1 ? 'Stages' : 'Cleared'}</span>
                    <span>
                      {isW1 ? `${w1Stages}/40` : `${clearedCount}/${totalInWorld}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#161F42] overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${theme.barClass} transition-all duration-300`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Portal Action Button */}
              {worldUnlocked ? (
                <span
                  className={`w-full py-2 px-2.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${theme.buttonClass}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {worldCompleted
                      ? 'Replay Realm'
                      : isW1
                      ? `Enter Lv.${nextInWorld.levelNumber}`
                      : `Open Lv.${nextInWorld.levelNumber}`}
                  </span>
                </span>
              ) : (
                <span className="w-full py-2 px-2.5 rounded-xl text-[11px] font-mono font-semibold bg-[#131B3A] text-slate-400 border border-slate-700/70 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Clear Lv.{w.levelRange[0] - 1}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
