import React from 'react';
import { ArrowRight } from 'lucide-react';
import { VoxelSnowmanArt } from './VoxelHubArtwork';

interface CobblestonePedestalsDockProps {
  onOpenSkills: () => void;
  onOpenQuests: () => void;
  onOpenAchievements: () => void;
  onOpenShop: () => void;
  onOpenMyBase: () => void;
  onOpenWinterEvent: () => void;
}

interface PedestalItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  haloColor: string;
  glowShadow: string;
}

export const CobblestonePedestalsDock: React.FC<CobblestonePedestalsDockProps> = ({
  onOpenSkills,
  onOpenQuests,
  onOpenAchievements,
  onOpenShop,
  onOpenMyBase,
  onOpenWinterEvent,
}) => {
  const pedestals: PedestalItem[] = [
    {
      id: 'pedestal-skills',
      label: 'Skills',
      haloColor: 'border-cyan-400/90',
      glowShadow: 'shadow-[0_0_16px_rgba(6,182,212,0.45)]',
      onClick: onOpenSkills,
      icon: (
        /* Floating Voxel Island & Ancient Rune Gateway (Cyan Aura) */
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_3px_8px_rgba(6,182,212,0.4)]">
            {/* Floating Island Bottom Spire */}
            <polygon points="24,44 14,35 24,31 34,35" fill="#1E293B" />
            <polygon points="14,35 24,44 24,38 14,31" fill="#0F172A" />
            <polygon points="34,35 24,44 24,38 34,31" fill="#334155" />

            {/* Lush Island Grass Layer */}
            <polygon points="24,33 10,25 24,18 38,25" fill="#06B6D4" />
            <polygon points="10,25 24,33 24,36 10,28" fill="#0891B2" />
            <polygon points="38,25 24,33 24,36 38,28" fill="#0E7490" />

            {/* Glowing Mana Tree & Ancient Runestone */}
            <polygon points="24,20 18,17 24,12 30,17" fill="#67E8F9" />
            <polygon points="24,14 20,11 24,7 28,11" fill="#A5F3FC" />
            <rect x="22" y="20" width="4" height="5" fill="#0F766E" />

            {/* Orbiting Sparkles */}
            <circle cx="14" cy="18" r="1.5" fill="#E0F2FE" className="animate-pulse" />
            <circle cx="34" cy="12" r="1.5" fill="#67E8F9" className="animate-pulse" />
          </svg>
        </div>
      ),
    },
    {
      id: 'pedestal-quests',
      label: 'Quests',
      haloColor: 'border-purple-400/90',
      glowShadow: 'shadow-[0_0_16px_rgba(168,85,247,0.45)]',
      onClick: onOpenQuests,
      icon: (
        /* 3D Isometric Cyber Voxel Laptop & Quest Codex (Electric Violet Aura) */
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_3px_8px_rgba(168,85,247,0.45)]">
            {/* Laptop Base / Keyboard */}
            <polygon points="24,40 10,32 24,24 38,32" fill="#2E1065" />
            <polygon points="10,32 24,40 24,42 10,34" fill="#1E1B4B" />
            <polygon points="38,32 24,40 24,42 38,34" fill="#3B0764" />

            {/* Laptop Screen Upper Bezel */}
            <polygon points="24,26 12,20 12,8 24,14" fill="#581C87" />
            <polygon points="24,26 36,20 36,8 24,14" fill="#3B0764" />
            <polygon points="24,14 12,8 24,2 36,8" fill="#7E22CE" />

            {/* Glowing Screen Display with Code Syntax */}
            <polygon points="24,23 15,18 15,10 24,15" fill="#9333EA" />
            <polygon points="24,23 33,18 33,10 24,15" fill="#7E22CE" />
            <line x1="18" y1="14" x2="22" y2="17" stroke="#F5D0FE" strokeWidth="1.5" />
            <line x1="30" y1="14" x2="26" y2="17" stroke="#F5D0FE" strokeWidth="1.5" />
          </svg>
        </div>
      ),
    },
    {
      id: 'pedestal-achievements',
      label: 'Achievements',
      haloColor: 'border-amber-400/90',
      glowShadow: 'shadow-[0_0_16px_rgba(245,158,11,0.45)]',
      onClick: onOpenAchievements,
      icon: (
        /* 3D Isometric Golden Trophy on Marble Plinth (Warm Gold Aura) */
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_3px_8px_rgba(245,158,11,0.45)]">
            {/* Plinth Base */}
            <polygon points="24,42 16,38 24,34 32,38" fill="#78350F" />
            <polygon points="16,38 24,42 24,44 16,40" fill="#451A03" />
            <polygon points="32,38 24,42 24,44 32,40" fill="#92400E" />

            {/* Trophy Stem */}
            <rect x="22" y="27" width="4" height="7" fill="#B45309" />

            {/* Golden Trophy Cup Body */}
            <polygon points="24,28 14,21 14,12 24,17" fill="#F59E0B" />
            <polygon points="24,28 34,21 34,12 24,17" fill="#D97706" />
            <polygon points="24,17 14,12 24,7 34,12" fill="#FDE047" />

            {/* Twin Handles */}
            <path d="M14 14 C10 14 10 20 14 20" stroke="#FBBF24" strokeWidth="2" fill="none" />
            <path d="M34 14 C38 14 38 20 34 20" stroke="#F59E0B" strokeWidth="2" fill="none" />

            {/* Sparkle Star */}
            <circle cx="24" cy="6" r="2" fill="#FEF08A" className="animate-pulse" />
          </svg>
        </div>
      ),
    },
    {
      id: 'pedestal-shop',
      label: 'Shop',
      haloColor: 'border-yellow-400/90',
      glowShadow: 'shadow-[0_0_16px_rgba(251,191,36,0.45)]',
      onClick: onOpenShop,
      icon: (
        /* 3D Voxel Golden Treasure Chest (Imperial Gold Aura) */
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_3px_8px_rgba(251,191,36,0.45)]">
            {/* Chest Lower Body */}
            <polygon points="24,39 12,32 12,23 24,30" fill="#B45309" />
            <polygon points="24,39 36,32 36,23 24,30" fill="#92400E" />
            <polygon points="24,30 12,23 24,16 36,23" fill="#D97706" />

            {/* Chest Vaulted Lid */}
            <polygon points="24,23 11,16 11,12 24,18" fill="#F59E0B" />
            <polygon points="24,23 37,16 37,12 24,18" fill="#D97706" />
            <polygon points="24,18 11,12 24,7 37,12" fill="#FDE047" />

            {/* Gold Iron Bands & Lock */}
            <rect x="22" y="24" width="4" height="6" fill="#FBBF24" rx="1" />
            <circle cx="24" cy="27" r="1.5" fill="#7E22CE" />
            <line x1="17" y1="15" x2="17" y2="28" stroke="#FDE047" strokeWidth="1.5" />
            <line x1="31" y1="15" x2="31" y2="28" stroke="#FDE047" strokeWidth="1.5" />
          </svg>
        </div>
      ),
    },
    {
      id: 'pedestal-my-base',
      label: 'My Base',
      haloColor: 'border-indigo-400/90',
      glowShadow: 'shadow-[0_0_16px_rgba(129,140,248,0.45)]',
      onClick: onOpenMyBase,
      icon: (
        /* 3D Isometric Voxel Timber Manor / Cottage (Warm Twilight Indigo Aura) */
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_3px_8px_rgba(129,140,248,0.45)]">
            {/* Stone Foundation */}
            <polygon points="24,42 12,35 24,28 36,35" fill="#334155" />
            <polygon points="12,35 24,42 24,44 12,37" fill="#1E293B" />
            <polygon points="36,35 24,42 24,44 36,37" fill="#475569" />

            {/* Timber Walls */}
            <polygon points="24,33 14,27 14,19 24,24" fill="#92400E" />
            <polygon points="24,33 34,27 34,19 24,24" fill="#78350F" />

            {/* Warm Illuminated Windows */}
            <rect x="17" y="24" width="3" height="4" fill="#FEF08A" />
            <rect x="28" y="24" width="3" height="4" fill="#FDE047" />

            {/* Pitched Roof */}
            <polygon points="24,22 10,14 24,6 38,14" fill="#4338CA" />
            <polygon points="10,14 24,22 24,24 10,16" fill="#3730A3" />
            <polygon points="38,14 24,22 24,24 38,16" fill="#312E81" />

            {/* Stone Chimney & Smoke Puff */}
            <rect x="29" y="8" width="3" height="6" fill="#64748B" />
            <circle cx="31" cy="6" r="1.5" fill="#CBD5E1" opacity="0.8" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-label="Carved Cobblestone Pedestals Dock"
      className="relative rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-[#0C112C] via-[#090D22] to-[#060818] p-3 sm:p-4 shadow-2xl overflow-hidden"
    >
      {/* Subtle stone pavement texture background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#818CF8_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 flex flex-col xl:flex-row items-stretch gap-4 justify-between">
        {/* 5 Carved Stone Pedestals with Glowing Runestone Halos (Synced with App Palette) */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
          {pedestals.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="group flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border border-indigo-500/25 hover:border-indigo-400/60 bg-gradient-to-b from-[#162044] via-[#101733] to-[#0A0E23] hover:from-[#1D2B5C] hover:to-[#0F1636] shadow-lg transition-all duration-200 hover:-translate-y-1.5 cursor-pointer focus:outline-none"
            >
              {/* Circular Neon Halo Ring matching reference image */}
              <div
                className={`w-14 h-14 rounded-full border-2 ${item.haloColor} ${item.glowShadow} bg-[#0A0E24]/80 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110`}
              >
                {item.icon}
              </div>

              {/* Title Badge */}
              <div className="font-black text-xs text-slate-100 group-hover:text-amber-300 transition-colors tracking-tight">
                {item.label}
              </div>
            </button>
          ))}
        </div>

        {/* Flanking Purple Glowing Crystals Cluster Asset (Matching reference image) */}
        <div className="hidden lg:flex items-center justify-center px-1">
          <svg width="44" height="52" viewBox="0 0 44 52" fill="none" className="drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]">
            <polygon points="14,50 22,8 30,50" fill="#A855F7" />
            <polygon points="18,50 22,8 26,50" fill="#E9D5FF" />
            <polygon points="4,50 12,20 20,50" fill="#9333EA" />
            <polygon points="24,50 32,20 40,50" fill="#7E22CE" />
            <polygon points="28,50 32,20 36,50" fill="#C084FC" />
          </svg>
        </div>

        {/* Join the Winter Event! Banner with 3D Snowman */}
        <div className="xl:w-80 shrink-0">
          <div className="h-full rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-br from-[#1E1B4B] via-[#172554] to-[#0F172A] p-3 sm:p-4 shadow-xl flex items-center justify-between gap-3 relative overflow-hidden group">
            <div className="space-y-2 min-w-0 z-10">
              <div className="text-xs sm:text-sm font-black text-white leading-tight">
                Join the
                <br />
                Winter Event!
              </div>
              <button
                type="button"
                onClick={onOpenWinterEvent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FDE047] via-[#FBBF24] to-[#F59E0B] text-[#0B1026] text-xs font-black shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <div className="shrink-0 transition-transform duration-200 group-hover:scale-105 z-10">
              <VoxelSnowmanArt size={74} />
            </div>

            {/* Glowing snowflake backdrop effect */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};
