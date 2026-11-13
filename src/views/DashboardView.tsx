import React, { useMemo } from 'react';
import { AppSection, LeaderboardPlayer } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { computePlayerLevelFromXp, getIsoWeekKey } from '../lib/dateUtils';
import {
  getCampaignLevel,
  getCampaignWorldMeta,
  getLevelsForWorld,
} from '../data/campaign100';
import { WORLD1_SITE_ORDER, getWorld1LevelSpec } from '../data/world1ForestData';
import { DashboardHero3DScene } from '../game/DashboardHero3DScene';
import { ParchmentQuestsBoard } from '../components/hub/ParchmentQuestsBoard';
import { DailyRewardChestCard } from '../components/hub/DailyRewardChestCard';
import { ContinueAdventureCard } from '../components/hub/ContinueAdventureCard';
import { StreakAndProgressCard } from '../components/hub/StreakAndProgressCard';
import { WeeklyLeaderboardCard } from '../components/hub/WeeklyLeaderboardCard';
import { WorldPortalsGrid } from '../components/hub/WorldPortalsGrid';
import { RecentAchievementsCard } from '../components/hub/RecentAchievementsCard';
import { MultiplayerQuickPanel } from '../components/hub/MultiplayerQuickPanel';
import { WallEmbeddedWorldPortals } from '../components/hub/WallEmbeddedWorldPortals';
import { CobblestonePedestalsDock } from '../components/hub/CobblestonePedestalsDock';

export const DashboardView: React.FC = () => {
  const {
    profile,
    world1State,
    effectiveStreak,
    totalActiveDays,
    activityLogs,
    cloudLeaderboard,
    demoChallengers,
    dailyGoalStatus,
    dailyRewardClaimedToday,
    claimDailyRewardChest,
    nextIncompleteCampaignLevel,
    completedCampaignLevelsCount,
    completedCampaignLessonsCount,
    getCampaignLevelProgress,
    isCampaignLevelUnlocked,
    openCampaignLevel,
    openWorld,
    setCertificateOpen,
    setSection,
    activeRoom,
    incomingInvitations,
    openCreatePrivateRoomFlow,
    joinRoomByCodeAction,
  } = usePlayer();

  const rankInfo = useMemo(
    () => computePlayerLevelFromXp(profile?.totalXp || 0),
    [profile?.totalXp]
  );

  // Compute current player's weekly rank (strictly isolating demo challengers to Demo Mode)
  const playerRankNumber = useMemo(() => {
    if (!profile) return 1;
    const currentWeekKey = getIsoWeekKey();
    const selfEntry: LeaderboardPlayer = {
      uid: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      totalXp: profile.totalXp,
      dailyXp: profile.dailyXp,
      weeklyXp: profile.weeklyXp,
      lastDailyKey: profile.lastDailyKey,
      lastWeeklyKey: profile.lastWeeklyKey,
      currentStreak: effectiveStreak,
      achievementsCount: profile.unlockedAchievements.length,
      lessonsCompletedCount: profile.completedLessons.length,
      missionsCompletedCount: profile.completedMissions.length,
    };

    const map = new Map<string, LeaderboardPlayer>();
    cloudLeaderboard.forEach((p) => map.set(p.uid, p));
    if (profile.isDemo) {
      demoChallengers.forEach((d) => {
        if (!map.has(d.uid)) map.set(d.uid, d);
      });
    }
    map.set(selfEntry.uid, selfEntry);

    const getWeekly = (p: LeaderboardPlayer) =>
      p.lastWeeklyKey === currentWeekKey ? Math.max(0, p.weeklyXp) : 0;

    const sorted = Array.from(map.values()).sort((a, b) => {
      const diff = getWeekly(b) - getWeekly(a);
      if (diff !== 0) return diff;
      return b.totalXp - a.totalXp;
    });

    const idx = sorted.findIndex((x) => x.uid === profile.uid);
    return idx >= 0 ? idx + 1 : sorted.length;
  }, [profile, effectiveStreak, cloudLeaderboard, demoChallengers]);

  // World 1 total built stages (0..40) and next World 1 level
  const { world1BuiltStages, nextWorld1Level } = useMemo(() => {
    const built = WORLD1_SITE_ORDER.reduce(
      (sum, siteId) => sum + Math.min(4, world1State.structureStages[siteId] || 0),
      0
    );
    let nextLv = 1;
    for (let lv = 1; lv <= 10; lv++) {
      if (!world1State.completedLevels.includes(lv)) {
        nextLv = lv;
        break;
      }
      if (lv === 10) nextLv = 10;
    }
    return { world1BuiltStages: built, nextWorld1Level: nextLv };
  }, [world1State.structureStages, world1State.completedLevels]);

  // Active campaign level & smart Continue Your Adventure state
  const continueConfig = useMemo(() => {
    const targetLevelNum =
      completedCampaignLevelsCount >= 100 ? 100 : nextIncompleteCampaignLevel;
    const lvl = getCampaignLevel(targetLevelNum);
    const worldMeta = getCampaignWorldMeta(lvl.worldNumber);
    const prog = getCampaignLevelProgress(lvl.levelNumber);

    if (completedCampaignLevelsCount >= 100) {
      return {
        worldNumber: 6,
        worldName: worldMeta.name,
        levelNumber: 100,
        conceptTitle: 'Master Java Architect',
        stageSummary:
          'Every realm from Starter Forest to Object Kingdom is restored! Claim your official certificate or explore any 3D world.',
        lessonDone: true,
        practiceDone: true,
        missionDone: true,
        primaryCtaLabel: 'Explore Worlds',
        onContinue: () => setSection(AppSection.WORLDS),
        onStartLessonQuest: () => setSection(AppSection.ACADEMY),
        onStartMissionQuest: () => openWorld('world-1', 10),
      };
    }

    if (lvl.worldNumber === 1) {
      const w1Spec = getWorld1LevelSpec(lvl.levelNumber);
      const stageBuilt = world1State.structureStages[w1Spec.siteId] || 0;
      return {
        worldNumber: 1,
        worldName: worldMeta.name,
        levelNumber: lvl.levelNumber,
        conceptTitle: lvl.whatPlayerLearns,
        stageSummary: `${w1Spec.siteName} (${stageBuilt}/4 Stages Built) · Meet Sprout in 3D and write Java code to restore ${w1Spec.structureTitle}.`,
        lessonDone: prog.lessonDone || stageBuilt > 0,
        practiceDone: prog.practiceDone || stageBuilt >= 2,
        missionDone: prog.missionDone,
        primaryCtaLabel: stageBuilt > 0 ? 'Continue' : 'Continue Lesson',
        onContinue: () => openWorld('world-1', lvl.levelNumber),
        onStartLessonQuest: () => openCampaignLevel(lvl.levelNumber, 1),
        onStartMissionQuest: () => openWorld('world-1', lvl.levelNumber),
      };
    }

    if (!prog.lessonDone) {
      return {
        worldNumber: lvl.worldNumber,
        worldName: worldMeta.name,
        levelNumber: lvl.levelNumber,
        conceptTitle: lvl.whatPlayerLearns,
        stageSummary: `${lvl.briefing.storyHeadline} — Complete the interactive Java lesson with ${worldMeta.mentorName}.`,
        lessonDone: false,
        practiceDone: prog.practiceDone,
        missionDone: prog.missionDone,
        primaryCtaLabel: 'Continue Lesson',
        onContinue: () => openCampaignLevel(lvl.levelNumber, 1),
        onStartLessonQuest: () => openCampaignLevel(lvl.levelNumber, 1),
        onStartMissionQuest: () => openCampaignLevel(lvl.levelNumber, 1),
      };
    }

    if (!prog.practiceDone) {
      return {
        worldNumber: lvl.worldNumber,
        worldName: worldMeta.name,
        levelNumber: lvl.levelNumber,
        conceptTitle: lvl.whatPlayerLearns,
        stageSummary: `Lesson complete! Finish Guided Java Practice to unlock the 3D mission in ${worldMeta.name}.`,
        lessonDone: true,
        practiceDone: false,
        missionDone: prog.missionDone,
        primaryCtaLabel: 'Continue Practice',
        onContinue: () => openCampaignLevel(lvl.levelNumber, 3),
        onStartLessonQuest: () => openCampaignLevel(lvl.levelNumber, 3),
        onStartMissionQuest: () => openCampaignLevel(lvl.levelNumber, 3),
      };
    }

    return {
      worldNumber: lvl.worldNumber,
      worldName: worldMeta.name,
      levelNumber: lvl.levelNumber,
      conceptTitle: lvl.whatPlayerLearns,
      stageSummary: lvl.whatPlayerDoes,
      lessonDone: true,
      practiceDone: true,
      missionDone: prog.missionDone,
      primaryCtaLabel: 'Enter 3D Mission',
      onContinue: () => openCampaignLevel(lvl.levelNumber, 4),
      onStartLessonQuest: () => openCampaignLevel(lvl.levelNumber, 1),
      onStartMissionQuest: () => openCampaignLevel(lvl.levelNumber, 4),
    };
  }, [
    completedCampaignLevelsCount,
    nextIncompleteCampaignLevel,
    getCampaignLevelProgress,
    world1State.structureStages,
    openCampaignLevel,
    openWorld,
    setSection,
  ]);

  // Current active world's completion percentage for the circular ring
  const currentWorldStats = useMemo(() => {
    if (!profile) return { name: 'Starter Forest', pct: 0 };
    const wNum = continueConfig.worldNumber;
    const worldMeta = getCampaignWorldMeta(wNum);
    if (wNum === 1) {
      return {
        name: `W1: ${worldMeta.name}`,
        pct: Math.round((world1BuiltStages / 40) * 100),
      };
    }
    const levels = getLevelsForWorld(wNum);
    const cleared = levels.filter((l) =>
      profile.completedMissions.includes(`M${l.levelNumber}`)
    ).length;
    return {
      name: `W${wNum}: ${worldMeta.name}`,
      pct: Math.round((cleared / Math.max(1, levels.length)) * 100),
    };
  }, [profile, continueConfig.worldNumber, world1BuiltStages]);

  if (!profile) return null;

  return (
    <div className="min-h-full bg-[#080D21] text-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto p-3 sm:p-5 space-y-4">
        {/* UPPER MAIN ZONE: Hero Rampart & 6 Wall Portals on Left (8 cols) + Quests, Reward, Leaderboard on Right (4 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left / Center: 3D Hero Rampart Scene + The 6 Arched World Portals Built on the Stone Wall */}
          <div className="xl:col-span-8 space-y-3.5">
            <DashboardHero3DScene
              displayName={profile.displayName}
              avatarId={profile.avatarId}
              playerLevel={rankInfo.level}
              rankTitle={rankInfo.rankTitle}
              equippedForestOutfit={world1State.equippedForestOutfit}
              equippedCompanionAccessory={world1State.equippedCompanionAccessory}
              graphicsQuality={profile.graphicsQuality}
              onEnterWorld={continueConfig.onContinue}
            />

            {/* The 6 Arched Realm Portals Built into the Center Stone Wall (Matching Reference Image) */}
            <WallEmbeddedWorldPortals
              onSelectWorld={(worldId, startLevel) => openWorld(worldId, startLevel)}
            />
          </div>

          {/* Right Column: Today's Quests Parchment + Daily Reward Chest + Weekly Leaderboard 4-Row Card */}
          <div className="xl:col-span-4 space-y-3.5">
            <ParchmentQuestsBoard
              lessonDone={dailyGoalStatus.lessonDone}
              missionDone={dailyGoalStatus.missionDone}
              dailyXp={profile.dailyXp}
              lastDailyKey={profile.lastDailyKey}
              onStartLesson={continueConfig.onStartLessonQuest}
              onStartMission={continueConfig.onStartMissionQuest}
              onViewAll={() => setSection(AppSection.ACADEMY)}
            />

            <DailyRewardChestCard
              claimedToday={dailyRewardClaimedToday}
              effectiveStreak={effectiveStreak}
              onClaim={claimDailyRewardChest}
            />

            <WeeklyLeaderboardCard
              currentUserId={profile.uid}
              username={profile.username}
              displayName={profile.displayName}
              avatarId={profile.avatarId}
              totalXp={profile.totalXp}
              weeklyXp={profile.weeklyXp}
              onOpenLeaderboard={() => setSection(AppSection.LEADERBOARD)}
            />
          </div>
        </div>

        {/* BOTTOM DOCK: 5 Carved Stone Pedestals (Skills, Quests, Achievements, Shop, My Base) + Winter Event Banner */}
        <CobblestonePedestalsDock
          onOpenSkills={() => setSection(AppSection.ACADEMY)}
          onOpenQuests={() => continueConfig.onStartLessonQuest()}
          onOpenAchievements={() => setSection(AppSection.ACHIEVEMENTS)}
          onOpenShop={() => setSection(AppSection.SHOP)}
          onOpenMyBase={() => openWorld('world-1', nextWorld1Level)}
          onOpenWinterEvent={() => setSection(AppSection.EVENTS)}
        />

        {/* BELOW THE FOLD: Deep Campaign Level Nodes, Multiplayer Guild & Full History */}
        <div className="pt-6 border-t border-indigo-500/20 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-6">
              <ContinueAdventureCard
                worldNumber={continueConfig.worldNumber}
                worldName={continueConfig.worldName}
                levelNumber={continueConfig.levelNumber}
                conceptTitle={continueConfig.conceptTitle}
                stageSummary={continueConfig.stageSummary}
                lessonDone={continueConfig.lessonDone}
                practiceDone={continueConfig.practiceDone}
                missionDone={continueConfig.missionDone}
                all100Completed={completedCampaignLevelsCount >= 100}
                primaryCtaLabel={continueConfig.primaryCtaLabel}
                onContinue={continueConfig.onContinue}
                onOpenPractice={() => setSection(AppSection.PRACTICE)}
                onOpenCertificate={() => setCertificateOpen(true)}
              />
            </div>

            <div className="lg:col-span-6">
              <StreakAndProgressCard
                effectiveStreak={effectiveStreak}
                longestStreak={profile.longestStreak}
                totalActiveDays={totalActiveDays}
                dailyXp={profile.dailyXp}
                lastDailyKey={profile.lastDailyKey}
                activityDates={profile.activityDates}
                totalXp={profile.totalXp}
                playerLevel={rankInfo.level}
                coins={profile.coins}
                lessonsCompletedCount={completedCampaignLessonsCount}
                missionsCompletedCount={completedCampaignLevelsCount}
                currentWorldCompletionPct={currentWorldStats.pct}
                currentWorldName={currentWorldStats.name}
                playerRankNumber={playerRankNumber}
                dailyGoalStatus={dailyGoalStatus}
                onOpenProfile={() => setSection(AppSection.PROFILE)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-mono tracking-wider text-cyan-400 font-extrabold">
                Campaign Map · 100 Restorable Levels
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Six Magical Realm Portals
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSection(AppSection.WORLDS)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Explore Full Map →
            </button>
          </div>

          {/* Six Magical World Portals (Worlds 1–6, Levels 1–100) */}
          <WorldPortalsGrid
            completedMissions={profile.completedMissions}
            world1State={world1State}
            isCampaignLevelUnlocked={isCampaignLevelUnlocked}
            onEnterWorld1={(lvlNum) => openWorld('world-1', lvlNum)}
            onOpenCampaignLevel={(lvlNum) => openCampaignLevel(lvlNum)}
            onExploreAllWorlds={() => setSection(AppSection.WORLDS)}
            onLockedWorldClick={(worldId) => openWorld(worldId)}
          />

          {/* Recent Achievements + Private Multiplayer Rooms & Direct Invites */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-6">
              <RecentAchievementsCard
                unlockedAchievementIds={profile.unlockedAchievements}
                activityLogs={activityLogs}
                onViewAll={() => setSection(AppSection.ACHIEVEMENTS)}
                onStartFirstLesson={continueConfig.onContinue}
              />
            </div>

            <div className="lg:col-span-6">
              <MultiplayerQuickPanel
                activeRoom={activeRoom}
                pendingInvitesCount={incomingInvitations.length}
                onCreatePrivateRoom={openCreatePrivateRoomFlow}
                onJoinRoomByCode={joinRoomByCodeAction}
                onOpenMultiplayerHub={() => setSection(AppSection.MULTIPLAYER)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
