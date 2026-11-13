import React from 'react';

export interface WorldPortalItem {
  id: string;
  worldNumber: number;
  name: string;
  levelRange: string;
  themeColor: string;
  glowColor: string;
  borderColor: string;
  accentRune: string;
  firstLevel: number;
}

export const REALM_PORTALS: WorldPortalItem[] = [
  {
    id: 'world-1',
    worldNumber: 1,
    name: 'Starter Forest',
    levelRange: '1-16',
    themeColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    borderColor: '#059669',
    accentRune: '#34D399',
    firstLevel: 1,
  },
  {
    id: 'world-2',
    worldNumber: 2,
    name: 'Variable Avenue',
    levelRange: '17-33',
    themeColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    borderColor: '#0891B2',
    accentRune: '#38BDF8',
    firstLevel: 17,
  },
  {
    id: 'world-3',
    worldNumber: 3,
    name: 'Logic Kingdom',
    levelRange: '34-50',
    themeColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    borderColor: '#D97706',
    accentRune: '#FBBF24',
    firstLevel: 34,
  },
  {
    id: 'world-4',
    worldNumber: 4,
    name: 'Looping Mountains',
    levelRange: '51-66',
    themeColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    borderColor: '#0284C7',
    accentRune: '#7DD3FC',
    firstLevel: 51,
  },
  {
    id: 'world-5',
    worldNumber: 5,
    name: 'Method Metro',
    levelRange: '67-83',
    themeColor: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.45)',
    borderColor: '#6366F1',
    accentRune: '#A5B4FC',
    firstLevel: 67,
  },
  {
    id: 'world-6',
    worldNumber: 6,
    name: 'Object Kingdom',
    levelRange: '84-100',
    themeColor: '#C084FC',
    glowColor: 'rgba(192, 132, 252, 0.5)',
    borderColor: '#9333EA',
    accentRune: '#E879F9',
    firstLevel: 84,
  },
];

interface WallEmbeddedWorldPortalsProps {
  onSelectWorld: (worldId: string, startLevel: number) => void;
  unlockedWorldCount?: number;
}

export const WallEmbeddedWorldPortals: React.FC<WallEmbeddedWorldPortalsProps> = ({
  onSelectWorld,
}) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-indigo-500/30 bg-[#0C122C]/95 shadow-2xl">
      {/* Stone rampart masonry header bar */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#172147] via-[#202D61] to-[#172147] border-b border-indigo-400/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-200 font-extrabold">
            Realm Gateways · 100 Campaign Worlds
          </span>
        </div>
        <span className="text-xs text-indigo-200/80 font-medium hidden sm:inline">
          Step into a portal to begin your mission
        </span>
      </div>

      {/* The 6 Arched Gateways Row on Stone Wall */}
      <div className="p-3 sm:p-4 bg-gradient-to-b from-[#0F1635] via-[#0B1028] to-[#070A1C]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {REALM_PORTALS.map((portal) => (
            <button
              key={portal.id}
              type="button"
              onClick={() => onSelectWorld(portal.id, portal.firstLevel)}
              className="group relative flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-1.5 focus:outline-none"
            >
              {/* Neon Arch Frame - Harmonized with twilight architecture */}
              <div
                className="relative w-full aspect-[3/4] max-h-[165px] rounded-t-full border-2 overflow-hidden flex flex-col items-center justify-between p-2 shadow-xl transition-all duration-300 group-hover:scale-[1.03]"
                style={{
                  borderColor: portal.accentRune,
                  boxShadow: `0 0 16px ${portal.glowColor}, inset 0 0 14px rgba(11, 16, 40, 0.8)`,
                }}
              >
                {/* Gateway Sky / Interior: Unified twilight atmosphere with subtle realm tint */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#141C3D] via-[#0E1530] to-[#070A1B] opacity-95 group-hover:opacity-100 transition-opacity" />

                {/* Swirling magical portal aperture glow */}
                <div
                  className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity blur-md pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 60%, ${portal.themeColor} 0%, transparent 70%)`,
                  }}
                />

                {/* Top Rune Crown on Arch */}
                <div className="relative z-10 pt-1 flex items-center justify-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                    style={{ backgroundColor: portal.accentRune, color: portal.accentRune }}
                  />
                  <div
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: portal.accentRune, color: portal.accentRune }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                    style={{ backgroundColor: portal.accentRune, color: portal.accentRune }}
                  />
                </div>

                {/* Realm Voxel Biome Realistic 3D Isometric Symbol */}
                <div className="relative z-10 my-auto transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
                  {portal.worldNumber === 1 && (
                    /* World 1: Starter Forest - Professional 3D Isometric Voxel Floating Island */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)]">
                      {/* Floating Island Base Rocks */}
                      <polygon points="30,55 14,44 30,38 46,44" fill="#1C1815" />
                      <polygon points="14,44 30,55 30,48 14,38" fill="#2E241E" />
                      <polygon points="46,44 30,55 30,48 46,38" fill="#3D3028" />

                      {/* Main Grass Plinth */}
                      <polygon points="30,42 12,32 30,22 48,32" fill="#10B981" />
                      <polygon points="12,32 30,42 30,46 12,36" fill="#047857" />
                      <polygon points="48,32 30,42 30,46 48,36" fill="#065F46" />

                      {/* Ancient Voxel Stone Arch */}
                      <polygon points="26,30 22,28 22,18 26,20" fill="#64748B" />
                      <polygon points="26,20 22,18 26,16 30,18" fill="#94A3B8" />
                      <polygon points="38,30 34,28 34,18 38,20" fill="#475569" />
                      <polygon points="38,20 34,18 38,16 42,18" fill="#64748B" />
                      <polygon points="22,18 38,18 38,15 22,15" fill="#CBD5E1" />

                      {/* Isometric Voxel Pine Tree */}
                      {/* Trunk */}
                      <rect x="28" y="22" width="4" height="6" fill="#78350F" />
                      {/* Foliage Layers */}
                      <polygon points="30,24 20,20 30,16 40,20" fill="#059669" />
                      <polygon points="30,19 22,15 30,11 38,15" fill="#10B981" />
                      <polygon points="30,14 24,10 30,6 36,10" fill="#34D399" />

                      {/* Glowing Cyan Fireflies / Mana Orbs */}
                      <circle cx="18" cy="24" r="1.5" fill="#67E8F9" className="animate-pulse" />
                      <circle cx="42" cy="14" r="1.5" fill="#67E8F9" className="animate-pulse" />
                      <circle cx="30" cy="5" r="2" fill="#FDE047" />
                    </svg>
                  )}

                  {portal.worldNumber === 2 && (
                    /* World 2: Variable Avenue - 3D Isometric Cyber Data Spire & Variable Blocks */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_12px_rgba(6,182,212,0.4)]">
                      {/* Foundation Platform */}
                      <polygon points="30,52 14,43 30,34 46,43" fill="#0369A1" />
                      <polygon points="14,43 30,52 30,55 14,46" fill="#075985" />
                      <polygon points="46,43 30,52 30,55 46,46" fill="#0C4A6E" />

                      {/* Central Memory Tower */}
                      <polygon points="30,40 22,35 22,18 30,23" fill="#0284C7" />
                      <polygon points="30,40 38,35 38,18 30,23" fill="#0369A1" />
                      <polygon points="30,23 22,18 30,13 38,18" fill="#38BDF8" />

                      {/* Floating Variable Cube [x] */}
                      <polygon points="30,14 24,10 30,6 36,10" fill="#67E8F9" />
                      <polygon points="24,10 30,14 30,17 24,13" fill="#0EA5E9" />
                      <polygon points="36,10 30,14 30,17 36,13" fill="#0284C7" />

                      {/* Flanking Data Pillars */}
                      <polygon points="18,38 12,34 12,25 18,29" fill="#0EA5E9" />
                      <polygon points="18,29 12,25 18,21 24,25" fill="#38BDF8" />
                      <polygon points="42,38 48,34 48,25 42,29" fill="#0284C7" />
                      <polygon points="42,29 36,25 42,21 48,25" fill="#38BDF8" />

                      {/* Neon Data Circuit Traces */}
                      <line x1="22" y1="28" x2="30" y2="33" stroke="#BAE6FD" strokeWidth="1.5" />
                      <line x1="38" y1="28" x2="30" y2="33" stroke="#BAE6FD" strokeWidth="1.5" />
                    </svg>
                  )}

                  {portal.worldNumber === 3 && (
                    /* World 3: Logic Kingdom - 3D Isometric Golden Citadel of Truth */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_12px_rgba(245,158,11,0.45)]">
                      {/* Golden Plinth */}
                      <polygon points="30,52 14,43 30,34 46,43" fill="#B45309" />
                      <polygon points="14,43 30,52 30,55 14,46" fill="#92400E" />
                      <polygon points="46,43 30,52 30,55 46,46" fill="#78350F" />

                      {/* Main Castle Keep */}
                      <polygon points="30,42 20,36 20,22 30,28" fill="#F59E0B" />
                      <polygon points="30,42 40,36 40,22 30,28" fill="#D97706" />
                      <polygon points="30,28 20,22 30,16 40,22" fill="#FCD34D" />

                      {/* Stepped Turrets */}
                      <polygon points="18,34 14,31 14,21 18,24" fill="#D97706" />
                      <polygon points="18,24 14,21 18,18 22,21" fill="#FBBF24" />
                      <polygon points="42,34 46,31 46,21 42,24" fill="#B45309" />
                      <polygon points="42,24 38,21 42,18 46,21" fill="#FBBF24" />

                      {/* Crown Diamond Spires */}
                      <polygon points="30,16 26,13 30,6 34,13" fill="#FEF08A" />
                      <polygon points="30,6 26,13 30,15 34,13" fill="#FDE047" />

                      {/* Castle Portcullis Gate */}
                      <polygon points="30,42 27,40 27,33 33,33 33,40" fill="#451A03" />
                    </svg>
                  )}

                  {portal.worldNumber === 4 && (
                    /* World 4: Looping Mountains - 3D Isometric Glacial Frost Peaks */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_12px_rgba(56,189,248,0.45)]">
                      {/* Deep Icy Platform */}
                      <polygon points="30,53 14,44 30,35 46,44" fill="#1E3A8A" />
                      <polygon points="14,44 30,53 30,56 14,47" fill="#172554" />
                      <polygon points="46,44 30,53 30,56 46,47" fill="#0F172A" />

                      {/* Grand Mountain Ridge */}
                      <polygon points="30,42 16,33 30,10 44,33" fill="#2563EB" />
                      <polygon points="44,33 30,42 30,10" fill="#1D4ED8" />

                      {/* Glacial Snow Caps */}
                      <polygon points="30,22 23,28 30,26 37,28" fill="#F0F9FF" />
                      <polygon points="30,10 24,18 30,16 36,18" fill="#FFFFFF" />

                      {/* Looping Frost Vortex Ribbon */}
                      <ellipse cx="30" cy="27" rx="16" ry="6" stroke="#7DD3FC" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
                      <circle cx="44" cy="25" r="2" fill="#BAE6FD" />
                    </svg>
                  )}

                  {portal.worldNumber === 5 && (
                    /* World 5: Method Metro - 3D Isometric Neon Cyber Skyline */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_12px_rgba(129,140,248,0.45)]">
                      {/* Cyber Obsidian Base */}
                      <polygon points="30,53 14,44 30,35 46,44" fill="#312E81" />
                      <polygon points="14,44 30,53 30,56 14,47" fill="#1E1B4B" />
                      <polygon points="46,44 30,53 30,56 46,47" fill="#0F172A" />

                      {/* Main Neon Skyscraper */}
                      <polygon points="30,41 22,36 22,14 30,19" fill="#4F46E5" />
                      <polygon points="30,41 38,36 38,14 30,19" fill="#4338CA" />
                      <polygon points="30,19 22,14 30,9 38,14" fill="#818CF8" />

                      {/* Sub-towers */}
                      <polygon points="18,40 12,36 12,24 18,28" fill="#6366F1" />
                      <polygon points="18,28 12,24 18,20 24,24" fill="#A5B4FC" />
                      <polygon points="42,40 48,36 48,22 42,26" fill="#3730A3" />
                      <polygon points="42,26 36,22 42,18 48,22" fill="#818CF8" />

                      {/* Neon Method Bridges & Window Lights */}
                      <line x1="22" y1="24" x2="30" y2="29" stroke="#E0E7FF" strokeWidth="1.5" />
                      <line x1="22" y1="32" x2="30" y2="37" stroke="#C7D2FE" strokeWidth="1.5" />
                      <circle cx="30" cy="7" r="2" fill="#C7D2FE" />
                    </svg>
                  )}

                  {portal.worldNumber === 6 && (
                    /* World 6: Object Kingdom - 3D Isometric Royal Amethyst Palace */
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="drop-shadow-[0_4px_14px_rgba(192,132,252,0.5)]">
                      {/* Royal Plinth */}
                      <polygon points="30,53 14,44 30,35 46,44" fill="#581C87" />
                      <polygon points="14,44 30,53 30,56 14,47" fill="#3B0764" />
                      <polygon points="46,44 30,53 30,56 46,47" fill="#2E1065" />

                      {/* Grand Amethyst Citadel Keep */}
                      <polygon points="30,42 20,36 20,20 30,26" fill="#9333EA" />
                      <polygon points="30,42 40,36 40,20 30,26" fill="#7E22CE" />
                      <polygon points="30,26 20,20 30,14 40,20" fill="#C084FC" />

                      {/* Flanking Spire Crystals */}
                      <polygon points="16,34 12,31 12,18 16,21" fill="#A855F7" />
                      <polygon points="16,21 12,18 16,14 20,17" fill="#E9D5FF" />
                      <polygon points="44,34 48,31 48,18 44,21" fill="#6B21A8" />
                      <polygon points="44,21 40,18 44,14 48,17" fill="#D8B4FE" />

                      {/* Floating OOP Class Hierarchical Amethyst Diamond */}
                      <polygon points="30,14 26,10 30,4 34,10" fill="#F5D0FE" />
                      <polygon points="30,4 26,10 30,12 34,10" fill="#E879F9" />

                      {/* Magic Cascade Light */}
                      <circle cx="30" cy="3" r="2" fill="#FDF4FF" />
                    </svg>
                  )}
                </div>

                {/* Bottom Neon Threshold Beam */}
                <div
                  className="w-full h-1.5 rounded-full relative z-10"
                  style={{
                    backgroundColor: portal.themeColor,
                    boxShadow: `0 0 10px ${portal.accentRune}`,
                  }}
                />
              </div>

              {/* Carved Dark Stone Block Pedestal */}
              <div className="w-full mt-2 rounded-xl border border-indigo-500/25 bg-[#0A0E23] px-2 py-1.5 text-center shadow-md group-hover:border-indigo-400/50 transition-colors">
                <div
                  className="font-black text-xs text-white truncate group-hover:text-amber-300 transition-colors"
                  title={portal.name}
                >
                  {portal.name}
                </div>
                <div className="font-mono text-[10px] font-bold text-cyan-300">
                  {portal.levelRange}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
