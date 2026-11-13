import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Lock,
  Play,
  Swords,
  Trophy,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { ADVENTURE_WORLDS } from '../data/worldsData';
import {
  CAMPAIGN_WORLDS,
  getCampaignLevel,
  getLevelsForWorld,
} from '../data/campaign100';
import { ACHIEVEMENTS_CATALOG } from '../data/charactersAndBadges';
import { WORLD1_SITE_ORDER, getWorld1LevelSpec } from '../data/world1ForestData';
import { AvatarImage, BadgeIcon } from '../components/BadgeIcon';

export const WorldsSelectionView: React.FC = () => {
  const {
    profile,
    missionRecords,
    world1State,
    completedCampaignLevelsCount,
    isWorldUnlocked,
    getCampaignLevelProgress,
    openWorld,
    openCampaignLevel,
    setCertificateOpen,
  } = usePlayer();

  // Per-world selected level override (defaults to next incomplete unlocked level in each world)
  const [selectedLevelByWorld, setSelectedLevelByWorld] = useState<Record<string, number>>({});

  const defaultLevelPerWorld = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of CAMPAIGN_WORLDS) {
      const lvls = getLevelsForWorld(w.worldNumber);
      let chosen = lvls[0]?.levelNumber || 1;
      if (profile) {
        const nextPending = lvls.find((l) => {
          const prog = getCampaignLevelProgress(l.levelNumber);
          return prog.unlocked && !prog.missionDone;
        });
        if (nextPending) {
          chosen = nextPending.levelNumber;
        } else {
          const highestUnlocked = [...lvls]
            .reverse()
            .find((l) => getCampaignLevelProgress(l.levelNumber).unlocked);
          if (highestUnlocked) chosen = highestUnlocked.levelNumber;
        }
      }
      map[w.worldId] = chosen;
    }
    return map;
  }, [profile, getCampaignLevelProgress]);

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451]">
            <span>THIRD-PERSON 3D VOXEL CAMPAIGN</span>
            <span aria-hidden="true">·</span>
            <span>6 REALMS</span>
            <span aria-hidden="true">·</span>
            <span>{completedCampaignLevelsCount}/100 MISSIONS CLEARED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CODELAND Adventure Worlds
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
            Complete each level&rsquo;s Java Lesson and Guided Practice to unlock its 3D Voxel
            Mission. Clear all missions sequentially from Level 1 to Level 100 to conquer Boss
            Battles and restore the Grand Citadel Core.
          </p>
        </div>

        {profile.completedMissions.includes('M100') && (
          <button
            type="button"
            onClick={() => setCertificateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Grand Citadel Certificate</span>
          </button>
        )}
      </div>

      {/* 6 Worlds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CAMPAIGN_WORLDS.map((worldMeta) => {
          const visualSpec =
            ADVENTURE_WORLDS.find((w) => w.worldId === worldMeta.worldId) || ADVENTURE_WORLDS[0];
          const levelsInWorld = getLevelsForWorld(worldMeta.worldNumber);
          const clearedCount = levelsInWorld.filter((l) =>
            profile.completedMissions.includes(`M${l.levelNumber}`)
          ).length;
          const pct = Math.round((clearedCount / levelsInWorld.length) * 100);

          const isWorld1 = worldMeta.worldNumber === 1;
          const world1BuiltStages = isWorld1
            ? WORLD1_SITE_ORDER.reduce(
                (sum, key) => sum + Math.min(4, world1State.structureStages[key] || 0),
                0
              )
            : 0;
          const displayPct = isWorld1 ? Math.round((world1BuiltStages / 40) * 100) : pct;

          const worldUnlocked = isWorldUnlocked(worldMeta.worldNumber);
          const selectedLvlNum =
            selectedLevelByWorld[worldMeta.worldId] ?? defaultLevelPerWorld[worldMeta.worldId];
          const selectedLvl = getCampaignLevel(selectedLvlNum);
          const selectedProg = getCampaignLevelProgress(selectedLvl.levelNumber);
          const readyFor3D =
            selectedProg.unlocked &&
            (isWorld1 ||
              (selectedProg.lessonDone && selectedProg.practiceDone) ||
              selectedProg.missionDone);

          const record = missionRecords[worldMeta.worldId];
          const badgeDef = ACHIEVEMENTS_CATALOG.find((b) => b.id === worldMeta.rewardBadgeId);
          const badgeUnlocked = profile.unlockedAchievements.includes(worldMeta.rewardBadgeId);

          return (
            <div
              key={worldMeta.worldId}
              className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors ${
                worldUnlocked
                  ? 'border-stone-300 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] shadow-xs'
                  : 'border-stone-200 dark:border-emerald-950 bg-stone-100/80 dark:bg-[#0F1B15] opacity-80'
              }`}
            >
              <div>
                {/* World Biome Banner */}
                <div
                  className="h-24 p-4 flex flex-col justify-between text-white"
                  style={{
                    background: `linear-gradient(135deg, ${visualSpec.groundSecondaryHex}, ${visualSpec.groundPrimaryHex})`,
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span>
                      WORLD 0{worldMeta.worldNumber} · LV.{worldMeta.levelRange[0]}–
                      {worldMeta.levelRange[1]}
                    </span>
                    <span>
                      {clearedCount}/{levelsInWorld.length} Cleared
                    </span>
                  </div>
                  <h2 className="font-display text-base sm:text-lg drop-shadow-xs">
                    {worldMeta.name}
                  </h2>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Mentor & World Boss Reward */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarImage avatarId={worldMeta.mentorAvatarId} sizeClass="w-10 h-10" />
                      <div className="text-xs min-w-0">
                        <div className="font-bold truncate">{worldMeta.mentorName}</div>
                        <div className="text-stone-500 dark:text-stone-400 truncate">
                          {worldMeta.mentorRole}
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0 text-right"
                      title={`World Reward: ${worldMeta.rewardBadgeTitle} (+${worldMeta.rewardBonusXp} XP)`}
                    >
                      <div className="text-[11px] leading-tight">
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {worldMeta.rewardBadgeTitle}
                        </div>
                        <div className="font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451]">
                          +{worldMeta.rewardBonusXp} XP
                        </div>
                      </div>
                      <BadgeIcon
                        kind={badgeDef?.iconKind || 'crown'}
                        accentHex={worldMeta.accentColor}
                        size={34}
                        locked={!badgeUnlocked}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {worldMeta.story}
                  </p>

                  {/* World Completion Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-stone-500 dark:text-stone-400">
                      <span>
                        {isWorld1
                          ? `Settlement Stages (${world1BuiltStages}/40)`
                          : 'Realm Restoration'}
                      </span>
                      <span>{displayPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-200 dark:bg-[#0D1813] overflow-hidden">
                      <div
                        className="h-full bg-[#2F7D46] transition-all duration-300"
                        style={{ width: `${displayPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-World Mission Level Picker */}
                  {worldUnlocked && (
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-[#101E17] border border-stone-200/80 dark:border-emerald-900/60 space-y-2.5 text-xs">
                      <div className="space-y-1">
                        <label
                          htmlFor={`select-lvl-${worldMeta.worldId}`}
                          className="block font-semibold text-stone-700 dark:text-stone-200"
                        >
                          Select Campaign Mission Level
                        </label>
                        <select
                          id={`select-lvl-${worldMeta.worldId}`}
                          value={selectedLvl.levelNumber}
                          onChange={(e) => {
                            const nextNum = Number(e.target.value);
                            setSelectedLevelByWorld((prev) => ({
                              ...prev,
                              [worldMeta.worldId]: nextNum,
                            }));
                          }}
                          className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] font-mono text-xs"
                        >
                          {levelsInWorld.map((l) => {
                            const lp = getCampaignLevelProgress(l.levelNumber);
                            const siteTitle = isWorld1
                              ? `${getWorld1LevelSpec(l.levelNumber).siteName} (${
                                  world1State.structureStages[
                                    getWorld1LevelSpec(l.levelNumber).siteId
                                  ] || 0
                                }/4)`
                              : l.mission3d.missionTitle;
                            return (
                              <option
                                key={l.id}
                                value={l.levelNumber}
                                disabled={!lp.unlocked}
                              >
                                Lv.{String(l.levelNumber).padStart(2, '0')}
                                {l.isBossLevel ? ' [BOSS]' : ''} — {siteTitle}
                                {lp.missionDone ? ' ✓' : !lp.unlocked ? ' (Locked)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {selectedLvl.isBossLevel && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F28C45]">
                          <Swords className="w-3.5 h-3.5" />
                          <span>Boss Battle: {selectedLvl.bossTitle}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span>Stage 2 Java Lesson</span>
                        <span
                          className={
                            selectedProg.lessonDone
                              ? 'text-[#2F7D46] dark:text-emerald-400 font-bold inline-flex items-center gap-1'
                              : 'text-stone-500'
                          }
                        >
                          {selectedProg.lessonDone ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </>
                          ) : (
                            'Required'
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span>Stage 3 Guided Practice</span>
                        <span
                          className={
                            selectedProg.practiceDone
                              ? 'text-[#2F7D46] dark:text-emerald-400 font-bold inline-flex items-center gap-1'
                              : 'text-stone-500'
                          }
                        >
                          {selectedProg.practiceDone ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Passed
                            </>
                          ) : (
                            'Required'
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Personal Best Stats if Any Mission in World Completed */}
                  {record && (
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-0.5 text-stone-600 dark:text-emerald-200">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-[#F5C451]" /> Best: {record.bestScore}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#69B9E7]" /> Fastest:{' '}
                        {record.bestTimeSeconds}s
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer CTA */}
              <div className="px-5 py-4 border-t border-stone-200 dark:border-emerald-900/50 flex items-center justify-between gap-3 bg-stone-50/70 dark:bg-[#101F18]">
                <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-[#F5C451]">
                  {!worldUnlocked
                    ? `Clear Lv.${worldMeta.levelRange[0] - 1} first`
                    : selectedProg.missionDone
                    ? `Lv.${selectedLvl.levelNumber} Cleared`
                    : `+${selectedLvl.xpReward} XP · +${selectedLvl.coinReward} Coins`}
                </span>

                {!worldUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-stone-400">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                ) : readyFor3D ? (
                  <button
                    type="button"
                    onClick={() => openWorld(worldMeta.worldId, selectedLvl.levelNumber)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {selectedProg.missionDone ? (
                      <>
                        <Compass className="w-3.5 h-3.5" />
                        <span>Replay Lv.{selectedLvl.levelNumber} 3D</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Lv.{selectedLvl.levelNumber} 3D</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCampaignLevel(selectedLvl.levelNumber)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lv.{selectedLvl.levelNumber} Lesson &amp; Practice</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
