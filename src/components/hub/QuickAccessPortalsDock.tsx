import React from 'react';
import { QuickPedestalKind, QuickPortalPedestalArt, VoxelSnowmanArt } from './VoxelHubArtwork';
import { Sparkles, ArrowRight } from 'lucide-react';

interface QuickAccessPortalsDockProps {
  pendingInvitesCount: number;
  unlockedBadgesCount: number;
  world1BuiltStages: number;
  onOpenWorlds: () => void;
  onOpenCodeLab: () => void;
  onOpenFriends: () => void;
  onOpenAchievements: () => void;
  onOpenShop: () => void;
  onOpenMyBase: () => void;
  onOpenWinterEvent: () => void;
}

interface PedestalItem {
  id: string;
  kind: QuickPedestalKind;
  label: string;
  hoverBorder: string;
  onClick: () => void;
}

export const QuickAccessPortalsDock: React.FC<QuickAccessPortalsDockProps> = ({
  pendingInvitesCount,
  unlockedBadgesCount,
  world1BuiltStages,
  onOpenWorlds,
  onOpenCodeLab,
  onOpenFriends,
  onOpenAchievements,
  onOpenShop,
  onOpenMyBase,
  onOpenWinterEvent,
}) => {
  const pedestals: PedestalItem[] = [
    {
      id: 'pedestal-worlds',
      kind: 'worlds',
      label: 'Six Worlds',
      hoverBorder: 'hover:border-cyan-400/80',
      onClick: onOpenWorlds,
    },
    {
      id: 'pedestal-codelab',
      kind: 'codelab',
      label: 'CodeLab',
      hoverBorder: 'hover:border-purple-400/80',
      onClick: onOpenCodeLab,
    },
    {
      id: 'pedestal-friends',
      kind: 'friends',
      label: 'Friends',
      hoverBorder: 'hover:border-sky-400/80',
      onClick: onOpenFriends,
    },
    {
      id: 'pedestal-achievements',
      kind: 'achievements',
      label: 'Achievements',
      hoverBorder: 'hover:border-amber-400/80',
      onClick: onOpenAchievements,
    },
    {
      id: 'pedestal-shop',
      kind: 'shop',
      label: 'Shop',
      hoverBorder: 'hover:border-yellow-400/80',
      onClick: onOpenShop,
    },
    {
      id: 'pedestal-base',
      kind: 'base',
      label: 'My Base',
      hoverBorder: 'hover:border-emerald-400/80',
      onClick: onOpenMyBase,
    },
  ];

  return (
    <section
      aria-label="Quick Access Portals and Seasonal Event"
      className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch"
    >
      {/* 6 Quick-Access Voxel Pedestals */}
      <div className="xl:col-span-9 rounded-2xl border border-indigo-400/25 bg-gradient-to-b from-[#131C3F] to-[#0B1026] p-3 sm:p-4 shadow-lg">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {pedestals.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group rounded-2xl border border-indigo-400/20 ${item.hoverBorder} bg-[#0B1026]/90 hover:bg-[#151F47] px-2 sm:px-3 py-3 flex flex-col items-center text-center gap-1.5 transition-all duration-150 hover:-translate-y-1 cursor-pointer`}
            >
              <div className="transition-transform duration-200 group-hover:scale-110">
                <QuickPortalPedestalArt kind={item.kind} />
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] whitespace-nowrap">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Join the Winter Event Card with Snowman Art (Matches reference image bottom right) */}
      <div className="xl:col-span-3">
        <div className="h-full rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-[#122552] via-[#0E1B3E] to-[#0A122E] p-3 sm:p-4 shadow-lg flex items-center justify-between gap-3 relative overflow-hidden group">
          <div className="space-y-1.5 min-w-0 z-10">
            <div className="text-xs sm:text-sm font-black text-white leading-tight">
              Join the
              <br />
              Winter Event!
            </div>
            <button
              type="button"
              onClick={onOpenWinterEvent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FDE047] via-[#FBBF24] to-[#F59E0B] text-[#0B1026] text-xs font-black shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="shrink-0 transition-transform duration-200 group-hover:scale-105 z-10">
            <VoxelSnowmanArt size={76} />
          </div>

          {/* Background subtle snow glow */}
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
};
