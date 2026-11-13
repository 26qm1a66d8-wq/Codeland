import React from 'react';

export const CodelandCubeLogo: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <defs>
      <linearGradient id="clCubeTop" x1="8" y1="5" x2="36" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
      <linearGradient id="clCubeLeft" x1="7" y1="14" x2="22" y2="39" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="clCubeRight" x1="22" y1="18" x2="37" y2="39" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
    </defs>
    {/* Subtle outer rune diamond */}
    <path
      d="M22 2L40 12.5V31.5L22 42L4 31.5V12.5L22 2Z"
      fill="rgba(34, 211, 238, 0.12)"
      stroke="#22D3EE"
      strokeOpacity="0.45"
      strokeWidth="1.2"
    />
    {/* Isometric Voxel Cube */}
    <path d="M22 6L36 14L22 22L8 14L22 6Z" fill="url(#clCubeTop)" />
    <path d="M8 14L22 22V38L8 30V14Z" fill="url(#clCubeLeft)" />
    <path d="M36 14L22 22V38L36 30V14Z" fill="url(#clCubeRight)" />
    {/* Inner Golden Core Glyph */}
    <path d="M22 11L29 15L22 19L15 15L22 11Z" fill="#FBBF24" />
    <path d="M13 21.5L18.5 24.7V30.5L13 27.3V21.5Z" fill="#67E8F9" fillOpacity="0.85" />
    <path d="M31 21.5L25.5 24.7V30.5L31 27.3V21.5Z" fill="#38BDF8" fillOpacity="0.7" />
  </svg>
);

export const HudFlameIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
    <path
      d="M12.6 2.4C13.5 6.8 19.2 8.9 19.2 14.5C19.2 18.6 16.1 21.6 12 21.6C7.9 21.6 4.8 18.5 4.8 14.3C4.8 11.1 6.7 8.7 8.7 7C8.5 9.4 10 10.8 11.4 10.8C10.9 7.5 11.3 4.6 12.6 2.4Z"
      fill="#F97316"
      stroke="#FBBF24"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M12.2 10.3C12.8 12.4 15.5 13.4 15.5 16.3C15.5 18.4 14 19.8 12 19.8C10 19.8 8.5 18.4 8.5 16.2C8.5 14.5 9.6 13.2 10.8 12.3C10.9 13.3 11.5 13.9 12.1 13.9C11.9 12.6 11.9 11.3 12.2 10.3Z"
      fill="#FEF08A"
    />
  </svg>
);

export const HudCrystalIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M12 2L19.5 9.5L12 22L4.5 9.5L12 2Z" fill="#8B5CF6" stroke="#C4B5FD" strokeWidth="1.2" />
    <path d="M12 2L19.5 9.5H12V2Z" fill="#A855F7" />
    <path d="M12 2L4.5 9.5H12V2Z" fill="#DDD6FE" fillOpacity="0.85" />
    <path d="M4.5 9.5H12V22L4.5 9.5Z" fill="#7C3AED" />
  </svg>
);

export const HudByteCoinIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
    <circle cx="12" cy="12" r="9.5" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6.8" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
    <rect x="9.5" y="8.2" width="5" height="7.6" rx="1" fill="#FEF3C7" />
    <rect x="11" y="9.8" width="2" height="4.4" fill="#D97706" />
  </svg>
);

export const VoxelMentorEmblem: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true" className="shrink-0">
    {/* Magical frame */}
    <rect x="3" y="5" width="50" height="48" rx="12" fill="#171F48" stroke="#8B5CF6" strokeWidth="2" />
    {/* Wizard Hat */}
    <path d="M12 23L28 5L44 23H12Z" fill="#6D28D9" />
    <rect x="9" y="21" width="38" height="5" rx="2" fill="#7C3AED" />
    <rect x="18" y="19" width="20" height="3" fill="#FBBF24" />
    {/* Voxel Face & Beard */}
    <rect x="17" y="26" width="22" height="14" rx="2" fill="#F4C7A1" />
    <rect x="21" y="30" width="4" height="4" fill="#0F172A" />
    <rect x="31" y="30" width="4" height="4" fill="#0F172A" />
    <rect x="22" y="30.5" width="1.5" height="1.5" fill="#38BDF8" />
    <rect x="32" y="30.5" width="1.5" height="1.5" fill="#38BDF8" />
    {/* White Voxel Beard */}
    <rect x="16" y="37" width="24" height="8" rx="2" fill="#E2E8F0" />
    <rect x="20" y="44" width="16" height="6" rx="2" fill="#CBD5E1" />
    {/* Glowing Rune Staff Orb */}
    <rect x="8" y="27" width="3.5" height="22" rx="1" fill="#92400E" />
    <circle cx="9.8" cy="24" r="4.5" fill="#22D3EE" />
    <circle cx="9.8" cy="24" r="2.2" fill="#F8FAFC" />
  </svg>
);

export const VoxelFoxGuideMascot: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" aria-hidden="true" className="shrink-0">
    {/* Grass & Dirt Voxel Step */}
    <rect x="8" y="48" width="44" height="8" rx="2" fill="#78350F" />
    <rect x="8" y="45" width="44" height="5" rx="1.5" fill="#10B981" />
    {/* Fox Ears */}
    <rect x="15" y="8" width="8" height="9" rx="1.5" fill="#EA580C" />
    <rect x="17" y="10" width="4" height="5" fill="#FED7AA" />
    <rect x="37" y="8" width="8" height="9" rx="1.5" fill="#EA580C" />
    <rect x="39" y="10" width="4" height="5" fill="#FED7AA" />
    {/* Voxel Fox Head */}
    <rect x="14" y="15" width="32" height="18" rx="3" fill="#F97316" />
    <rect x="18" y="25" width="24" height="8" rx="2" fill="#FFF7ED" />
    {/* Eyes & Nose */}
    <rect x="20" y="20" width="4" height="4" rx="1" fill="#0F172A" />
    <rect x="36" y="20" width="4" height="4" rx="1" fill="#0F172A" />
    <rect x="27" y="25" width="6" height="3.5" rx="1" fill="#1E293B" />
    {/* Royal Purple Explorer Scarf */}
    <rect x="17" y="32" width="26" height="5" rx="2" fill="#7C3AED" />
    <rect x="33" y="35" width="5" height="7" rx="1.5" fill="#8B5CF6" />
    {/* Body & Paws */}
    <rect x="19" y="36" width="22" height="10" rx="2" fill="#EA580C" />
    <rect x="24" y="37" width="10" height="8" rx="1.5" fill="#FFF7ED" />
  </svg>
);

export const VoxelTreasureChestArt: React.FC<{ isOpen: boolean; size?: number }> = ({
  isOpen,
  size = 76,
}) => (
  <svg width={size} height={size} viewBox="0 0 84 84" fill="none" aria-hidden="true" className="shrink-0">
    {/* Ambient Glow Aura */}
    <ellipse
      cx="42"
      cy="66"
      rx="32"
      ry="10"
      fill={isOpen ? 'rgba(251, 191, 36, 0.35)' : 'rgba(168, 85, 247, 0.35)'}
    />
    {/* Left & Right Violet Crystal Clusters */}
    <path d="M10 66L6 50L14 44L19 64Z" fill="#A855F7" />
    <path d="M16 68L14 55L21 51L24 67Z" fill="#C084FC" />
    <path d="M74 66L78 49L70 43L64 64Z" fill="#8B5CF6" />
    <path d="M68 68L71 55L63 51L60 67Z" fill="#D8B4FE" />

    {/* Chest Base */}
    <rect x="18" y="40" width="48" height="26" rx="4" fill="#6D28D9" stroke="#FBBF24" strokeWidth="3" />
    <rect x="22" y="44" width="40" height="18" rx="2" fill="#4C1D95" />
    {/* Vertical Gold Straps */}
    <rect x="27" y="40" width="5" height="26" fill="#F59E0B" />
    <rect x="52" y="40" width="5" height="26" fill="#F59E0B" />

    {isOpen ? (
      <>
        {/* Tilted Open Lid + Treasure Glow */}
        <rect x="18" y="16" width="48" height="16" rx="4" fill="#7C3AED" stroke="#FBBF24" strokeWidth="3" />
        <ellipse cx="42" cy="38" rx="20" ry="7" fill="#FEF08A" />
        {/* Floating Gold Coins & Cyan Code Gem */}
        <circle cx="33" cy="33" r="5" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="1.5" />
        <circle cx="51" cy="34" r="4.5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
        <path d="M42 20L48 27L42 35L36 27L42 20Z" fill="#22D3EE" stroke="#CFFAFE" strokeWidth="1.5" />
      </>
    ) : (
      <>
        {/* Closed Domed Lid */}
        <rect x="17" y="24" width="50" height="17" rx="5" fill="#7C3AED" stroke="#FBBF24" strokeWidth="3" />
        <rect x="27" y="24" width="5" height="17" fill="#FBBF24" />
        <rect x="52" y="24" width="5" height="17" fill="#FBBF24" />
        {/* Glowing Golden Keyhole Crest */}
        <rect x="36" y="34" width="12" height="13" rx="3" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="1.5" />
        <circle cx="42" cy="40" r="2.4" fill="#22D3EE" />
      </>
    )}
  </svg>
);

export const WorldBiomePortalArt: React.FC<{ worldNumber: number }> = ({ worldNumber }) => {
  switch (worldNumber) {
    case 1:
      // Starter Forest: Enchanted green trees, wooden cabin, waterfall & cyan beacon
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#0B192E" />
          <circle cx="142" cy="24" r="11" fill="#FEF3C7" fillOpacity="0.9" />
          {/* Distant canopy hills */}
          <rect x="12" y="64" width="156" height="36" rx="4" fill="#064E3B" />
          {/* Floating Voxel Forest Island */}
          <rect x="22" y="74" width="136" height="12" rx="2" fill="#10B981" />
          <rect x="28" y="86" width="124" height="16" rx="2" fill="#78350F" />
          {/* Waterfall */}
          <rect x="84" y="74" width="14" height="36" fill="#38BDF8" fillOpacity="0.9" />
          <rect x="88" y="74" width="5" height="36" fill="#BAE6FD" />
          {/* Wooden Cabin */}
          <rect x="42" y="54" width="26" height="20" fill="#92400E" />
          <path d="M38 55L55 41L72 55H38Z" fill="#B45309" />
          <rect x="51" y="61" width="8" height="8" fill="#FBBF24" />
          {/* Magical Beacon Spire */}
          <rect x="112" y="44" width="14" height="30" fill="#334155" />
          <rect x="115" y="10" width="8" height="34" fill="#22D3EE" fillOpacity="0.65" />
          <rect x="113" y="36" width="12" height="10" rx="2" fill="#67E8F9" />
          {/* Voxel Oak Trees */}
          <rect x="29" y="58" width="5" height="16" fill="#78350F" />
          <rect x="22" y="42" width="19" height="18" rx="3" fill="#22C55E" />
          <rect x="140" y="56" width="5" height="18" fill="#78350F" />
          <rect x="132" y="39" width="21" height="19" rx="3" fill="#16A34A" />
        </svg>
      );
    case 2:
      // Variable Avenue: Crystal buildings, resource shops & floating crates
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#10183B" />
          {/* Floating data cubes */}
          <rect x="30" y="20" width="12" height="12" rx="2" fill="#22D3EE" />
          <rect x="136" y="18" width="13" height="13" rx="2" fill="#FBBF24" />
          <rect x="86" y="12" width="10" height="10" rx="2" fill="#A855F7" />
          {/* Cobblestone & Crystal Plaza */}
          <rect x="20" y="76" width="140" height="10" rx="2" fill="#38BDF8" />
          <rect x="28" y="86" width="124" height="16" rx="2" fill="#1E293B" />
          {/* Crystal Shop Left */}
          <rect x="34" y="48" width="34" height="28" fill="#312E81" />
          <path d="M30 49L51 33L72 49H30Z" fill="#06B6D4" />
          <rect x="44" y="57" width="14" height="11" fill="#FDE047" />
          {/* Central Crystal Spire */}
          <path d="M90 26L104 52V76H76V52L90 26Z" fill="#8B5CF6" />
          <path d="M90 26L104 52H90V26Z" fill="#C084FC" />
          {/* Resource Shop Right */}
          <rect x="114" y="50" width="32" height="26" fill="#4C1D95" />
          <rect x="111" y="45" width="38" height="7" rx="1.5" fill="#F59E0B" />
          <rect x="124" y="59" width="12" height="17" fill="#22D3EE" />
        </svg>
      );
    case 3:
      // Logic Kingdom: Majestic crystal castle, branching pathways & golden gates
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#191339" />
          <circle cx="38" cy="24" r="12" fill="#FDE68A" fillOpacity="0.85" />
          {/* Castle Base */}
          <rect x="22" y="78" width="136" height="10" rx="2" fill="#F59E0B" />
          <rect x="30" y="88" width="120" height="15" rx="2" fill="#451A03" />
          {/* Left & Right Golden Bastion Towers */}
          <rect x="38" y="40" width="22" height="38" fill="#4C1D95" />
          <path d="M35 40L49 22L63 40H35Z" fill="#FBBF24" />
          <rect x="120" y="40" width="22" height="38" fill="#4C1D95" />
          <path d="M117 40L131 22L145 40H117Z" fill="#FBBF24" />
          {/* Central Royal Keep & Glowing Logic Gate */}
          <rect x="64" y="30" width="52" height="48" fill="#5B21B6" />
          <path d="M68 30L90 10L112 30H68Z" fill="#F59E0B" />
          <rect x="79" y="52" width="22" height="26" rx="10" fill="#22D3EE" />
          <rect x="85" y="37" width="10" height="10" rx="2" fill="#FEF08A" />
        </svg>
      );
    case 4:
      // Looping Mountains: Snowy mountain peaks, waterfalls, bridges & gears
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#0C1E3A" />
          {/* Twin Voxel Mountain Peaks */}
          <path d="M16 86L56 22L94 86H16Z" fill="#334155" />
          <path d="M41 46L56 22L71 46H41Z" fill="#F8FAFC" />
          <path d="M84 86L128 18L168 86H84Z" fill="#1E293B" />
          <path d="M111 44L128 18L145 44H111Z" fill="#E2E8F0" />
          {/* Sky Suspension Bridge */}
          <rect x="54" y="56" width="74" height="5" fill="#F59E0B" />
          <rect x="64" y="50" width="4" height="8" fill="#FBBF24" />
          <rect x="88" y="50" width="4" height="8" fill="#FBBF24" />
          <rect x="112" y="50" width="4" height="8" fill="#FBBF24" />
          {/* Waterfall Chasm */}
          <rect x="84" y="61" width="14" height="42" fill="#38BDF8" />
          <rect x="20" y="84" width="140" height="12" rx="2" fill="#0EA5E9" fillOpacity="0.45" />
        </svg>
      );
    case 5:
      // Method Metro: Futuristic voxel tech city, neon-purple machinery & sky transit
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#0F102E" />
          {/* Skyscrapers */}
          <rect x="26" y="32" width="26" height="52" fill="#1E1B4B" stroke="#A855F7" strokeWidth="1.5" />
          <rect x="60" y="18" width="32" height="66" fill="#312E81" stroke="#22D3EE" strokeWidth="1.5" />
          <rect x="100" y="28" width="26" height="56" fill="#1E1B4B" stroke="#A855F7" strokeWidth="1.5" />
          <rect x="132" y="40" width="22" height="44" fill="#312E81" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Illuminated Metro Windows */}
          <rect x="68" y="26" width="16" height="5" fill="#22D3EE" />
          <rect x="68" y="36" width="16" height="5" fill="#A855F7" />
          <rect x="68" y="46" width="16" height="5" fill="#22D3EE" />
          {/* Elevated Neon Monorail */}
          <rect x="14" y="66" width="152" height="5" fill="#A855F7" />
          <rect x="74" y="58" width="36" height="8" rx="3" fill="#22D3EE" />
          <rect x="18" y="84" width="144" height="12" rx="2" fill="#1E293B" />
        </svg>
      );
    default:
      // World 6 — Object Kingdom: Floating citadel, purple crystal spires & Central Energy Core
      return (
        <svg viewBox="0 0 180 112" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="180" height="112" fill="#120B2E" />
          {/* Central Sky Energy Beam */}
          <rect x="85" y="0" width="10" height="60" fill="#E879F9" fillOpacity="0.45" />
          <rect x="88" y="0" width="4" height="60" fill="#F8FAFC" />
          {/* Floating Citadel Island */}
          <path d="M30 76H150L132 98H48L30 76Z" fill="#4C1D95" />
          <rect x="26" y="70" width="128" height="8" rx="2" fill="#A855F7" />
          {/* Crystal Spires */}
          <path d="M44 70L54 34L64 70H44Z" fill="#7C3AED" />
          <path d="M116 70L126 34L136 70H116Z" fill="#7C3AED" />
          <path d="M68 70L90 16L112 70H68Z" fill="#9333EA" stroke="#FBBF24" strokeWidth="1.5" />
          {/* Glowing Central Energy Core */}
          <circle cx="90" cy="52" r="10" fill="#22D3EE" />
          <circle cx="90" cy="52" r="5" fill="#FEF08A" />
        </svg>
      );
  }
};

export type QuickPedestalKind =
  | 'worlds'
  | 'codelab'
  | 'friends'
  | 'achievements'
  | 'shop'
  | 'base'
  | 'wardrobe';

export const QuickPortalPedestalArt: React.FC<{ kind: QuickPedestalKind }> = ({ kind }) => {
  switch (kind) {
    case 'worlds':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(34,211,238,0.28)" stroke="#22D3EE" strokeWidth="1.4" />
          <path d="M16 34H48L42 44H22L16 34Z" fill="#78350F" />
          <rect x="14" y="30" width="36" height="5" rx="1.5" fill="#10B981" />
          <rect x="28" y="18" width="8" height="12" fill="#6D28D9" />
          <path d="M25 18L32 8L39 18H25Z" fill="#FBBF24" />
          <rect x="18" y="20" width="9" height="10" rx="2" fill="#22C55E" />
          <rect x="38" y="21" width="8" height="9" rx="2" fill="#16A34A" />
        </svg>
      );
    case 'codelab':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(168,85,247,0.28)" stroke="#A855F7" strokeWidth="1.4" />
          <rect x="16" y="12" width="32" height="22" rx="3" fill="#1E1B4B" stroke="#38BDF8" strokeWidth="2" />
          <path d="M26 19L22 23L26 27" stroke="#22D3EE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 19L42 23L38 27" stroke="#22D3EE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 18L30 28" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 36H52L47 43H17L12 36Z" fill="#94A3B8" />
        </svg>
      );
    case 'friends':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="1.4" />
          {/* Left Voxel Friend */}
          <rect x="16" y="14" width="13" height="13" rx="2" fill="#F4C7A1" />
          <rect x="15" y="12" width="15" height="5" rx="1.5" fill="#78350F" />
          <rect x="15" y="27" width="15" height="15" rx="2" fill="#8B5CF6" />
          {/* Right Voxel Friend */}
          <rect x="35" y="14" width="13" height="13" rx="2" fill="#E6B28A" />
          <rect x="34" y="12" width="15" height="5" rx="1.5" fill="#1E293B" />
          <rect x="34" y="27" width="15" height="15" rx="2" fill="#10B981" />
        </svg>
      );
    case 'achievements':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(251,191,36,0.28)" stroke="#FBBF24" strokeWidth="1.4" />
          <rect x="22" y="39" width="20" height="5" rx="1.5" fill="#B45309" />
          <rect x="29" y="31" width="6" height="8" fill="#F59E0B" />
          <path d="M20 11H44V22C44 28 38.6 32 32 32C25.4 32 20 28 20 22V11Z" fill="#FBBF24" />
          <path d="M20 14H14V20C14 23 16.5 25 20 25" stroke="#F59E0B" strokeWidth="2.5" />
          <path d="M44 14H50V20C50 23 47.5 25 44 25" stroke="#F59E0B" strokeWidth="2.5" />
        </svg>
      );
    case 'shop':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(251,191,36,0.28)" stroke="#FBBF24" strokeWidth="1.4" />
          {/* Chest Body */}
          <rect x="16" y="22" width="32" height="18" rx="3" fill="#6D28D9" stroke="#FBBF24" strokeWidth="2" />
          <rect x="15" y="13" width="34" height="11" rx="3" fill="#7C3AED" stroke="#FBBF24" strokeWidth="2" />
          <rect x="23" y="13" width="4" height="27" fill="#FBBF24" />
          <rect x="37" y="13" width="4" height="27" fill="#FBBF24" />
          <rect x="29" y="22" width="6" height="6" rx="1.5" fill="#FBBF24" />
          <circle cx="32" cy="25" r="1.5" fill="#22D3EE" />
        </svg>
      );
    case 'base':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(16,185,129,0.28)" stroke="#10B981" strokeWidth="1.4" />
          <rect x="18" y="24" width="28" height="19" rx="2" fill="#B45309" />
          <path d="M13 25L32 10L51 25H13Z" fill="#EA580C" />
          <rect x="28" y="31" width="8" height="12" rx="1" fill="#451A03" />
          <rect x="21" y="28" width="5" height="5" fill="#FEF08A" />
          <rect x="38" y="28" width="5" height="5" fill="#FEF08A" />
        </svg>
      );
    case 'wardrobe':
      return (
        <svg viewBox="0 0 64 56" className="w-14 h-12" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="48" rx="24" ry="6" fill="rgba(192,132,252,0.28)" stroke="#C084FC" strokeWidth="1.4" />
          {/* Explorer Cloak & Armor Stand */}
          <path d="M20 18L27 13H37L44 18L41 41H23L20 18Z" fill="#6D28D9" stroke="#FBBF24" strokeWidth="1.8" />
          <rect x="29" y="18" width="6" height="14" rx="1" fill="#22D3EE" />
          <rect x="23" y="14" width="18" height="4" rx="1.5" fill="#FBBF24" />
        </svg>
      );
  }
};

export const VoxelSnowmanArt: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true" className="shrink-0">
    {/* Snow ground shadow */}
    <ellipse cx="36" cy="62" rx="26" ry="6" fill="rgba(56,189,248,0.28)" />
    {/* Bottom Snowball */}
    <rect x="18" y="36" width="36" height="26" rx="8" fill="#F8FAFC" stroke="#BAE6FD" strokeWidth="2" />
    {/* Coal buttons */}
    <rect x="34" y="42" width="4" height="4" rx="1" fill="#0F172A" />
    <rect x="34" y="50" width="4" height="4" rx="1" fill="#0F172A" />
    {/* Middle Head Snowball */}
    <rect x="23" y="18" width="26" height="20" rx="6" fill="#F8FAFC" stroke="#BAE6FD" strokeWidth="2" />
    {/* Coal Eyes */}
    <rect x="28" y="24" width="3.5" height="3.5" rx="0.8" fill="#0F172A" />
    <rect x="40" y="24" width="3.5" height="3.5" rx="0.8" fill="#0F172A" />
    {/* Carrot Nose */}
    <path d="M36 28L43 30L36 32V28Z" fill="#F97316" />
    {/* Coal Smile */}
    <rect x="30" y="32" width="2" height="2" fill="#0F172A" />
    <rect x="34" y="33" width="2" height="2" fill="#0F172A" />
    <rect x="38" y="33" width="2" height="2" fill="#0F172A" />
    <rect x="42" y="32" width="2" height="2" fill="#0F172A" />
    {/* Red Christmas Scarf */}
    <rect x="21" y="34" width="30" height="5" rx="1.5" fill="#EF4444" />
    <rect x="41" y="37" width="6" height="12" rx="1.5" fill="#DC2626" />
    {/* Black Top Hat with Red Ribbon */}
    <rect x="19" y="16" width="34" height="4" rx="1" fill="#1E293B" />
    <rect x="26" y="6" width="20" height="12" rx="2" fill="#0F172A" />
    <rect x="26" y="14" width="20" height="2.5" fill="#EF4444" />
  </svg>
);
