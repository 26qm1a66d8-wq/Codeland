import React, { useMemo, useState } from 'react';
import {
  Award,
  BookMarked,
  CheckCircle2,
  Compass,
  Lock,
  Play,
  RotateCcw,
  Search,
  Swords,
} from 'lucide-react';
import { CampaignLevel } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import {
  CAMPAIGN_LEVELS_100,
  CAMPAIGN_WORLDS,
  DIFFICULTY_PROGRESSION_BANDS,
  getCampaignWorldMeta,
  getLevelsForWorld,
  getWorldNumberForCampaignLevel,
} from '../data/campaign100';
import { ACHIEVEMENTS_CATALOG } from '../data/charactersAndBadges';
import { AvatarImage, BadgeIcon } from '../components/BadgeIcon';

type LevelFilterMode = 'all' | 'unlocked' | 'completed' | 'boss';

export const AcademyView: React.FC = () => {
  const {
    profile,
    nextIncompleteCampaignLevel,
    completedCampaignLevelsCount,
    completedCampaignLessonsCount,
    getCampaignLevelProgress,
    openCampaignLevel,
    setGlossaryOpen,
    setCertificateOpen,
  } = usePlayer();

  const [selectedWorldNum, setSelectedWorldNum] = useState<number>(() =>
    getWorldNumberForCampaignLevel(nextIncompleteCampaignLevel)
  );
  const [filterMode, setFilterMode] = useState<LevelFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const worldMeta = useMemo(
    () => getCampaignWorldMeta(selectedWorldNum),
    [selectedWorldNum]
  );

  const worldBadgeDef = useMemo(
    () => ACHIEVEMENTS_CATALOG.find((b) => b.id === worldMeta.rewardBadgeId),
    [worldMeta.rewardBadgeId]
  );

  const visibleLevels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const basePool = q ? CAMPAIGN_LEVELS_100 : getLevelsForWorld(selectedWorldNum);

    return basePool.filter((lvl) => {
      const prog = getCampaignLevelProgress(lvl.levelNumber);
      if (filterMode === 'unlocked' && !prog.unlocked) return false;
      if (filterMode === 'completed' && !prog.missionDone) return false;
      if (filterMode === 'boss' && !lvl.isBossLevel) return false;

      if (q) {
        const hay = `${lvl.levelNumber} level ${lvl.levelNumber} ${lvl.whatPlayerLearns} ${lvl.whatPlayerDoes} ${lvl.bossTitle || ''} ${lvl.partTitle || ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedWorldNum, filterMode, getCampaignLevelProgress]);

  if (!profile) return null;

  const worldLevelsAll = getLevelsForWorld(selectedWorldNum);
  const worldClearedCount = worldLevelsAll.filter((l) =>
    profile.completedMissions.includes(`M${l.levelNumber}`)
  ).length;
  const worldProgressPct = Math.round((worldClearedCount / worldLevelsAll.length) * 100);
  const rewardUnlocked = profile.unlockedAchievements.includes(worldMeta.rewardBadgeId);

  const renderLevelRow = (lvl: CampaignLevel) => {
    const prog = getCampaignLevelProgress(lvl.levelNumber);
    const lvlWorldMeta = getCampaignWorldMeta(lvl.worldNumber);

    return (
      <div
        key={lvl.id}
        className={`p-4 sm:p-5 rounded-2xl border transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          prog.missionDone
            ? 'border-[#2F7D46]/65 bg-[#2F7D46]/8 dark:bg-[#162E22]'
            : lvl.isBossLevel && prog.unlocked
            ? 'border-[#F5C451]/80 bg-amber-50/50 dark:bg-[#1B2D21]'
            : prog.unlocked
            ? 'border-stone-300/90 dark:border-emerald-900/70 bg-white dark:bg-[#14261E]'
            : 'border-stone-200 dark:border-emerald-950 bg-stone-100/70 dark:bg-[#0E1A14] opacity-70'
        }`}
      >
        <div className="space-y-2 max-w-3xl">
          {/* Unboxed Metadata Kicker */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
            <span className="font-bold text-[#173B2B] dark:text-[#F5C451]">
              Level {String(lvl.levelNumber).padStart(2, '0')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{lvlWorldMeta.name}</span>
            <span aria-hidden="true">·</span>
            <span>{lvl.difficultyBandLabel}</span>
            {lvl.isBossLevel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-sans font-bold text-[#F28C45]">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Boss Battle: {lvl.bossTitle}</span>
                </span>
              </>
            )}
            {!prog.unlocked && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-sans text-stone-500 dark:text-stone-400">
                  <Lock className="w-3 h-3" /> Clear Level {lvl.levelNumber - 1} to unlock
                </span>
              </>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-snug">
            {lvl.whatPlayerLearns}
          </h3>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            <strong className="text-stone-800 dark:text-emerald-200">In-Game Mission:</strong>{' '}
            {lvl.whatPlayerDoes}
          </p>

          {/* 5-Stage Progress Indicator (Unboxed Clean Checkpoints) */}
          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <span className={prog.unlocked ? 'text-stone-700 dark:text-stone-200' : ''}>
              1. Briefing
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                prog.lessonDone ? 'font-semibold text-[#2F7D46] dark:text-emerald-300' : ''
              }
            >
              2. Lesson {prog.lessonDone ? '✓' : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                prog.practiceDone ? 'font-semibold text-[#2F7D46] dark:text-emerald-300' : ''
              }
            >
              3. Practice {prog.practiceDone ? '✓' : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                prog.missionDone ? 'font-semibold text-[#2F7D46] dark:text-emerald-300' : ''
              }
            >
              4. 3D Mission {prog.missionDone ? '✓' : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451]">
              +{lvl.xpReward} XP · +{lvl.coinReward} Coins
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {prog.unlocked ? (
            <>
              <button
                type="button"
                onClick={() => openCampaignLevel(lvl.levelNumber)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {prog.missionDone ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Level</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {!prog.lessonDone
                        ? 'Start Level'
                        : !prog.practiceDone
                        ? 'Continue Practice'
                        : 'Open Stage 4'}
                    </span>
                  </>
                )}
              </button>

              {((prog.lessonDone && prog.practiceDone) || prog.missionDone) && (
                <button
                  type="button"
                  onClick={() => openCampaignLevel(lvl.levelNumber, 4)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{prog.missionDone ? 'Replay 3D' : 'Play 3D Mission'}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 text-stone-400 whitespace-nowrap shrink-0 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Locked</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451]">
            <span>CODELAND 100-Level Java Campaign</span>
            <span aria-hidden="true">·</span>
            <span>{completedCampaignLevelsCount}/100 Levels Cleared</span>
            <span aria-hidden="true">·</span>
            <span>{completedCampaignLessonsCount}/100 Lessons Completed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CODELAND Java Academy
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
            Every level guides you through 5 stages: Story Briefing, Interactive Java Lesson, Guided
            Practice, a live 3D Voxel Gameplay Mission, and Mastery Completion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openCampaignLevel(nextIncompleteCampaignLevel)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Continue Level {nextIncompleteCampaignLevel}</span>
          </button>

          {profile.completedMissions.includes('M100') && (
            <button
              type="button"
              onClick={() => setCertificateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Award className="w-4 h-4 text-[#F5C451]" />
              <span>Certificate</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setGlossaryOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#173B2B] hover:bg-[#20503A] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookMarked className="w-4 h-4 text-[#F5C451]" />
            <span>Java Glossary</span>
          </button>
        </div>
      </div>

      {/* 6 World Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CAMPAIGN_WORLDS.map((w) => {
          const active = selectedWorldNum === w.worldNumber && !searchQuery.trim();
          const lvls = getLevelsForWorld(w.worldNumber);
          const done = lvls.filter((l) =>
            profile.completedMissions.includes(`M${l.levelNumber}`)
          ).length;

          return (
            <button
              key={w.worldId}
              type="button"
              onClick={() => {
                setSelectedWorldNum(w.worldNumber);
                setSearchQuery('');
              }}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-[#2F7D46] bg-[#2F7D46] text-white shadow-xs'
                  : 'border-stone-300 dark:border-emerald-900/70 bg-white dark:bg-[#14261E] text-stone-700 dark:text-stone-200 hover:border-[#2F7D46]'
              }`}
            >
              W{w.worldNumber}: {w.name} ({w.levelRange[0]}–{w.levelRange[1]}) · {done}/{lvls.length}
            </button>
          );
        })}
      </div>

      {/* Selected World Story, Mentor & World Reward Card */}
      {!searchQuery.trim() && (
        <section className="rounded-2xl border border-stone-300/90 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] overflow-hidden shadow-xs">
          <div className="h-2 w-full" style={{ backgroundColor: worldMeta.accentColor }} />
          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                <span>WORLD 0{worldMeta.worldNumber}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Levels {worldMeta.levelRange[0]}–{worldMeta.levelRange[1]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{worldMeta.biomeTitle}</span>
              </div>

              <h2 className="font-display text-lg sm:text-xl text-[#173B2B] dark:text-white">
                {worldMeta.name}
              </h2>

              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {worldMeta.story}
              </p>

              <div className="space-y-1 pt-1 max-w-md">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                  <span>World Completion</span>
                  <span>
                    {worldClearedCount}/{worldLevelsAll.length} Levels ({worldProgressPct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 dark:bg-[#0D1813] overflow-hidden">
                  <div
                    className="h-full bg-[#2F7D46] transition-all duration-300"
                    style={{ width: `${worldProgressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mentor Card */}
              <div className="p-3.5 rounded-xl bg-stone-100/80 dark:bg-[#0F1E17] border border-stone-200 dark:border-emerald-900/60 flex items-center gap-3">
                <AvatarImage avatarId={worldMeta.mentorAvatarId} sizeClass="w-12 h-12" />
                <div className="min-w-0 text-xs space-y-0.5">
                  <div className="text-stone-500 dark:text-stone-400">World Mentor</div>
                  <div className="font-bold text-stone-900 dark:text-white truncate">
                    {worldMeta.mentorName}
                  </div>
                  <div className="text-stone-600 dark:text-emerald-300 truncate">
                    {worldMeta.mentorRole}
                  </div>
                </div>
              </div>

              {/* World Reward Card */}
              <div className="p-3.5 rounded-xl bg-stone-100/80 dark:bg-[#0F1E17] border border-stone-200 dark:border-emerald-900/60 flex items-center gap-3">
                <BadgeIcon
                  kind={worldBadgeDef?.iconKind || 'crown'}
                  accentHex={worldMeta.accentColor}
                  size={42}
                  locked={!rewardUnlocked}
                />
                <div className="min-w-0 text-xs space-y-0.5">
                  <div className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <span>World Reward</span>
                    {rewardUnlocked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D46] dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="font-bold text-stone-900 dark:text-white truncate">
                    {worldMeta.rewardBadgeTitle}
                  </div>
                  <div className="font-mono tabular-nums text-[#2F7D46] dark:text-[#F5C451] truncate">
                    +{worldMeta.rewardBonusXp} XP
                    {worldMeta.includesCertificate ? ' + Certificate' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 100 levels by Java concept, Scanner, OOP, loops..."
            aria-label="Search Java levels"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] text-xs focus:outline-none focus:border-[#F5C451]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter campaign levels"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-200/80 dark:bg-[#0F1E17] border border-stone-300/60 dark:border-emerald-900/60 overflow-x-auto"
        >
          {(
            [
              { id: 'all', label: 'All Levels' },
              { id: 'unlocked', label: 'Unlocked' },
              { id: 'completed', label: 'Completed' },
              { id: 'boss', label: 'Boss Battles' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterMode === f.id
                  ? 'bg-white dark:bg-[#2F7D46] text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Levels List (Grouped by Part on World 6 when not searching) */}
      {visibleLevels.length === 0 ? (
        <div className="p-8 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] text-center space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            No campaign levels match your current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : !searchQuery.trim() && worldMeta.parts ? (
        <div className="space-y-6">
          {worldMeta.parts.map((part) => {
            const partLevels = visibleLevels.filter(
              (l) => l.levelNumber >= part.range[0] && l.levelNumber <= part.range[1]
            );
            if (partLevels.length === 0) return null;
            return (
              <div key={part.title} className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-300/70 dark:border-emerald-900/60 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-[#173B2B] dark:text-[#F5C451]">
                    {part.title}
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                    Levels {part.range[0]}–{part.range[1]}
                  </span>
                </div>
                <div className="space-y-3">{partLevels.map(renderLevelRow)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">{visibleLevels.map(renderLevelRow)}</div>
      )}

      {/* 6-Band Difficulty Progression Architecture */}
      <section className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">100-Level Difficulty Progression Architecture</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Every concept is taught before it is ever required in a puzzle or 3D Boss Battle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {DIFFICULTY_PROGRESSION_BANDS.map((band) => (
            <div
              key={band.rangeLabel}
              className="p-4 rounded-xl border border-stone-200 dark:border-emerald-900/60 bg-stone-50 dark:bg-[#0F1E17] space-y-1"
            >
              <div className="text-xs font-mono font-bold text-[#2F7D46] dark:text-[#F5C451]">
                {band.rangeLabel}
              </div>
              <div className="text-sm font-bold">{band.title}</div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {band.summary}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
