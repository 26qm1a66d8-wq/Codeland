import React, { useMemo, useState } from 'react';
import {
  Award,
  Flame,
  Check,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Cpu,
  LogOut,
  RotateCcw,
  Save,
} from 'lucide-react';
import { AchievementDef, ExperienceLevel, GraphicsQuality, ThemeMode } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { ACHIEVEMENTS_CATALOG, CHARACTER_AVATARS } from '../data/charactersAndBadges';
import { CAMPAIGN_WORLDS, getLevelsForWorld } from '../data/campaign100';
import { computePlayerLevelFromXp, getLastNDaysCalendar } from '../lib/dateUtils';
import { AvatarImage, BadgeIcon } from '../components/BadgeIcon';
import { soundFX } from '../lib/audio';

export const AchievementsView: React.FC = () => {
  const { profile, effectiveStreak } = usePlayer();
  const [catFilter, setCatFilter] = useState<'all' | AchievementDef['category']>('all');

  if (!profile) return null;

  const visibleBadges = ACHIEVEMENTS_CATALOG.filter(
    (b) => catFilter === 'all' || b.category === catFilter
  );

  const milestones = [3, 7, 14, 30, 60, 100];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-[#F5C451]">
            Badges &amp; Streak Milestones
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Explorer Achievements
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Unlocked {profile.unlockedAchievements.length} of {ACHIEVEMENTS_CATALOG.length}{' '}
            CODELAND badges.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'learning' as const, label: 'Java Mastery' },
            { id: 'adventure' as const, label: 'Adventure' },
            { id: 'streak' as const, label: 'Streaks' },
            { id: 'mastery' as const, label: 'Arena' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                catFilter === c.id
                  ? 'bg-[#2F7D46] text-white'
                  : 'bg-stone-200 dark:bg-[#14261E] text-stone-700 dark:text-stone-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Milestones Banner */}
      <div className="p-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#F28C45] fill-current" />
          <h2 className="text-base font-bold">
            Daily Streak Milestone Track (Current: {effectiveStreak} days · Best:{' '}
            {profile.longestStreak} days)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {milestones.map((days) => {
            const unlocked = profile.unlockedAchievements.includes(`streak-${days}`);
            return (
              <div
                key={days}
                className={`p-3 rounded-xl border text-center space-y-1 ${
                  unlocked
                    ? 'border-[#F28C45] bg-[#F28C45]/12 text-[#F28C45] font-bold'
                    : 'border-stone-200 dark:border-emerald-950 text-stone-400'
                }`}
              >
                <div className="font-mono text-base tabular-nums">{days} Days</div>
                <div className="text-[11px]">{unlocked ? 'Unlocked!' : 'Milestone'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleBadges.map((badge) => {
          const unlocked = profile.unlockedAchievements.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`p-5 rounded-2xl border flex items-start gap-4 transition-all ${
                unlocked
                  ? 'border-[#2F7D46]/60 dark:border-emerald-700 bg-white dark:bg-[#15281F] shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 bg-stone-100/70 dark:bg-[#0F1B15] opacity-65'
              }`}
            >
              <BadgeIcon
                kind={badge.iconKind}
                accentHex={badge.accentHex}
                size={46}
                locked={!unlocked}
              />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm truncate">{badge.title}</h3>
                  <span className="text-[11px] font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451] shrink-0">
                    +{badge.bonusXp} XP
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  {badge.description}
                </p>
                <div className="text-[11px] font-mono text-stone-400 pt-1">
                  {unlocked ? 'Unlocked' : 'Locked'} · +{badge.bonusCoins} Coins
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProfileView: React.FC = () => {
  const {
    profile,
    effectiveStreak,
    activityLogs,
    completedCampaignLevelsCount,
    saveProfileCustomization,
    setCertificateOpen,
  } = usePlayer();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarId, setAvatarId] = useState(profile?.avatarId || 'character-a');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel || 'beginner'
  );
  const [saving, setSaving] = useState(false);

  const calendar28 = useMemo(
    () => getLastNDaysCalendar(28, profile?.activityDates || []),
    [profile?.activityDates]
  );

  if (!profile) return null;

  const rankInfo = computePlayerLevelFromXp(profile.totalXp);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfileCustomization({
        username,
        displayName,
        avatarId,
        experienceLevel,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <div className="text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-[#F5C451]">
          Explorer Dossier &amp; Customization
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Player Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={(e) => void handleSave(e)}
          className="lg:col-span-7 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <AvatarImage avatarId={avatarId} sizeClass="w-16 h-16" />
            <div>
              <h2 className="text-lg font-bold">{profile.displayName}</h2>
              <p className="text-xs font-mono text-stone-500 dark:text-stone-400">
                Lv.{rankInfo.level} {rankInfo.rankTitle} · {profile.totalXp} XP · {effectiveStreak}d
                Streak
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold">Display Name</label>
              <input
                type="text"
                maxLength={36}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold">Handle (@username)</label>
              <input
                type="text"
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold">Experience Track</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-sm"
            >
              <option value="beginner">Complete Beginner</option>
              <option value="some_java">Know a Little Java</option>
              <option value="some_programming">Already Know Some Programming</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold">3D Explorer Character</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
              {CHARACTER_AVATARS.map((char) => {
                const active = char.id === avatarId;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setAvatarId(char.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${
                      active
                        ? 'border-[#F5C451] bg-[#2F7D46]/15'
                        : 'border-stone-200 dark:border-emerald-900/60'
                    }`}
                  >
                    <AvatarImage avatarId={char.id} sizeClass="w-11 h-11" />
                    <span className="text-[11px] font-semibold truncate max-w-full">
                      {char.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-5 space-y-3">
            <h3 className="text-sm font-bold">Last 28 Days Learning Calendar</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {calendar28.map((d) => (
                <div
                  key={d.dateKey}
                  title={`${d.dateKey}${d.active ? ' (Completed Java Activity)' : ''}`}
                  className={`h-8 rounded-lg border text-[10px] font-mono tabular-nums flex items-center justify-center ${
                    d.active
                      ? 'bg-[#2F7D46] border-[#2F7D46] text-white font-bold'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-400'
                  }`}
                >
                  {d.shortDate}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">100-Level Java Campaign Mastery</h3>
              <span className="text-xs font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451] font-bold">
                {completedCampaignLevelsCount}/100
              </span>
            </div>
            <div className="space-y-2.5">
              {CAMPAIGN_WORLDS.map((w) => {
                const lvls = getLevelsForWorld(w.worldNumber);
                const done = lvls.filter((l) =>
                  profile.completedMissions.includes(`M${l.levelNumber}`)
                ).length;
                const pct = Math.round((done / lvls.length) * 100);
                return (
                  <div key={w.worldId} className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">
                        W{w.worldNumber}: {w.name} (Lv.{w.levelRange[0]}–{w.levelRange[1]})
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {done}/{lvls.length}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-200 dark:bg-[#0D1813] overflow-hidden">
                      <div className="h-full bg-[#2F7D46]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setCertificateOpen(true)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>
                {profile.completedMissions.includes('M100')
                  ? 'View Signed Grand Citadel Certificate'
                  : 'Preview Grand Citadel Certificate Progress'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent XP Activity Log */}
      <div className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-5 space-y-3">
        <h3 className="text-sm font-bold">Recent XP &amp; Reward History</h3>
        {activityLogs.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            No learning rewards logged yet. Complete a lesson or practice exercise to start your
            history!
          </p>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-emerald-900/50 text-xs">
            {activityLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="font-medium">{log.title}</span>
                <span className="font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451] shrink-0">
                  +{log.xpAmount} XP
                  {log.coinsAmount > 0 ? ` · +${log.coinsAmount} Coins` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { profile, saveSettings, logout, resetDemoAccount } = usePlayer();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!profile) return null;

  const updateTheme = (theme: ThemeMode) => {
    void saveSettings({
      graphicsQuality: profile.graphicsQuality,
      soundMuted: profile.soundMuted,
      theme,
    });
  };

  const updateGraphics = (graphicsQuality: GraphicsQuality) => {
    void saveSettings({
      graphicsQuality,
      soundMuted: profile.soundMuted,
      theme: profile.theme,
    });
  };

  const updateMute = (soundMuted: boolean) => {
    soundFX.setMuted(soundMuted);
    if (!soundMuted) {
      soundFX.playCoinCollect();
    }
    void saveSettings({
      graphicsQuality: profile.graphicsQuality,
      soundMuted,
      theme: profile.theme,
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <div className="text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-[#F5C451]">
          Preferences &amp; Account
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Settings</h1>
      </div>

      {/* Visual Theme */}
      <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] space-y-4">
        <h2 className="text-base font-bold">Interface Theme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
              profile.theme === 'dark'
                ? 'border-[#2F7D46] bg-[#2F7D46]/15 font-bold'
                : 'border-stone-200 dark:border-emerald-900/60'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Moon className="w-4 h-4 text-[#F5C451]" /> Deep Forest Dark
            </span>
            {profile.theme === 'dark' && <Check className="w-4 h-4 text-[#2F7D46]" />}
          </button>

          <button
            type="button"
            onClick={() => updateTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
              profile.theme === 'light'
                ? 'border-[#2F7D46] bg-[#2F7D46]/15 font-bold'
                : 'border-stone-200 dark:border-emerald-900/60'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Sun className="w-4 h-4 text-[#F28C45]" /> Warm Cream Daylight
            </span>
            {profile.theme === 'light' && <Check className="w-4 h-4 text-[#2F7D46]" />}
          </button>
        </div>
      </div>

      {/* 3D Voxel Engine & Audio */}
      <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] space-y-5">
        <div className="space-y-2">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#69B9E7]" />
            <span>3D Voxel Graphics Quality</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Choose Low Quality on older laptops or software WebGL environments for smoother frame
            pacing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => updateGraphics('high')}
              className={`p-3.5 rounded-xl border text-left text-xs cursor-pointer ${
                profile.graphicsQuality === 'high'
                  ? 'border-[#2F7D46] bg-[#2F7D46]/15 font-bold'
                  : 'border-stone-200 dark:border-emerald-900/60'
              }`}
            >
              High Quality (Shadows, Glow &amp; Full Props)
            </button>
            <button
              type="button"
              onClick={() => updateGraphics('low')}
              className={`p-3.5 rounded-xl border text-left text-xs cursor-pointer ${
                profile.graphicsQuality === 'low'
                  ? 'border-[#2F7D46] bg-[#2F7D46]/15 font-bold'
                  : 'border-stone-200 dark:border-emerald-900/60'
              }`}
            >
              Performance Saver (1x DPR &amp; Fast Lighting)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200 dark:border-emerald-900/50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Synthesized Game &amp; Editor Audio</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Play chimes on coin pickup, code success, bridge activation, and badge unlocks.
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateMute(!profile.soundMuted)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
          >
            {profile.soundMuted ? (
              <>
                <VolumeX className="w-4 h-4" /> Muted
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" /> Sound On
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Session Management */}
      <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Account &amp; Session</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {profile.isDemo
              ? 'Currently playing in Local Demo Explorer Mode (stored in this browser).'
              : 'Synced with Firebase Authentication & Cloud Firestore.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-200 dark:bg-[#1C3328] hover:bg-stone-300 dark:hover:bg-[#254436] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out / Return to Landing</span>
          </button>

          {profile.isDemo && !confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-[#F28C45]/60 text-[#F28C45] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Local Demo Progress</span>
            </button>
          )}

          {profile.isDemo && confirmReset && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  resetDemoAccount();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F28C45] text-white cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-xl text-xs bg-stone-200 dark:bg-[#1C3328] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
