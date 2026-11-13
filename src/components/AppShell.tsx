import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Code2,
  Compass,
  Crown,
  GraduationCap,
  Home,
  Medal,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { AppSection } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { computePlayerLevelFromXp } from '../lib/dateUtils';
import { AvatarImage } from './BadgeIcon';
import {
  CodelandCubeLogo,
  HudByteCoinIcon,
  HudCrystalIcon,
  HudFlameIcon,
  VoxelFoxGuideMascot,
} from './hub/VoxelHubArtwork';
import { useAnimatedCounter } from './hub/useAnimatedCounter';

interface AppShellProps {
  children: React.ReactNode;
}

interface SidebarNavItem {
  section?: AppSection;
  isGlossary?: boolean;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeText?: string;
  badgeType?: 'new' | 'alert';
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { section: AppSection.DASHBOARD, label: 'Home', icon: Home },
  { section: AppSection.WORLDS, label: 'Adventure', icon: Compass },
  { section: AppSection.PRACTICE, label: 'CodeLab', icon: Code2 },
  { section: AppSection.ACADEMY, label: 'Academy', icon: GraduationCap, badgeText: 'New', badgeType: 'new' },
  { section: AppSection.LEADERBOARD, label: 'Leaderboard', icon: Trophy },
  { section: AppSection.ACHIEVEMENTS, label: 'Achievements', icon: Medal },
  { section: AppSection.EVENTS, label: 'Events', icon: Calendar, badgeText: '!', badgeType: 'alert' },
  { section: AppSection.MULTIPLAYER, label: 'Friends', icon: Users },
  { section: AppSection.PROFILE, label: 'Profile', icon: UserCircle },
  { isGlossary: true, label: 'Glossary', icon: BookMarked },
];

const SECTION_LABELS: Record<AppSection, string> = {
  [AppSection.LANDING]: 'Welcome',
  [AppSection.AUTH]: 'Sign In',
  [AppSection.ONBOARDING]: 'Explorer Setup',
  [AppSection.DASHBOARD]: 'Adventure Command Hub',
  [AppSection.ACADEMY]: 'Java Academy · 100 Levels',
  [AppSection.LESSON]: 'Interactive Java Lesson',
  [AppSection.PRACTICE]: 'CodeLab · Practice Arena',
  [AppSection.WORLDS]: 'Six Magical Realms',
  [AppSection.GAME]: '3D Voxel Adventure World',
  [AppSection.MULTIPLAYER]: 'Private Rooms & Friends',
  [AppSection.MULTIPLAYER_GAME]: 'Live Multiplayer Arena',
  [AppSection.ACHIEVEMENTS]: 'Badges & World Seals',
  [AppSection.LEADERBOARD]: 'Explorer Leaderboard',
  [AppSection.PROFILE]: 'Explorer Profile & Wardrobe',
  [AppSection.SETTINGS]: 'Game & Audio Settings',
  [AppSection.EVENTS]: 'Winter Event · The Frozen Kingdom',
  [AppSection.SHOP]: 'Byte Bazaar · Shop & Wardrobe',
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    section,
    setSection,
    profile,
    effectiveStreak,
    theme,
    toggleThemeQuick,
    setGlossaryOpen,
    incomingInvitations,
    acceptDirectInviteAndJoin,
    declineDirectInvite,
    activeRoom,
    activityLogs,
    notifications,
    dismissNotification,
    completedCampaignLevelsCount,
  } = usePlayer();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const rankInfo = computePlayerLevelFromXp(profile?.totalXp || 0);
  const animStreak = useAnimatedCounter(effectiveStreak);
  const animXp = useAnimatedCounter(profile?.totalXp ?? 0);
  const animCoins = useAnimatedCounter(profile?.coins ?? 0);

  const unreadAlertsCount = incomingInvitations.length + notifications.length;

  useEffect(() => {
    if (!notifPopoverOpen) return;
    const onDocPointerDown = (e: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, [notifPopoverOpen]);

  const isNavSelected = (target?: AppSection) => {
    if (!target) return false;
    if (target === AppSection.ACADEMY && section === AppSection.LESSON) return true;
    if (target === AppSection.WORLDS && section === AppSection.GAME) return true;
    if (target === AppSection.MULTIPLAYER && section === AppSection.MULTIPLAYER_GAME) return true;
    return section === target;
  };

  const handleNavigate = (target: AppSection) => {
    setSection(target);
    setMobileMenuOpen(false);
  };

  const renderSidebarBody = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-[#0B1026] text-[#F8FAFC]">
      {/* Brand Header */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-indigo-500/20">
        <button
          type="button"
          onClick={() => handleNavigate(AppSection.DASHBOARD)}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="transition-transform duration-150 group-hover:scale-105">
            <CodelandCubeLogo size={36} />
          </div>
          <div>
            <div className="font-display text-base tracking-wide text-[#FBBF24] leading-none">
              CODELAND
            </div>
            <div className="text-[10px] font-medium text-cyan-300/90 mt-1 tracking-wide">
              Learn · Code · Explore
            </div>
          </div>
        </button>

        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg bg-[#151F47] text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Player Profile Summary Card */}
      {profile && (
        <div className="p-3 border-b border-indigo-500/20">
          <button
            type="button"
            onClick={() => handleNavigate(AppSection.PROFILE)}
            className="w-full text-left rounded-xl p-2.5 bg-[#121B3D] hover:bg-[#182452] border border-indigo-400/25 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-0.5 rounded-xl bg-purple-950/80 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0">
                <AvatarImage avatarId={profile.avatarId} sizeClass="w-10 h-10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crown className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                  <span className="font-extrabold text-sm text-white truncate">
                    {profile.displayName || 'Alex Explorer'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300 font-semibold truncate">
                  Lv. {rankInfo.level} {rankInfo.rankTitle}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 rounded-full bg-[#070B19] overflow-hidden flex-1 border border-emerald-500/20">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${rankInfo.progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-300">
                {rankInfo.progressPercent}%
              </span>
            </div>

            {profile.isDemo && (
              <div className="mt-1.5 text-[10px] text-amber-300/90 font-medium">
                Local Demo Mode · Saved on Device
              </div>
            )}
          </button>
        </div>
      )}

      {/* Primary Game Navigation (10 Clean Sections with Right Chevrons) */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.section ? isNavSelected(item.section) : false;
          const isMultiplayer = item.section === AppSection.MULTIPLAYER;
          const isEvents = item.section === AppSection.EVENTS;
          const isAcademy = item.section === AppSection.ACADEMY;
          const pendingCount = isMultiplayer ? incomingInvitations.length : 0;

          const handleClick = () => {
            if (item.isGlossary) {
              setGlossaryOpen(true);
              setMobileMenuOpen(false);
            } else if (item.section) {
              handleNavigate(item.section);
            }
          };

          return (
            <button
              key={item.label}
              type="button"
              onClick={handleClick}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap group ${
                active
                  ? 'bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#D97706] text-[#0B1026] font-black border border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                  : 'text-slate-200 font-bold hover:bg-[#151F47] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#0B1026]' : 'text-indigo-300 group-hover:text-cyan-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {isAcademy ? (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider bg-purple-600 text-white shadow-sm">
                    New
                  </span>
                ) : isEvents ? (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                    !
                  </span>
                ) : pendingCount > 0 ? (
                  <span className="text-xs font-mono font-black px-1.5 rounded-full bg-rose-500 text-white">
                    {pendingCount}
                  </span>
                ) : null}

                <ChevronRight
                  className={`w-3.5 h-3.5 ${
                    active ? 'text-[#0B1026]' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Glowing "Your Progress" Card (Exact Reference Image Match) */}
      <div className="p-3 border-t border-indigo-500/20">
        <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-[#131A3D] via-[#0D122D] to-[#0A0E24] p-3 shadow-[0_0_18px_rgba(245,158,11,0.22)]">
          <div className="flex items-center gap-2 mb-2.5">
            <Trophy className="w-4 h-4 text-[#FBBF24]" />
            <span className="text-xs font-black text-white tracking-tight">Your Progress</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Circular 24% ring */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400"
                  strokeDasharray="24, 100"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-xs font-black text-white">24%</span>
            </div>

            {/* 3 stats with emerald checkmarks */}
            <div className="space-y-1 text-[11px] font-bold text-slate-200">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Levels 24 / 100</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Worlds 1 / 6</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Accuracy 92%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F1E6] dark:bg-[#080D21] text-[#202923] dark:text-[#F8FAFC]">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-indigo-500/20 bg-[#0B1026] z-30">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[84vw] h-full z-10 shadow-2xl border-r border-indigo-400/30">
            {renderSidebarBody(true)}
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-14 lg:pb-0">
        {/* Top Game HUD */}
        <header className="sticky top-0 z-30 h-12 lg:h-14 px-3 sm:px-6 flex items-center justify-between gap-4 border-b border-indigo-500/25 bg-[#0D132E] text-[#F8FAFC]">
          {/* Left Zone: Mobile Drawer Trigger + Brand / Active Realm Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg bg-[#16204A] hover:bg-[#1E2B61] text-slate-100 cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSection(AppSection.DASHBOARD)}
              className="lg:hidden flex items-center gap-2 cursor-pointer shrink-0"
            >
              <CodelandCubeLogo size={26} />
              <span className="font-display text-xs text-[#FBBF24] whitespace-nowrap">
                CODELAND
              </span>
            </button>

            <span className="hidden lg:inline text-xs font-semibold text-indigo-200/90 truncate">
              {SECTION_LABELS[section] || 'CODELAND Adventure'}
            </span>
          </div>

          {/* Right Zone: Game Telemetry Counters + Notifications + Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono tabular-nums shrink-0">
            {/* Daily Streak Counter */}
            <button
              type="button"
              onClick={() => setSection(AppSection.DASHBOARD)}
              title="Current Daily Learning Streak"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#151E46] hover:bg-[#1C285B] border border-indigo-400/25 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HudFlameIcon size={17} />
              <span>{animStreak}</span>
              <span className="hidden md:inline text-[11px] font-sans font-medium text-slate-300">
                {effectiveStreak === 1 ? 'Day' : 'Days'}
              </span>
            </button>

            {/* Total XP Crystal Counter */}
            <button
              type="button"
              onClick={() => setSection(AppSection.PROFILE)}
              title="Total Experience Points"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#151E46] hover:bg-[#1C285B] border border-indigo-400/25 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HudCrystalIcon size={17} />
              <span>{animXp.toLocaleString()}</span>
              <span className="hidden sm:inline text-[11px] text-violet-300">XP</span>
            </button>

            {/* Byte Coins Counter */}
            <button
              type="button"
              onClick={() => setSection(AppSection.WORLDS)}
              title="Byte Coins"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#151E46] hover:bg-[#1C285B] border border-amber-400/30 text-[#FBBF24] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HudByteCoinIcon size={17} />
              <span>{animCoins.toLocaleString()}</span>
            </button>

            {/* Notifications & Direct Invites Popover */}
            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifPopoverOpen((prev) => !prev)}
                aria-label="Notifications and room invitations"
                title="Notifications & Invites"
                className="relative p-1.5 rounded-xl bg-[#151E46] hover:bg-[#1E2B61] border border-indigo-400/25 text-slate-100 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              {notifPopoverOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[92vw] rounded-2xl border border-indigo-400/35 bg-[#0F1738] text-[#F8FAFC] shadow-2xl p-3.5 space-y-3 z-50 font-sans">
                  <div className="flex items-center justify-between border-b border-indigo-400/20 pb-2">
                    <span className="text-xs font-extrabold text-white">
                      Quest Alerts &amp; Room Invites
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifPopoverOpen(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Pending Room Invites */}
                  {incomingInvitations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-cyan-300">
                        Direct Room Invites ({incomingInvitations.length})
                      </div>
                      {incomingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-2.5 rounded-xl bg-[#16214D] border border-cyan-400/30 space-y-2"
                        >
                          <div className="text-xs font-bold text-white">
                            {inv.senderDisplayName} invited you to {inv.roomName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-300">
                            Code: {inv.roomCode} · Level {inv.selectedLevel}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void acceptDirectInviteAndJoin(inv);
                                setNotifPopoverOpen(false);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#051C12] text-xs font-extrabold whitespace-nowrap cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Join</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void declineDirectInvite(inv)}
                              className="py-1.5 px-2.5 rounded-lg bg-[#0B1026] hover:bg-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Reward Toasts */}
                  {notifications.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#FBBF24]">Recent Unlocks</div>
                      {notifications.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          className="p-2 rounded-xl bg-[#151F47] border border-amber-400/30 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{n.title}</div>
                            {n.subtitle && (
                              <div className="text-[11px] text-slate-300 line-clamp-2">
                                {n.subtitle}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissNotification(n.id)}
                            className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                            aria-label="Dismiss alert"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent Activity Log History */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-indigo-200">Recent Rewards</div>
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        Complete lessons, quests, or daily rewards to view your activity log here.
                      </p>
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                        {activityLogs.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0B1026] border border-indigo-400/15 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="text-slate-200 truncate">{item.title}</span>
                            <span className="font-mono tabular-nums text-emerald-300 shrink-0">
                              +{item.xpAmount} XP
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Glossary Quick Button */}
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-sans text-xs font-bold bg-[#151E46] hover:bg-[#1E2B61] border border-indigo-400/25 text-cyan-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Open Java Glossary"
            >
              <BookMarked className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Glossary</span>
            </button>

            {/* Theme Switch */}
            <button
              type="button"
              onClick={toggleThemeQuick}
              className="p-1.5 rounded-xl bg-[#151E46] hover:bg-[#1E2B61] border border-indigo-400/25 text-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Light or Dark Theme"
              title="Switch Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FBBF24]" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-300" />
              )}
            </button>

            {/* Quick Settings Gear */}
            <button
              type="button"
              onClick={() => setSection(AppSection.SETTINGS)}
              className="hidden sm:inline-flex p-1.5 rounded-xl bg-[#151E46] hover:bg-[#1E2B61] border border-indigo-400/25 text-slate-100 transition-colors cursor-pointer"
              aria-label="Open Settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 min-w-0 bg-[#F5F1E6] dark:bg-[#080D21] text-[#202923] dark:text-[#F8FAFC]">
          {children}
        </main>
      </div>

      {/* Compact Mobile Bottom Navigation (48px header + 52px bottom nav = 100px <= 15% mobile sticky cap) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[52px] bg-[#0B1026] border-t border-indigo-500/25 grid grid-cols-5 px-1 text-slate-200"
        aria-label="Mobile Navigation"
      >
        {[
          { section: AppSection.DASHBOARD, label: 'Home', icon: Home },
          { section: AppSection.ACADEMY, label: 'Academy', icon: BookOpen },
          { section: AppSection.WORLDS, label: 'Worlds', icon: Compass },
          { section: AppSection.MULTIPLAYER, label: 'Friends', icon: Users },
          { section: AppSection.PROFILE, label: 'Profile', icon: UserCircle },
        ].map((item) => {
          const Icon = item.icon;
          const active = isNavSelected(item.section);
          const pendingCount =
            item.section === AppSection.MULTIPLAYER ? incomingInvitations.length : 0;

          return (
            <button
              key={item.section}
              type="button"
              onClick={() => setSection(item.section)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer whitespace-nowrap ${
                active ? 'text-[#FBBF24]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{pendingCount > 0 ? `${item.label} (${pendingCount})` : item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
