import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Compass,
  Flame,
  Hammer,
  Lock,
  Map as MapIcon,
  MessageSquare,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AppSection,
  CodeValidationSpec,
  GraphicsQuality,
  World1SiteId,
} from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import {
  SPROUT_INTRO_QUOTE,
  WORLD1_LEVELS,
  WORLD1_SITE_ORDER,
  getWorld1LevelSpec,
} from '../data/world1ForestData';
import {
  BeginnerForestCanvas,
  ConstructionCutawaySignal,
  ForestNearbyTarget,
  PlayerReactionSignal,
  SproutMoodSignal,
  TeleportSignal,
  WORLD1_COIN_SPOTS,
} from '../game/world1/BeginnerForestCanvas';
import { MobileControlState } from '../game/VoxelAdventureCanvas';
import { AvatarImage, BadgeIcon } from '../components/BadgeIcon';
import { JavaCodeEditor } from '../components/JavaCodeEditor';
import { runJavaSimulator } from '../lib/javaSimulator';
import { soundFX } from '../lib/audio';

// 9-Step Level Progression
type ConsoleStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type OverlayModal = 'console' | 'sprout' | 'map' | 'inventory' | 'pause' | 'finale' | null;

const STEP_LABELS: { step: ConsoleStep; shortLabel: string }[] = [
  { step: 1, shortLabel: '1. Briefing' },
  { step: 2, shortLabel: '2. Java Concept' },
  { step: 3, shortLabel: '3. Worked Example' },
  { step: 4, shortLabel: '4. Construction Stage 1' },
  { step: 5, shortLabel: '5. Construction Stage 2' },
  { step: 6, shortLabel: '6. Construction Stage 3' },
  { step: 7, shortLabel: '7. Construction Stage 4' },
  { step: 8, shortLabel: '8. Impact & World Reveal' },
  { step: 9, shortLabel: '9. Rewards' },
];

export const World1ForestGameView: React.FC = () => {
  const {
    profile,
    effectiveStreak,
    activeCampaignLevel,
    setActiveCampaignLevel,
    setSection,
    getCampaignLevelProgress,
    isCampaignLevelUnlocked,
    completeCampaignLesson,
    completeCampaignGuidedPractice,
    saveSettings,
    world1State,
    recordWorld1TaskSolved,
    collectWorld1Supply,
    completeWorld1Level,
    saveWorld1Checkpoint,
    toggleWorld1Cosmetics,
    updateWorld1ScannerRegistration,
    markWorld1CinematicTourDone,
    openWorld,
  } = usePlayer();

  const currentLevelNum = useMemo(
    () => Math.max(1, Math.min(10, activeCampaignLevel || 1)),
    [activeCampaignLevel]
  );

  const levelSpec = useMemo(
    () => getWorld1LevelSpec(currentLevelNum),
    [currentLevelNum]
  );

  const campaignProg = getCampaignLevelProgress(currentLevelNum);

  // HUD & Modal States
  const [overlay, setOverlay] = useState<OverlayModal>(null);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [sproutBubbleHidden, setSproutBubbleHidden] = useState<boolean>(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [nearbyTarget, setNearbyTarget] = useState<ForestNearbyTarget>(null);
  const [explorationToast, setExplorationToast] = useState<string | null>(null);
  const [objectiveDistMeters, setObjectiveDistMeters] = useState<number | null>(null);

  // 9-Step Progression State for Current Level
  const [activeStep, setActiveStep] = useState<ConsoleStep>(1);
  const [lessonReadyLocal, setLessonReadyLocal] = useState<boolean>(false);
  const [exampleOutputLines, setExampleOutputLines] = useState<string[] | null>(null);

  const [taskCodes, setTaskCodes] = useState<[string, string, string, string]>([
    levelSpec.tasks[0].starterCode,
    levelSpec.tasks[1].starterCode,
    levelSpec.tasks[2].starterCode,
    levelSpec.tasks[3].starterCode,
  ]);
  const [sessionStageBuilt, setSessionStageBuilt] = useState<number>(0);
  const [isReplayBuildSession, setIsReplayBuildSession] = useState<boolean>(false);
  const [sessionSupplyPurchased, setSessionSupplyPurchased] = useState<boolean>(false);
  const [sessionSupplyCollected, setSessionSupplyCollected] = useState<boolean>(false);

  // Live Scanner Custom Input (for Level 9 Task 4 & Level 10 Task 4)
  const [scannerExplorerName, setScannerExplorerName] = useState<string>(
    world1State.registeredVillagerName || profile?.displayName || 'Explorer'
  );
  const [scannerCrystalInput, setScannerCrystalInput] = useState<string>(
    String(world1State.registeredCrystalCount || 25)
  );

  // Cutaway Construction Banner & Signals
  const [constructionSignal, setConstructionSignal] = useState<ConstructionCutawaySignal | null>(
    null
  );
  const [buildingBanner, setBuildingBanner] = useState<{
    stageNumber: number;
    stageLabel: string;
    nextStationLabel: string | null;
    spawnedSupplyLabel?: string;
    readyToAdvance: boolean;
  } | null>(null);

  const [reactionSignal, setReactionSignal] = useState<PlayerReactionSignal | null>(null);
  const [sproutMoodSignal, setSproutMoodSignal] = useState<SproutMoodSignal | null>(null);
  const [sproutFeedbackTip, setSproutFeedbackTip] = useState<string | null>(null);
  const [teleportSignal, setTeleportSignal] = useState<TeleportSignal | null>(null);

  // Collectible Coins & Level Timer
  const [collectedCoinIndices, setCollectedCoinIndices] = useState<Set<number>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const latestPlayerPosRef = useRef<[number, number, number]>(levelSpec.spawnPosition);
  const skipNextSpawnTeleportRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  // Level 10 / World 1 Cinematic Tour State
  const [tourActive, setTourActive] = useState<boolean>(false);
  const [tourLandmarkLevel, setTourLandmarkLevel] = useState<number>(1);

  // Completion Reward Summary for Step 9
  const [completionSummary, setCompletionSummary] = useState<{
    xpAwarded: number;
    totalCoinsAwarded: number;
    firstTime: boolean;
    world1RestoredNow: boolean;
    score: number;
    timeSeconds: number;
  } | null>(null);

  const mobileControlsRef = useRef<MobileControlState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jumpRequested: false,
    interactRequested: false,
  });

  const showTimedExplorationToast = useCallback((msg: string) => {
    setExplorationToast(msg);
    setSproutBubbleHidden(false);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setExplorationToast(null);
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Initialize state cleanly whenever `currentLevelNum` changes
  useEffect(() => {
    const spec = getWorld1LevelSpec(currentLevelNum);
    const persistedStage = world1State.structureStages[spec.siteId] || 0;
    const lp = getCampaignLevelProgress(currentLevelNum);

    setLessonReadyLocal(lp.lessonDone && lp.practiceDone);
    setExampleOutputLines(null);
    setTaskCodes([
      spec.tasks[0].starterCode,
      spec.tasks[1].starterCode,
      spec.tasks[2].starterCode,
      spec.tasks[3].starterCode,
    ]);
    setSproutFeedbackTip(null);
    setExplorationToast(null);
    setBuildingBanner(null);
    setCompletionSummary(null);
    setElapsedSeconds(0);
    setSproutBubbleHidden(false);
    setSessionSupplyPurchased(false);
    setSessionSupplyCollected(false);

    if (persistedStage >= 4) {
      setSessionStageBuilt(4);
      setIsReplayBuildSession(false);
    } else {
      setSessionStageBuilt(persistedStage);
      setIsReplayBuildSession(false);
    }

    // Resume smartly at the exact next incomplete step in the 9-step flow
    if (!lp.lessonDone || !lp.practiceDone) {
      setActiveStep(1);
    } else if (persistedStage < 4) {
      setActiveStep((4 + persistedStage) as ConsoleStep);
    } else {
      setActiveStep(8);
    }

    if (skipNextSpawnTeleportRef.current) {
      skipNextSpawnTeleportRef.current = false;
    } else {
      latestPlayerPosRef.current = spec.spawnPosition;
      setTeleportSignal({
        nonce: Date.now(),
        position: spec.spawnPosition,
      });
    }
  }, [currentLevelNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut `H` to collapse/expand bottom HUD dock & `Escape` to pause/close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          Boolean(el.closest('.cm-editor')));
      if (typing) return;

      if (e.code === 'KeyH' && !overlay) {
        e.preventDefault();
        setHudCollapsed((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (tourActive) {
          setTourActive(false);
          setOverlay('finale');
        } else if (overlay) {
          setOverlay(null);
        } else {
          setOverlay('pause');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, tourActive]);

  // Mission elapsed timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (overlay !== 'pause' && !tourActive) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [overlay, tourActive]);

  // Compute visual stages passed to 3D Canvas:
  // All non-active sites ALWAYS show their persisted stage; active site shows replay stage if replaying!
  const visualStages = useMemo(() => {
    const map = { ...world1State.structureStages };
    if (isReplayBuildSession) {
      map[levelSpec.siteId] = sessionStageBuilt;
    } else {
      map[levelSpec.siteId] = Math.max(map[levelSpec.siteId] || 0, sessionStageBuilt);
    }
    return map;
  }, [world1State.structureStages, levelSpec.siteId, isReplayBuildSession, sessionStageBuilt]);

  // Effective supply states (respecting clean Replay sessions on Level 2)
  const effectivePurchasedSupplyIds = useMemo(() => {
    if (isReplayBuildSession && levelSpec.siteId === 'workshop') {
      return sessionSupplyPurchased ? ['workshop_supplies'] : [];
    }
    const base = new Set(world1State.purchasedSupplyIds || []);
    if (sessionSupplyPurchased) base.add('workshop_supplies');
    return Array.from(base);
  }, [
    isReplayBuildSession,
    levelSpec.siteId,
    sessionSupplyPurchased,
    world1State.purchasedSupplyIds,
  ]);

  const effectiveCollectedSupplyIds = useMemo(() => {
    if (isReplayBuildSession && levelSpec.siteId === 'workshop') {
      return sessionSupplyCollected ? ['workshop_supplies'] : [];
    }
    const base = new Set(world1State.collectedSupplyIds || []);
    if (sessionSupplyCollected) base.add('workshop_supplies');
    return Array.from(base);
  }, [
    isReplayBuildSession,
    levelSpec.siteId,
    sessionSupplyCollected,
    world1State.collectedSupplyIds,
  ]);

  const totalStagesRestored = useMemo(
    () =>
      WORLD1_SITE_ORDER.reduce(
        (sum, key) => sum + Math.min(4, world1State.structureStages[key] || 0),
        0
      ),
    [world1State.structureStages]
  );

  const allTenRestored = totalStagesRestored >= 40;

  const lessonReady =
    (campaignProg.lessonDone && campaignProg.practiceDone) || lessonReadyLocal;
  const currentActiveStageCount = visualStages[levelSpec.siteId] || 0;

  const activeTaskNumberFor3D: 1 | 2 | 3 | 4 | null =
    currentActiveStageCount < 4
      ? ((currentActiveStageCount + 1) as 1 | 2 | 3 | 4)
      : null;

  const needsWorkshopSupplyPickup =
    levelSpec.siteId === 'workshop' &&
    effectivePurchasedSupplyIds.includes('workshop_supplies') &&
    !effectiveCollectedSupplyIds.includes('workshop_supplies');

  const carryingWorkshopSupply =
    levelSpec.siteId === 'workshop' &&
    effectiveCollectedSupplyIds.includes('workshop_supplies') &&
    currentActiveStageCount < 4;

  // Check whether the player is physically within interaction range of a given stage's 3D station
  const isPlayerPhysicallyAtTaskStation = useCallback(
    (stageNum: 1 | 2 | 3 | 4): boolean => {
      if (
        nearbyTarget?.kind === 'task_station' &&
        nearbyTarget.siteId === levelSpec.siteId &&
        nearbyTarget.taskNumber === stageNum
      ) {
        return true;
      }
      const stPos = levelSpec.tasks[stageNum - 1].stationPosition;
      const [px, , pz] = latestPlayerPosRef.current;
      return Math.hypot(px - stPos[0], pz - stPos[2]) <= 4.35;
    },
    [levelSpec.siteId, levelSpec.tasks, nearbyTarget]
  );

  const hasRequiredSuppliesForStage = useCallback(
    (stageNum: 1 | 2 | 3 | 4): boolean => {
      const reqId = levelSpec.tasks[stageNum - 1].requiresCollectedSupplyId;
      if (!reqId) return true;
      return effectiveCollectedSupplyIds.includes(reqId);
    },
    [effectiveCollectedSupplyIds, levelSpec.tasks]
  );

  const handleCollectCoin = useCallback((idx: number) => {
    setCollectedCoinIndices((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  // Physical 3D Interaction Handler (Sprout, Collectible Supply Crate, or 3D Task Station)
  const handleInteractTrigger = useCallback(
    async (target: ForestNearbyTarget) => {
      if (!target) return;

      if (target.kind === 'sprout') {
        setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.2 });
        setOverlay('sprout');
        return;
      }

      if (target.kind === 'supply_crate') {
        soundFX.playCoinCollect();
        setSessionSupplyCollected(true);
        setSproutMoodSignal({ nonce: Date.now(), mood: 'happy', durationSec: 3.2 });
        showTimedExplorationToast(
          `Picked up ${target.supplyLabel}! Carry them to the JVM Main Execution Chamber inside the workshop and press [E].`
        );
        await collectWorld1Supply(target.supplyId, latestPlayerPosRef.current);
        return;
      }

      if (target.kind === 'task_station') {
        // Switching to another unlocked site in the forest by physically walking up to it
        if (target.levelNumber !== currentLevelNum) {
          if (isCampaignLevelUnlocked(target.levelNumber)) {
            skipNextSpawnTeleportRef.current = true;
            setActiveCampaignLevel(target.levelNumber);
            showTimedExplorationToast(
              `Entered ${getWorld1LevelSpec(target.levelNumber).siteName}. Talk to Sprout or inspect Stage 1!`
            );
          } else {
            setSproutMoodSignal({ nonce: Date.now(), mood: 'encouraging', durationSec: 2.8 });
            showTimedExplorationToast(
              `Complete Level ${target.levelNumber - 1} first to unlock ${getWorld1LevelSpec(target.levelNumber).siteName}!`
            );
          }
          return;
        }

        const stageNum = target.taskNumber;
        const stationTask = levelSpec.tasks[stageNum - 1];

        // 1. Require Briefing, Java Concept & Worked Example before opening Stage 1..4
        if (!lessonReady) {
          setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.0 });
          setActiveStep(1);
          setOverlay('console');
          return;
        }

        // 2. Enforce sequential 3D stage order (cannot skip Stage 1 -> Stage 3)
        if (stageNum > currentActiveStageCount + 1) {
          const neededTask = levelSpec.tasks[currentActiveStageCount];
          setSproutMoodSignal({ nonce: Date.now(), mood: 'encouraging', durationSec: 2.8 });
          showTimedExplorationToast(
            `${target.stationLabel} unlocks after Stage ${currentActiveStageCount + 1}! Walk to ${neededTask.stationLabel} first.`
          );
          return;
        }

        // 3. Enforce physical supply crate collection gate (Level 2 Stage 4)
        if (
          stationTask.requiresCollectedSupplyId &&
          !effectiveCollectedSupplyIds.includes(stationTask.requiresCollectedSupplyId) &&
          currentActiveStageCount < stageNum
        ) {
          setSproutMoodSignal({ nonce: Date.now(), mood: 'encouraging', durationSec: 3.0 });
          showTimedExplorationToast(
            'You must physically pick up the Brass Compiler Gears & JVM Core Crates from the workshop pallet [E] before activating the JVM Main Execution Chamber!'
          );
          return;
        }

        // Valid station reached! Open the code editor specifically for THIS 3D objective!
        setExplorationToast(null);
        setSproutFeedbackTip(null);
        setActiveStep((3 + stageNum) as ConsoleStep);
        setOverlay('console');
      }
    },
    [
      collectWorld1Supply,
      currentActiveStageCount,
      currentLevelNum,
      effectiveCollectedSupplyIds,
      isCampaignLevelUnlocked,
      lessonReady,
      levelSpec.tasks,
      setActiveCampaignLevel,
      showTimedExplorationToast,
    ]
  );

  const handlePositionSample = useCallback(
    (pos: [number, number, number]) => {
      latestPlayerPosRef.current = pos;
      void saveWorld1Checkpoint(pos);
    },
    [saveWorld1Checkpoint]
  );

  const handleObjectiveDistanceSample = useCallback(
    (distMeters: number | null) => {
      setObjectiveDistMeters(distMeters);
    },
    []
  );

  // Step 3 -> Real 3D World Exploration for Construction Stage 1!
  const handleCompleteStep3Example = async () => {
    setLessonReadyLocal(true);
    await completeCampaignLesson(currentLevelNum);
    await completeCampaignGuidedPractice(currentLevelNum);

    if ((world1State.structureStages[levelSpec.siteId] || 0) >= 4 && isReplayBuildSession) {
      setSessionStageBuilt(0);
    }

    setActiveStep(4);
    setOverlay(null);
    setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.4 });
    showTimedExplorationToast(
      `Blueprint learned! Follow the golden beacon to ${levelSpec.tasks[0].stationLabel} and press [E].`
    );
  };

  // Start a clean 4-stage physical replay from Spawn
  const startPhysicalReplaySession = () => {
    setIsReplayBuildSession(true);
    setSessionStageBuilt(0);
    setSessionSupplyPurchased(false);
    setSessionSupplyCollected(false);
    setTaskCodes([
      levelSpec.tasks[0].starterCode,
      levelSpec.tasks[1].starterCode,
      levelSpec.tasks[2].starterCode,
      levelSpec.tasks[3].starterCode,
    ]);
    setActiveStep(4);
    setOverlay(null);
    latestPlayerPosRef.current = levelSpec.spawnPosition;
    setTeleportSignal({
      nonce: Date.now(),
      position: levelSpec.spawnPosition,
    });
    setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.2 });
    showTimedExplorationToast(
      `Replay started! Walk physically to ${levelSpec.tasks[0].stationLabel} and press [E].`
    );
  };

  // Finalize Level Completion (Step 8 Impact & World Reveal -> Step 9 Rewards)
  const triggerLevelCompletionRewards = useCallback(async () => {
    const score = Math.max(850, 1200 - elapsedSeconds * 2 + collectedCoinIndices.size * 25);
    const res = await completeWorld1Level({
      levelNumber: currentLevelNum,
      siteId: levelSpec.siteId,
      score,
      timeSeconds: elapsedSeconds,
      collectedCoinsCount: collectedCoinIndices.size,
      playerPos: latestPlayerPosRef.current,
    });
    setIsReplayBuildSession(false);
    setCompletionSummary({
      xpAwarded: res.xpAwarded,
      totalCoinsAwarded: res.totalCoinsAwarded,
      firstTime: res.firstTime,
      world1RestoredNow: res.world1RestoredNow,
      score,
      timeSeconds: elapsedSeconds,
    });
    setSproutMoodSignal({ nonce: Date.now(), mood: 'happy', durationSec: 4.0 });
    setActiveStep(9);
    setOverlay('console');
  }, [
    collectedCoinIndices.size,
    completeWorld1Level,
    currentLevelNum,
    elapsedSeconds,
    levelSpec.siteId,
  ]);

  // Compute bespoke 3D Cutaway Focus & Camera framing so every task's real 3D consequence is front-and-center!
  const getCutawayFramingForTask = (
    siteId: World1SiteId,
    stageNum: 1 | 2 | 3 | 4,
    stationPos: [number, number, number]
  ): {
    focusPosition: [number, number, number];
    cameraPosition: [number, number, number];
  } => {
    if (siteId === 'workshop') {
      if (stageNum === 1) {
        // Creek Timber Bridge spanning Workshop Creek
        return {
          focusPosition: [-12.0, 0.35, 28.4],
          cameraPosition: [-17.4, 5.2, 34.4],
        };
      }
      if (stageNum === 2) {
        // Workshop Double-Doors physically swinging open
        return {
          focusPosition: [-6.0, 1.1, 29.6],
          cameraPosition: [-6.0, 4.7, 36.2],
        };
      }
      if (stageNum === 3) {
        // Glowing Brass Gears & JVM Core Crates spawning on interior pallet
        return {
          focusPosition: [-7.5, 0.65, 26.8],
          cameraPosition: [-3.1, 4.3, 29.4],
        };
      }
      return {
        focusPosition: [-6.0, 1.4, 26.0],
        cameraPosition: [2.8, 7.2, 34.2],
      };
    }

    if (stageNum < 4) {
      return {
        focusPosition: [
          (levelSpec.sitePosition[0] + stationPos[0]) * 0.5,
          Math.max(levelSpec.sitePosition[1], stationPos[1]),
          (levelSpec.sitePosition[2] + stationPos[2]) * 0.5,
        ],
        cameraPosition: levelSpec.cameraLandmarkOffset,
      };
    }

    return {
      focusPosition: levelSpec.sitePosition,
      cameraPosition: levelSpec.cameraLandmarkOffset,
    };
  };

  // Steps 4..7: Solve one of the 4 Java Construction Tasks!
  const handleConstructionTaskPassed = async (taskIndex: 0 | 1 | 2 | 3) => {
    const task = levelSpec.tasks[taskIndex];
    const stageNum = task.taskNumber; // 1..4
    setSproutFeedbackTip(null);
    setExplorationToast(null);

    soundFX.playConstructionStage(stageNum);
    setSessionStageBuilt((prev) => Math.max(prev, stageNum));
    if (task.spawnsCollectibleSupplyId) {
      setSessionSupplyPurchased(true);
    }

    const cleanName = (scannerExplorerName || 'Explorer').trim().slice(0, 28) || 'Explorer';
    const parsedCrystals = Math.max(0, Math.min(9999, parseInt(scannerCrystalInput, 10) || 25));

    if (task.allowsCustomScannerInput) {
      void updateWorld1ScannerRegistration(cleanName, parsedCrystals);
    }

    const framing = getCutawayFramingForTask(
      levelSpec.siteId,
      stageNum,
      task.stationPosition
    );

    setConstructionSignal({
      nonce: Date.now(),
      siteId: levelSpec.siteId,
      stageNumber: stageNum,
      focusPosition: framing.focusPosition,
      cameraPosition: framing.cameraPosition,
    });

    const nextStep: ConsoleStep = stageNum < 4 ? ((4 + stageNum) as ConsoleStep) : 8;
    const nextStationLabel =
      taskIndex < 3 ? levelSpec.tasks[(taskIndex + 1) as 1 | 2 | 3].stationLabel : null;

    // Close modal so player watches the real 3D consequence & physically walks to the next objective!
    setOverlay(null);
    setBuildingBanner({
      stageNumber: stageNum,
      stageLabel: task.constructionStageLabel,
      nextStationLabel,
      spawnedSupplyLabel:
        task.spawnsCollectibleSupplyId === 'workshop_supplies'
          ? task.supplyLabel || 'Brass Compiler Gears & JVM Core Crates'
          : undefined,
      readyToAdvance: false,
    });

    await recordWorld1TaskSolved({
      levelNumber: currentLevelNum,
      siteId: levelSpec.siteId,
      taskId: task.id,
      newStage: stageNum,
      xpBonus: task.xpBonus,
      coinBonus: task.coinBonus,
      playerPos: latestPlayerPosRef.current,
      scannerRegistration: task.allowsCustomScannerInput
        ? { name: cleanName, crystals: parsedCrystals }
        : undefined,
      purchasedSupplyId: task.spawnsCollectibleSupplyId,
    });

    window.setTimeout(() => {
      setBuildingBanner((prev) =>
        prev && prev.stageNumber === stageNum ? { ...prev, readyToAdvance: true } : prev
      );
      setActiveStep(nextStep);
    }, 3200);
  };

  const handleCodeMistake = useCallback((message: string) => {
    setReactionSignal({ nonce: Date.now(), kind: 'mistake' });
    setSproutFeedbackTip(message);
  }, []);

  const launchCinematicForestTour = () => {
    soundFX.playWorldRestorationFanfare();
    setOverlay(null);
    setBuildingBanner(null);
    setTourLandmarkLevel(1);
    setTourActive(true);
  };

  const handleTourFinished = useCallback(() => {
    setTourActive(false);
    void markWorld1CinematicTourDone();
    setOverlay('finale');
  }, [markWorld1CinematicTourDone]);

  // Build dynamic validation spec for Scanner custom inputs when applicable
  const getDynamicTaskValidation = (taskIndex: 0 | 1 | 2 | 3): CodeValidationSpec => {
    const task = levelSpec.tasks[taskIndex];
    if (!task.allowsCustomScannerInput) {
      return task.validation;
    }
    const cleanName = (scannerExplorerName || 'Explorer').trim().slice(0, 28) || 'Explorer';
    const parsedCrystals = Math.max(0, Math.min(9999, parseInt(scannerCrystalInput, 10) || 25));

    if (levelSpec.levelNumber === 9) {
      return {
        ...task.validation,
        simulatedStdin: [cleanName, String(parsedCrystals)],
        expectedOutputLines: [
          `Builder: ${cleanName}`,
          `Crystals: ${parsedCrystals}`,
        ],
      };
    }
    // Level 10 Task 4 custom builder tribute
    return {
      ...task.validation,
      simulatedStdin: [cleanName],
      expectedOutputLines: [`Forest Restored by ${cleanName}`, 'Welcome Home to CODELAND'],
    };
  };

  // Contextual Sprout 3D Dialogue Bubble Copy
  const sproutLiveGuidance = useMemo(() => {
    if (!lessonReady) {
      return {
        kicker: `Sprout · Meet at ${levelSpec.siteName}`,
        quote: levelSpec.sproutDialogue[0],
        objectiveText:
          'Walk up to Sprout in 3D and press [E] (or click Sprout) to start your Briefing & Java Concept.',
      };
    }
    if (needsWorkshopSupplyPickup) {
      return {
        kicker: 'Sprout · Physical Supply Pickup Required',
        quote:
          'Your material order spawned on the wooden pallet inside the workshop! Walk over to the glowing Brass Compiler Gears & JVM Core Crates and press [E] or click them to pick them up.',
        objectiveText: 'Pick up Workshop Supplies Crate on interior pallet [E]',
      };
    }
    if (currentActiveStageCount < 4) {
      const nextTask = levelSpec.tasks[currentActiveStageCount];
      return {
        kicker: `Sprout · Stage ${nextTask.taskNumber}/4 · ${nextTask.stationLabel}`,
        quote: nextTask.sproutDialogueBubble,
        objectiveText: `Walk to ${nextTask.stationLabel}${
          objectiveDistMeters !== null ? ` (${objectiveDistMeters}m)` : ''
        } & press [E]`,
      };
    }
    return {
      kicker: `Sprout · ${levelSpec.structureTitle} Complete`,
      quote: levelSpec.completionCelebration,
      objectiveText:
        world1State.completedLevels.includes(currentLevelNum) || completionSummary
          ? 'Explore freely or travel to the next forest site!'
          : 'Open Impact & World Reveal to inspect your restored landmark and claim rewards!',
    };
  }, [
    completionSummary,
    currentActiveStageCount,
    currentLevelNum,
    lessonReady,
    levelSpec,
    needsWorkshopSupplyPickup,
    objectiveDistMeters,
    world1State.completedLevels,
  ]);

  if (!profile) return null;

  const activeTaskIndex: 0 | 1 | 2 | 3 | null =
    activeStep >= 4 && activeStep <= 7 ? ((activeStep - 4) as 0 | 1 | 2 | 3) : null;

  // Stepper unlock discipline:
  // Unsolved Construction Stages (Steps 4..7) require physical presence at that station + required supplies!
  const isStepUnlocked = (step: ConsoleStep): boolean => {
    if (step <= 3) return true;
    if (step >= 4 && step <= 7) {
      if (!lessonReady) return false;
      const stageNum = (step - 3) as 1 | 2 | 3 | 4;
      // Already completed stages can be reviewed anytime
      if (currentActiveStageCount >= stageNum) return true;
      // Only the immediate next stage can be opened, and ONLY when physically at its 3D station with supplies!
      if (stageNum === currentActiveStageCount + 1) {
        return (
          isPlayerPhysicallyAtTaskStation(stageNum) &&
          hasRequiredSuppliesForStage(stageNum)
        );
      }
      return false;
    }
    if (step === 8 || step === 9) {
      return (
        currentActiveStageCount >= 4 ||
        (world1State.structureStages[levelSpec.siteId] || 0) >= 4
      );
    }
    return false;
  };

  // Primary Bottom Dock Action Handler (respects physical exploration!)
  const handleDockPrimaryAction = () => {
    if (!lessonReady) {
      setActiveStep(1);
      setOverlay('console');
      return;
    }

    if (currentActiveStageCount < 4) {
      const nextStageNum = (currentActiveStageCount + 1) as 1 | 2 | 3 | 4;
      const nextTask = levelSpec.tasks[nextStageNum - 1];

      if (needsWorkshopSupplyPickup) {
        if (nearbyTarget?.kind === 'supply_crate') {
          void handleInteractTrigger(nearbyTarget);
        } else {
          setActiveStep(3);
          setOverlay('console');
        }
        return;
      }

      if (
        isPlayerPhysicallyAtTaskStation(nextStageNum) &&
        hasRequiredSuppliesForStage(nextStageNum)
      ) {
        setActiveStep((3 + nextStageNum) as ConsoleStep);
        setOverlay('console');
      } else {
        // Open Worked Example reference rather than skipping physical travel to the station!
        setActiveStep(3);
        setOverlay('console');
        showTimedExplorationToast(
          `Walk physically to ${nextTask.stationLabel} in the 3D forest to unlock Stage ${nextStageNum} coding!`
        );
      }
      return;
    }

    // All 4 stages built -> Impact & World Reveal (Step 8) or Rewards (Step 9)
    setActiveStep(8);
    setOverlay('console');
  };

  const nextUnsolvedStageNum =
    currentActiveStageCount < 4
      ? ((currentActiveStageCount + 1) as 1 | 2 | 3 | 4)
      : null;
  const playerAtNextUnsolvedStation =
    nextUnsolvedStageNum !== null &&
    isPlayerPhysicallyAtTaskStation(nextUnsolvedStageNum) &&
    hasRequiredSuppliesForStage(nextUnsolvedStageNum);

  return (
    <div className="relative w-full h-[calc(100vh-56px)] overflow-hidden bg-[#0E1B14] text-white">
      {/* 100% Full-Viewport Persistent 3D Beginner's Forest Canvas */}
      <BeginnerForestCanvas
        activeLevelNumber={currentLevelNum}
        activeTaskNumber={activeTaskNumberFor3D}
        lessonReady={lessonReady}
        avatarId={profile.avatarId}
        graphicsQuality={profile.graphicsQuality}
        visualStages={visualStages}
        purchasedSupplyIds={effectivePurchasedSupplyIds}
        collectedSupplyIds={effectiveCollectedSupplyIds}
        carryingSupply={carryingWorkshopSupply}
        equippedForestOutfit={world1State.equippedForestOutfit}
        equippedCompanionAccessory={world1State.equippedCompanionAccessory}
        registeredVillagerName={scannerExplorerName || world1State.registeredVillagerName}
        registeredCrystalCount={
          parseInt(scannerCrystalInput, 10) || world1State.registeredCrystalCount
        }
        freeRoamUnlocked={world1State.freeRoamUnlocked || allTenRestored}
        isModalBlockingMovement={Boolean(overlay)}
        constructionSignal={constructionSignal}
        reactionSignal={reactionSignal}
        sproutMoodSignal={sproutMoodSignal}
        teleportSignal={teleportSignal}
        tourActive={tourActive}
        onTourLandmarkChange={(lvl) => setTourLandmarkLevel(lvl)}
        onTourComplete={handleTourFinished}
        collectedCoinIndices={collectedCoinIndices}
        onCollectCoin={handleCollectCoin}
        onNearbyChange={setNearbyTarget}
        onInteractTrigger={(t) => void handleInteractTrigger(t)}
        onDistantClickHint={showTimedExplorationToast}
        onObjectiveDistanceSample={handleObjectiveDistanceSample}
        onPlayerPositionSample={handlePositionSample}
        mobileControlsRef={mobileControlsRef}
      />

      {/* =====================================================================
          TOP PERIMETER GAME HUD BAR (Zero backdrop-blur over WebGL)
          ===================================================================== */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Identity & Active Site Strip */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0F1F18]/95 border border-emerald-800/80 shadow-md">
          <button
            type="button"
            onClick={() => setSection(AppSection.WORLDS)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Worlds</span>
          </button>

          <span className="text-emerald-800" aria-hidden="true">
            |
          </span>

          <AvatarImage avatarId={profile.avatarId} sizeClass="w-7 h-7" />
          <div className="min-w-0">
            <div className="text-xs font-bold leading-tight truncate max-w-[180px] sm:max-w-[260px]">
              Lv.{String(currentLevelNum).padStart(2, '0')}/10 · {levelSpec.siteName}
            </div>
            <div className="text-[11px] text-emerald-300/85 truncate max-w-[180px] sm:max-w-[260px]">
              @{profile.username} · {levelSpec.javaTopic}
            </div>
          </div>
        </div>

        {/* Right Telemetry & Utility Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {carryingWorkshopSupply && (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A3B2B]/95 border border-[#4EF5A8]/70 text-xs font-semibold text-[#4EF5A8] whitespace-nowrap shrink-0">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Carrying Workshop Supplies</span>
            </div>
          )}

          {/* XP, Coins, Daily Streak & Forest Progress */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#0F1F18]/95 border border-emerald-800/80 text-xs font-mono tabular-nums">
            <span className="text-emerald-300 font-semibold">{profile.totalXp} XP</span>
            <span aria-hidden="true" className="text-emerald-800">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-[#F5C451] font-semibold">
              <Coins className="w-3.5 h-3.5" />
              {profile.coins + collectedCoinIndices.size * 5}
            </span>
            <span aria-hidden="true" className="text-emerald-800">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-[#F28C45] font-semibold">
              <Flame className="w-3.5 h-3.5" />
              {effectiveStreak}d
            </span>
            <span aria-hidden="true" className="text-emerald-800">
              ·
            </span>
            <span className="text-sky-300">{totalStagesRestored}/40 Built</span>
          </div>

          <button
            type="button"
            onClick={() => setOverlay('map')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#142920]/95 hover:bg-[#1C382C] border border-emerald-800/80 text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5 text-[#F5C451]" />
            <span>Forest Map</span>
          </button>

          <button
            type="button"
            onClick={() => setOverlay('inventory')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#142920]/95 hover:bg-[#1C382C] border border-emerald-800/80 text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Backpack className="w-3.5 h-3.5 text-[#69B9E7]" />
            <span>Inventory</span>
          </button>

          {allTenRestored && (
            <button
              type="button"
              onClick={launchCinematicForestTour}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1D2620] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Forest Tour</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              void saveSettings({
                graphicsQuality: profile.graphicsQuality,
                soundMuted: !profile.soundMuted,
                theme: profile.theme,
              })
            }
            aria-label={profile.soundMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-xl bg-[#142920]/95 hover:bg-[#1C382C] border border-emerald-800/80 text-emerald-100 cursor-pointer"
          >
            {profile.soundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-300" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setOverlay('pause')}
            aria-label="Pause game"
            className="p-2 rounded-xl bg-[#142920]/95 hover:bg-[#1C382C] border border-emerald-800/80 text-emerald-100 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          EXPLORATION TOAST (Distant Click / Supply Gate / Out-of-Order Hint)
          ===================================================================== */}
      {explorationToast && !overlay && !tourActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[min(620px,94vw)] px-4 py-2.5 rounded-xl bg-[#13291F]/95 border border-[#F5C451]/75 shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-100 min-w-0">
            <Compass className="w-4 h-4 text-[#F5C451] shrink-0" />
            <span className="leading-snug">{explorationToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setExplorationToast(null)}
            className="text-xs text-emerald-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          CINEMATIC TOUR BANNER (When flying across all 10 restored landmarks)
          ===================================================================== */}
      {tourActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(680px,94vw)] px-5 py-4 rounded-2xl bg-[#0F1F18]/95 border border-[#F5C451]/70 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono tabular-nums text-[#F5C451]">
              World 1 Restoration Tour · Landmark {tourLandmarkLevel}/10
            </div>
            <div className="text-base font-extrabold">
              {getWorld1LevelSpec(tourLandmarkLevel).siteName} —{' '}
              {getWorld1LevelSpec(tourLandmarkLevel).structureTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTourFinished}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Finish Tour
          </button>
        </div>
      )}

      {/* =====================================================================
          LIVE 3D CONSTRUCTION BANNER (Real 3D Consequence + Physical Next Step!)
          ===================================================================== */}
      {buildingBanner && !overlay && !tourActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[min(660px,94vw)] px-5 py-3.5 rounded-2xl bg-[#10241B]/95 border border-[#F5C451]/80 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Hammer className="w-5 h-5 text-[#F5C451] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono tabular-nums text-[#F5C451]">
                Construction Crew Deployed · {buildingBanner.stageLabel}
              </div>
              <div className="text-sm font-bold truncate">
                {buildingBanner.readyToAdvance
                  ? buildingBanner.stageNumber === 4
                    ? `${levelSpec.structureTitle} stands 100% restored in 3D!`
                    : buildingBanner.spawnedSupplyLabel
                    ? `${buildingBanner.spawnedSupplyLabel} spawned on the workshop pallet!`
                    : `Stage ${buildingBanner.stageNumber}/4 assembled! Next: walk to ${buildingBanner.nextStationLabel}`
                  : 'Flying Builder Bots & Workers are assembling your Java code in 3D...'}
              </div>
            </div>
          </div>

          {buildingBanner.readyToAdvance && (
            <button
              type="button"
              onClick={() => {
                const isFinalStage = buildingBanner.stageNumber === 4;
                const spawnedSupply = buildingBanner.spawnedSupplyLabel;
                const nextStation = buildingBanner.nextStationLabel;
                setBuildingBanner(null);
                if (isFinalStage) {
                  setActiveStep(8);
                  setOverlay('console');
                } else if (spawnedSupply) {
                  showTimedExplorationToast(
                    `Walk over to the glowing ${spawnedSupply} on the pallet and press [E] to collect them!`
                  );
                } else if (nextStation) {
                  showTimedExplorationToast(
                    `Follow Sprout and the golden beacon to ${nextStation} and press [E]!`
                  );
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1B241E] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {buildingBanner.stageNumber === 4
                ? 'Impact & World Reveal →'
                : buildingBanner.spawnedSupplyLabel
                ? 'Walk to Supply Pallet [E] →'
                : `Walk to Stage ${buildingBanner.stageNumber + 1} Station →`}
            </button>
          )}
        </div>
      )}

      {/* =====================================================================
          UNIFIED COLLAPSIBLE BOTTOM DOCK + SPROUT LIVE DIALOGUE BUBBLE
          ===================================================================== */}
      {!tourActive && (
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[min(940px,95vw)] space-y-2 transition-transform duration-200 ${
            hudCollapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
          }`}
        >
          {/* Nearby Interactive 3D Target Prompt Button */}
          {nearbyTarget && !overlay && !buildingBanner && !hudCollapsed && (
            <div className="flex justify-center pointer-events-auto">
              <button
                type="button"
                onClick={() => void handleInteractTrigger(nearbyTarget)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1B241E] shadow-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {nearbyTarget.label}
              </button>
            </div>
          )}

          {/* Sprout Live Contextual 3D Dialogue Bubble */}
          {!overlay && !buildingBanner && !hudCollapsed && !sproutBubbleHidden && (
            <div className="px-4 py-2.5 rounded-2xl bg-[#12271D]/95 border border-emerald-700/80 shadow-lg flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <AvatarImage avatarId="character-g" sizeClass="w-9 h-9 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-[#4EF5A8]">
                    <span>{sproutLiveGuidance.kicker}</span>
                    {objectiveDistMeters !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#F5C451]">{objectiveDistMeters}m to target</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-emerald-50/95 leading-snug">
                    &ldquo;{sproutLiveGuidance.quote}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.0 });
                    setOverlay('sprout');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#1B3A2B] hover:bg-[#234B38] text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Ask Sprout
                </button>
                <button
                  type="button"
                  onClick={() => setSproutBubbleHidden(true)}
                  aria-label="Minimize Sprout bubble"
                  className="p-1 rounded-lg text-emerald-300/80 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Collapse / Expand Tab */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setHudCollapsed((c) => !c)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-xl bg-[#0F1F18]/95 border border-b-0 border-emerald-800/80 text-[11px] font-mono text-emerald-200 hover:text-white whitespace-nowrap cursor-pointer"
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Controls [H]</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide Controls [H]</span>
                </>
              )}
            </button>
          </div>

          {/* Main Dock Body */}
          <div className="px-4 py-3 rounded-2xl bg-[#0F1F18]/95 border border-emerald-800/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Mission Objective + 4-Segment Construction Progress Bar */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#F5C451] whitespace-nowrap">
                  {levelSpec.structureTitle}
                </span>
                <span aria-hidden="true" className="text-emerald-700">
                  ·
                </span>
                <span className="text-emerald-100/90 truncate">
                  {sproutLiveGuidance.objectiveText}
                </span>
              </div>

              {/* 4-Stage Segmented Bar */}
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-xs">
                  {[1, 2, 3, 4].map((st) => {
                    const filled = currentActiveStageCount >= st;
                    return (
                      <div
                        key={st}
                        className={`h-2 rounded-sm transition-colors ${
                          filled ? 'bg-[#4EF5A8]' : 'bg-[#1B3529]'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] font-mono tabular-nums text-emerald-300 whitespace-nowrap">
                  Stage {currentActiveStageCount}/4
                </span>
                <span className="hidden lg:inline text-[11px] text-emerald-400/75 font-mono whitespace-nowrap">
                  · WASD Move · E / Click 3D Object · Space Jump · Drag Orbit
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSproutBubbleHidden(false);
                  setSproutMoodSignal({ nonce: Date.now(), mood: 'talking', durationSec: 3.0 });
                  setOverlay('sprout');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1A3528] hover:bg-[#234736] border border-emerald-700/70 text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#4EF5A8]" />
                <span>Sprout Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTouchControls((t) => !t)}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1A3528] border border-emerald-700/70 text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Touch Pad</span>
              </button>

              <button
                type="button"
                onClick={handleDockPrimaryAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-[#2F7D46] hover:bg-[#389152] text-white shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>
                  {!lessonReady
                    ? 'Start Briefing & Concept'
                    : currentActiveStageCount < 4
                    ? playerAtNextUnsolvedStation
                      ? `Code Stage ${nextUnsolvedStageNum}/4 [E]`
                      : 'Review Java Blueprint'
                    : world1State.completedLevels.includes(currentLevelNum) || completionSummary
                    ? 'Impact & Replay'
                    : 'Impact & Claim Rewards'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch D-Pad Overlay */}
      {showTouchControls && !overlay && (
        <div className="absolute bottom-36 left-4 right-4 z-10 flex items-end justify-between pointer-events-none">
          <div className="pointer-events-auto grid grid-cols-3 gap-1.5 w-32">
            <div />
            <button
              type="button"
              onPointerDown={() => {
                mobileControlsRef.current.forward = true;
              }}
              onPointerUp={() => {
                mobileControlsRef.current.forward = false;
              }}
              onPointerLeave={() => {
                mobileControlsRef.current.forward = false;
              }}
              className="p-3 rounded-xl bg-[#0F1F18]/90 border border-emerald-700 flex justify-center"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                mobileControlsRef.current.left = true;
              }}
              onPointerUp={() => {
                mobileControlsRef.current.left = false;
              }}
              onPointerLeave={() => {
                mobileControlsRef.current.left = false;
              }}
              className="p-3 rounded-xl bg-[#0F1F18]/90 border border-emerald-700 flex justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => {
                mobileControlsRef.current.backward = true;
              }}
              onPointerUp={() => {
                mobileControlsRef.current.backward = false;
              }}
              onPointerLeave={() => {
                mobileControlsRef.current.backward = false;
              }}
              className="p-3 rounded-xl bg-[#0F1F18]/90 border border-emerald-700 flex justify-center"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => {
                mobileControlsRef.current.right = true;
              }}
              onPointerUp={() => {
                mobileControlsRef.current.right = false;
              }}
              onPointerLeave={() => {
                mobileControlsRef.current.right = false;
              }}
              className="p-3 rounded-xl bg-[#0F1F18]/90 border border-emerald-700 flex justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                mobileControlsRef.current.jumpRequested = true;
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1A3528] border border-emerald-700 whitespace-nowrap"
            >
              Jump
            </button>
            <button
              type="button"
              onClick={() => {
                if (nearbyTarget) {
                  mobileControlsRef.current.interactRequested = true;
                } else {
                  handleDockPrimaryAction();
                }
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] text-[#1B241E] whitespace-nowrap"
            >
              {nearbyTarget ? 'Interact [E]' : 'Blueprint'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: 9-STEP JAVA BUILDER & OBJECTIVE STATION CONSOLE
          ===================================================================== */}
      {overlay === 'console' && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-[#102119] border border-emerald-800/90 shadow-2xl flex flex-col overflow-hidden">
            {/* Console Header */}
            <div className="px-5 py-3.5 bg-[#0C1913] border-b border-emerald-900/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-mono tabular-nums text-[#F5C451]">
                  World 1 · Level {currentLevelNum}/10 · {levelSpec.siteName}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold truncate">
                  {levelSpec.structureTitle} — {levelSpec.javaTopic}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(world1State.structureStages[levelSpec.siteId] || 0) >= 4 &&
                  !isReplayBuildSession && (
                    <button
                      type="button"
                      onClick={startPhysicalReplaySession}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B382A] hover:bg-[#234937] text-emerald-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay 4-Stage Adventure</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => setOverlay(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1A3327] hover:bg-[#244535] text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Return to 3D World</span>
                </button>
              </div>
            </div>

            {/* 9-Step Progress Stepper Strip */}
            <div className="px-4 py-2 bg-[#0E1D16] border-b border-emerald-900/70 flex items-center gap-1 overflow-x-auto">
              {STEP_LABELS.map(({ step, shortLabel }) => {
                const unlocked = isStepUnlocked(step);
                const isCurrent = activeStep === step;
                const isCompleted =
                  (step <= 3 && lessonReady) ||
                  (step >= 4 && step <= 7 && currentActiveStageCount >= step - 3) ||
                  (step === 8 && currentActiveStageCount >= 4) ||
                  (step === 9 &&
                    (world1State.completedLevels.includes(currentLevelNum) ||
                      Boolean(completionSummary)));

                return (
                  <button
                    key={step}
                    type="button"
                    disabled={!unlocked}
                    title={
                      !unlocked && step >= 4 && step <= 7
                        ? `Walk physically to ${levelSpec.tasks[step - 4].stationLabel} in the 3D world to unlock!`
                        : shortLabel
                    }
                    onClick={() => unlocked && setActiveStep(step)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'bg-[#F5C451] text-[#1A241E] font-bold'
                        : isCompleted
                        ? 'bg-[#1D402E] text-emerald-200 hover:bg-[#25523B]'
                        : 'bg-[#142920] text-stone-300 hover:bg-[#1B362A]'
                    }`}
                  >
                    {isCompleted && !isCurrent ? `✓ ${shortLabel}` : shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Console Step Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* STEP 1: BRIEFING */}
              {activeStep === 1 && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-[#152B21] border border-emerald-800/70 flex flex-col sm:flex-row gap-4 items-start">
                    <AvatarImage avatarId="character-g" sizeClass="w-16 h-16 shrink-0" />
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-[#4EF5A8]">
                        Sprout — The Forest Guide · {levelSpec.zoneSubtitle}
                      </div>
                      <h3 className="text-xl font-extrabold">{levelSpec.briefingHeadline}</h3>
                      {levelSpec.sproutDialogue.map((paragraph, idx) => (
                        <p
                          key={idx}
                          className="text-sm text-emerald-50/90 leading-relaxed"
                        >
                          &ldquo;{paragraph}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {levelSpec.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-[#0D1B14] border border-emerald-900/70 space-y-1"
                      >
                        <div className="text-[11px] font-mono text-[#F5C451]">
                          Stage {t.taskNumber}/4 · {t.stationLabel}
                        </div>
                        <div className="text-xs font-bold">{t.title}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Step 2: Java Concept</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: JAVA CONCEPT */}
              {activeStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-[#4EF5A8]">
                      Step 2 of 9 · Java Concept
                    </div>
                    <h3 className="text-xl font-extrabold">{levelSpec.conceptHeadline}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {levelSpec.conceptExplanation.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/70 space-y-2"
                      >
                        <div className="text-xs font-mono font-bold text-[#F5C451]">
                          0{i + 1}. Key Rule
                        </div>
                        <p className="text-sm text-emerald-50/90 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#214233] text-emerald-100 whitespace-nowrap cursor-pointer"
                    >
                      ← Back to Briefing
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Step 3: Worked Example</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: WORKED EXAMPLE */}
              {activeStep === 3 && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-[#4EF5A8]">
                        Step 3 of 9 · Worked Example
                      </div>
                      <h3 className="text-xl font-extrabold">
                        Inspect &amp; Test the Reference Java Program
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const res = runJavaSimulator(levelSpec.workingExampleCode, [
                          'Codeland Village',
                        ]);
                        soundFX.playCodeSuccess();
                        setExampleOutputLines(res.outputLines);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1A241E] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Example Output</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 space-y-3">
                      <pre className="p-4 rounded-xl bg-[#0B1510] border border-emerald-900 font-mono text-xs sm:text-sm text-emerald-100 overflow-x-auto leading-relaxed">
                        {levelSpec.workingExampleCode}
                      </pre>

                      {exampleOutputLines && (
                        <div className="p-3.5 rounded-xl bg-[#0B1510] border border-[#4EF5A8]/50 font-mono text-xs space-y-1">
                          <div className="text-[#4EF5A8] font-bold">Console Output:</div>
                          {exampleOutputLines.map((ln, idx) => (
                            <div key={idx} className="text-white">
                              {ln}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 space-y-2.5">
                      <div className="text-xs font-semibold text-emerald-300">
                        Line-by-Line Explanation
                      </div>
                      {levelSpec.workingExampleNotes.map((note, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#152B21] border border-emerald-800/60 space-y-1"
                        >
                          <code className="block text-xs font-mono text-[#F5C451] break-all">
                            {note.line}
                          </code>
                          <p className="text-xs text-emerald-100/85">{note.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {lessonReady && currentActiveStageCount < 4 && (
                    <div className="p-3.5 rounded-xl bg-[#13291F] border border-emerald-800/70 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100">
                      <span>
                        Next 3D Objective:{' '}
                        <strong className="text-[#F5C451]">
                          {needsWorkshopSupplyPickup
                            ? 'Pick up Workshop Supplies Crate on the interior pallet [E]'
                            : `${levelSpec.tasks[currentActiveStageCount].stationLabel} (Stage ${
                                currentActiveStageCount + 1
                              }/4)`}
                        </strong>
                      </span>
                      {playerAtNextUnsolvedStation && nextUnsolvedStageNum && (
                        <button
                          type="button"
                          onClick={() => setActiveStep((3 + nextUnsolvedStageNum) as ConsoleStep)}
                          className="px-3 py-1.5 rounded-lg font-bold bg-[#F5C451] text-[#1A241E] whitespace-nowrap cursor-pointer"
                        >
                          Open Stage {nextUnsolvedStageNum} Station →
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#214233] text-emerald-100 whitespace-nowrap cursor-pointer"
                    >
                      ← Back to Java Concept
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCompleteStep3Example()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {lessonReady
                          ? 'Return to 3D World & Follow Beacon →'
                          : 'Enter 3D Construction Adventure →'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEPS 4..7: FOUR PHYSICAL 3D CONSTRUCTION STAGES */}
              {activeTaskIndex !== null && (
                <div className="space-y-4">
                  {(() => {
                    const task = levelSpec.tasks[activeTaskIndex];
                    const dynamicVal = getDynamicTaskValidation(activeTaskIndex);
                    const thisStageDone = currentActiveStageCount >= task.taskNumber;

                    return (
                      <>
                        <div className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/80 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-mono text-[#F5C451]">
                              {task.stationLabel} · {task.constructionStageLabel} · +
                              {task.xpBonus} XP · +{task.coinBonus} Coins
                            </div>
                            {thisStageDone && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4EF5A8]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Stage Built in 3D
                              </span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-extrabold">{task.title}</h3>
                          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                            <strong>Sprout:</strong> &ldquo;{task.sproutInstruction}&rdquo;
                          </p>
                          <div className="text-xs font-mono text-sky-300">
                            Objective: {task.objective}
                          </div>
                        </div>

                        {/* Interactive Scanner Input Box for Level 9 Task 4 & Level 10 Task 4 */}
                        {task.allowsCustomScannerInput && (
                          <div className="p-3.5 rounded-xl bg-[#0D1B14] border border-sky-700/60 flex flex-wrap items-center gap-4 text-xs">
                            <div className="font-bold text-sky-300">
                              Live System.in (Scanner) Test Input:
                            </div>
                            <label className="flex items-center gap-2">
                              <span className="text-emerald-200">Explorer Name:</span>
                              <input
                                type="text"
                                maxLength={24}
                                value={scannerExplorerName}
                                onChange={(e) => setScannerExplorerName(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#152B21] border border-emerald-700 font-mono text-white w-40"
                              />
                            </label>
                            {levelSpec.levelNumber === 9 && (
                              <label className="flex items-center gap-2">
                                <span className="text-emerald-200">Crystals:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={9999}
                                  value={scannerCrystalInput}
                                  onChange={(e) => setScannerCrystalInput(e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#152B21] border border-emerald-700 font-mono text-white w-24"
                                />
                              </label>
                            )}
                            <span className="text-[11px] text-emerald-300/80">
                              Updates Elder Rowan&apos;s 3D Registry Signboard in the forest!
                            </span>
                          </div>
                        )}

                        {sproutFeedbackTip && (
                          <div className="p-3 rounded-xl bg-[#2A1F14] border border-[#F28C45]/60 text-xs text-amber-100 flex items-center justify-between gap-2">
                            <span>
                              <strong>Sprout Tip:</strong> {sproutFeedbackTip}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSproutFeedbackTip(null)}
                              className="text-amber-300 hover:text-white whitespace-nowrap cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        <JavaCodeEditor
                          key={task.id}
                          code={taskCodes[activeTaskIndex]}
                          onChange={(next) =>
                            setTaskCodes((prev) => {
                              const copy = [...prev] as [string, string, string, string];
                              copy[activeTaskIndex] = next;
                              return copy;
                            })
                          }
                          starterCode={task.starterCode}
                          hints={task.hints}
                          validation={dynamicVal}
                          runButtonLabel={
                            dynamicVal.cliCommandSpec?.commandOnly
                              ? `Run JDK Command & Build Stage ${task.taskNumber}/4`
                              : `Execute & Build Stage ${task.taskNumber}/4`
                          }
                          minHeight={dynamicVal.cliCommandSpec?.commandOnly ? '170px' : '210px'}
                          onValidatedPass={() => void handleConstructionTaskPassed(activeTaskIndex)}
                          onEvaluationFail={(fb) => handleCodeMistake(fb.headline)}
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {/* STEP 8: IMPACT AND WORLD REVEAL */}
              {activeStep === 8 && (
                <div className="py-5 space-y-5">
                  <div className="text-center space-y-2 max-w-2xl mx-auto">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B3F2C] border border-[#4EF5A8]/60 text-[#4EF5A8]">
                      <Hammer className="w-7 h-7" />
                    </div>
                    <div className="text-xs font-mono text-[#4EF5A8]">
                      Step 8 of 9 · Impact and World Reveal
                    </div>
                    <h3 className="text-2xl font-extrabold">
                      {levelSpec.structureTitle} Stands Permanently Restored!
                    </h3>
                    <p className="text-sm text-emerald-100/90 leading-relaxed">
                      {levelSpec.completionCelebration}
                    </p>
                  </div>

                  {/* Summary of the 4 Real 3D World Changes Built by the Player */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {levelSpec.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-[#152B21] border border-emerald-800/70 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#4EF5A8] shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-[11px] font-mono text-[#F5C451]">
                            Stage {t.taskNumber} · {t.stationLabel}
                          </div>
                          <div className="text-xs font-bold">{t.constructionStageLabel}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setOverlay(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#224435] text-emerald-100 whitespace-nowrap cursor-pointer"
                    >
                      Walk &amp; Inspect in 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => void triggerLevelCompletionRewards()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1A241E] whitespace-nowrap cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Step 9: Claim Rewards →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 9: REWARDS */}
              {activeStep === 9 && (
                <div className="py-4 space-y-6">
                  <div className="p-6 rounded-2xl bg-[#152D22] border border-[#4EF5A8]/60 text-center space-y-3">
                    <div className="text-xs font-mono text-[#F5C451]">
                      Step 9 of 9 · Level {currentLevelNum} Rewards
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold">
                      {levelSpec.structureTitle} Permanently Saved!
                    </h3>
                    <p className="text-sm text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
                      {levelSpec.completionCelebration}
                    </p>

                    {completionSummary && (
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-sm font-mono tabular-nums">
                        <span className="px-3.5 py-1.5 rounded-lg bg-[#0E1E16] text-[#4EF5A8] font-bold">
                          +{completionSummary.xpAwarded} XP
                        </span>
                        <span className="px-3.5 py-1.5 rounded-lg bg-[#0E1E16] text-[#F5C451] font-bold">
                          +{completionSummary.totalCoinsAwarded} Byte Coins
                        </span>
                        <span className="px-3.5 py-1.5 rounded-lg bg-[#0E1E16] text-sky-300">
                          Score: {completionSummary.score}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOverlay(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#224435] text-emerald-100 whitespace-nowrap cursor-pointer"
                    >
                      Explore Forest Around Site
                    </button>

                    {currentLevelNum < 10 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOverlay(null);
                          setActiveCampaignLevel(currentLevelNum + 1);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap cursor-pointer"
                      >
                        <span>
                          Travel to Level {currentLevelNum + 1}:{' '}
                          {getWorld1LevelSpec(currentLevelNum + 1).siteName}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={launchCinematicForestTour}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1A241E] whitespace-nowrap cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Launch Grand Forest Tour (All 10 Sites)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorld('world-2', 11)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap cursor-pointer"
                        >
                          <span>Enter World 2: Variable Village →</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: SPROUT — INTERACTIVE 3D FOREST GUIDE DIALOGUE
          ===================================================================== */}
      {overlay === 'sprout' && (
        <div className="absolute inset-0 z-30 bg-black/65 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#102119] border border-emerald-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <AvatarImage avatarId="character-g" sizeClass="w-14 h-14" />
                <div>
                  <div className="text-xs font-mono text-[#4EF5A8]">Interactive 3D Guide</div>
                  <h3 className="text-lg font-extrabold">Sprout — The Forest Guide</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="p-1.5 rounded-lg bg-[#1A3327] text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/70 space-y-2.5 text-sm text-emerald-50/95 leading-relaxed">
              {currentLevelNum === 1 && !lessonReady && (
                <p className="text-emerald-200 font-medium">&ldquo;{SPROUT_INTRO_QUOTE}&rdquo;</p>
              )}
              <p>&ldquo;{sproutLiveGuidance.quote}&rdquo;</p>
              {lessonReady && currentActiveStageCount < 4 && (
                <div className="pt-1 border-t border-emerald-800/60 space-y-1 text-xs font-mono">
                  <div className="text-[#4EF5A8]">
                    Target Location: {sproutLiveGuidance.objectiveText}
                  </div>
                  <div className="text-[#F5C451]">
                    Java Hint: {levelSpec.tasks[currentActiveStageCount].hints[0]}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#224334] text-emerald-100 whitespace-nowrap cursor-pointer"
              >
                Follow Objective Beacon in 3D
              </button>

              {!lessonReady ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(1);
                    setOverlay('console');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap cursor-pointer"
                >
                  Start Briefing &amp; Java Concept →
                </button>
              ) : playerAtNextUnsolvedStation && nextUnsolvedStageNum ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep((3 + nextUnsolvedStageNum) as ConsoleStep);
                    setOverlay('console');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1A241E] whitespace-nowrap cursor-pointer"
                >
                  Open {levelSpec.tasks[nextUnsolvedStageNum - 1].stationLabel} →
                </button>
              ) : currentActiveStageCount >= 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(8);
                    setOverlay('console');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap cursor-pointer"
                >
                  Impact &amp; World Reveal →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(3);
                    setOverlay('console');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D402E] hover:bg-[#25523B] text-emerald-100 whitespace-nowrap cursor-pointer"
                >
                  Review Worked Example
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: INTERACTIVE 10-SITE BEGINNER'S FOREST MAP & FAST TRAVEL
          ===================================================================== */}
      {overlay === 'map' && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[88vh] rounded-2xl bg-[#102119] border border-emerald-800 p-6 flex flex-col gap-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono tabular-nums text-[#F5C451]">
                  Persistent Settlement Map · {totalStagesRestored}/40 Stages Restored
                </div>
                <h3 className="text-xl font-extrabold">
                  World 1 — The Beginner&apos;s Forest (10 Landmarks)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="p-2 rounded-lg bg-[#1A3327] text-emerald-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-emerald-100/80">
              Select any unlocked construction site to fast-travel across the forest. All built
              bridges, open doors, and restored structures remain permanently in your world!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
              {WORLD1_LEVELS.map((spec) => {
                const st = world1State.structureStages[spec.siteId] || 0;
                const unlocked = isCampaignLevelUnlocked(spec.levelNumber);
                const isHere = spec.levelNumber === currentLevelNum;

                return (
                  <div
                    key={spec.siteId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isHere
                        ? 'bg-[#1A3B2B] border-[#F5C451]'
                        : unlocked
                        ? 'bg-[#142920] border-emerald-800/70'
                        : 'bg-[#0D1A14] border-emerald-950 opacity-65'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                        <span className="text-[#F5C451] font-bold">
                          Lv.{String(spec.levelNumber).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={st >= 4 ? 'text-[#4EF5A8]' : 'text-emerald-200'}>
                          Stage {st}/4
                        </span>
                      </div>
                      <div className="text-sm font-bold truncate">{spec.siteName}</div>
                      <div className="text-[11px] text-emerald-300/80 truncate">
                        {spec.javaTopic}
                      </div>
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCampaignLevel(spec.levelNumber);
                          latestPlayerPosRef.current = spec.spawnPosition;
                          setTeleportSignal({
                            nonce: Date.now(),
                            position: spec.spawnPosition,
                          });
                          setOverlay(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{isHere ? 'Respawn' : 'Travel'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-stone-400 whitespace-nowrap shrink-0">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bonus Crystal Grotto Fast-Spot */}
            <div className="pt-1 border-t border-emerald-900/70 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
              <span>
                Hidden Discovery: <strong>Crystal Grotto &amp; Silverstream Waterfall</strong>{' '}
                (Southwest Riverbank · {collectedCoinIndices.size}/{WORLD1_COIN_SPOTS.length} Forest
                Coins Collected)
              </span>
              <button
                type="button"
                onClick={() => {
                  latestPlayerPosRef.current = [-33.5, 0, 14.5];
                  setTeleportSignal({
                    nonce: Date.now(),
                    position: [-33.5, 0, 14.5],
                  });
                  setOverlay(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1A3528] hover:bg-[#234736] text-[#4EF5A8] font-semibold whitespace-nowrap cursor-pointer"
              >
                Visit Crystal Grotto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: BUILDER INVENTORY, WORKSHOP SUPPLIES, BLUEPRINTS & COSMETICS
          ===================================================================== */}
      {overlay === 'inventory' && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#102119] border border-emerald-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#69B9E7]">Explorer Pack &amp; Wardrobe</div>
                <h3 className="text-xl font-extrabold">
                  Builder Materials, Gear &amp; Cosmetics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="p-2 rounded-lg bg-[#1A3327] text-emerald-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Physical Construction Supplies Status */}
            <div className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/70 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-mono text-[#F5C451]">
                  Level 2 Workshop Construction Materials
                </div>
                <div className="text-sm font-bold">
                  Brass Compiler Gears &amp; JVM Core Crystal Crates
                </div>
                <p className="text-xs text-emerald-100/80">
                  Ordered at the Supply Merchant Counter and physically carried to the JVM Main
                  Execution Chamber.
                </p>
              </div>
              <span
                className={`text-xs font-mono font-bold whitespace-nowrap shrink-0 ${
                  (visualStages.workshop || 0) >= 4
                    ? 'text-[#4EF5A8]'
                    : effectiveCollectedSupplyIds.includes('workshop_supplies')
                    ? 'text-[#F5C451]'
                    : effectivePurchasedSupplyIds.includes('workshop_supplies')
                    ? 'text-sky-300'
                    : 'text-stone-400'
                }`}
              >
                {(visualStages.workshop || 0) >= 4
                  ? 'Installed in JVM ✓'
                  : effectiveCollectedSupplyIds.includes('workshop_supplies')
                  ? 'Carrying in Pack ✓'
                  : effectivePurchasedSupplyIds.includes('workshop_supplies')
                  ? 'Ready on Pallet [E]'
                  : 'Not Ordered Yet'}
              </span>
            </div>

            {/* Cosmetics Wardrobe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/70 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#F5C451]">Avatar Outfit</div>
                  <div className="text-sm font-bold">Forest Builder Cloak &amp; Ranger Hat</div>
                  <p className="text-xs text-emerald-100/80">
                    Emerald builder cloak with golden plume unlocked upon restoring all 10 forest
                    sites.
                  </p>
                </div>
                {world1State.unlockedForestOutfit ? (
                  <button
                    type="button"
                    onClick={() =>
                      void toggleWorld1Cosmetics({
                        equippedForestOutfit: !world1State.equippedForestOutfit,
                      })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      world1State.equippedForestOutfit
                        ? 'bg-[#F5C451] text-[#1A241E]'
                        : 'bg-[#2F7D46] text-white'
                    }`}
                  >
                    {world1State.equippedForestOutfit
                      ? 'Equipped ✓ (Click to Remove)'
                      : 'Equip Outfit'}
                  </button>
                ) : (
                  <div className="text-xs font-mono text-stone-400">
                    Unlock by completing Level 10 ({totalStagesRestored}/40 stages)
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#152B21] border border-emerald-800/70 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#69B9E7]">Companion Accessory</div>
                  <div className="text-sm font-bold">Golden Sprout Halo &amp; Crystal Wings</div>
                  <p className="text-xs text-emerald-100/80">
                    Radiant golden halo and crystal wing trim for your floating companion sprite.
                  </p>
                </div>
                {world1State.unlockedCompanionAccessory ? (
                  <button
                    type="button"
                    onClick={() =>
                      void toggleWorld1Cosmetics({
                        equippedCompanionAccessory: !world1State.equippedCompanionAccessory,
                      })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      world1State.equippedCompanionAccessory
                        ? 'bg-[#F5C451] text-[#1A241E]'
                        : 'bg-[#2F7D46] text-white'
                    }`}
                  >
                    {world1State.equippedCompanionAccessory
                      ? 'Equipped ✓ (Click to Remove)'
                      : 'Equip Accessory'}
                  </button>
                ) : (
                  <div className="text-xs font-mono text-stone-400">
                    Unlock by completing Level 10 ({totalStagesRestored}/40 stages)
                  </div>
                )}
              </div>
            </div>

            {/* Blueprints Stamp Grid */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-emerald-200">
                Collected Architectural Blueprints ({world1State.completedLevels.length}/10)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {WORLD1_LEVELS.map((l) => {
                  const built = (world1State.structureStages[l.siteId] || 0) >= 4;
                  return (
                    <div
                      key={l.siteId}
                      className={`p-2.5 rounded-xl border text-center space-y-1 ${
                        built
                          ? 'bg-[#173627] border-[#4EF5A8]/50 text-white'
                          : 'bg-[#0D1A14] border-emerald-950 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono">BP-0{l.levelNumber}</div>
                      <div className="text-[11px] font-bold truncate">{l.structureTitle}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: PAUSE & QUALITY MENU
          ===================================================================== */}
      {overlay === 'pause' && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#102119] border border-emerald-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold">Game Paused</h3>
            <p className="text-xs text-emerald-100/80">
              Your Beginner&apos;s Forest settlement progress ({totalStagesRestored}/40 stages) is
              automatically saved.
            </p>

            <div className="p-3.5 rounded-xl bg-[#152B21] border border-emerald-800/70 flex items-center justify-between text-xs">
              <span>3D Render Quality</span>
              <div className="flex items-center gap-1">
                {(['high', 'low'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() =>
                      void saveSettings({
                        graphicsQuality: q,
                        soundMuted: profile.soundMuted,
                        theme: profile.theme,
                      })
                    }
                    className={`px-3 py-1 rounded-lg font-bold capitalize cursor-pointer ${
                      profile.graphicsQuality === q
                        ? 'bg-[#F5C451] text-[#1A241E]'
                        : 'bg-[#0E1D16] text-emerald-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
              >
                Resume Exploration
              </button>
              <button
                type="button"
                onClick={() => {
                  latestPlayerPosRef.current = levelSpec.spawnPosition;
                  setTeleportSignal({
                    nonce: Date.now(),
                    position: levelSpec.spawnPosition,
                  });
                  setOverlay(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#224435] text-emerald-100 cursor-pointer"
              >
                Respawn at {levelSpec.siteName}
              </button>
              <button
                type="button"
                onClick={() => setSection(AppSection.DASHBOARD)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#183126] hover:bg-[#224435] text-emerald-100 cursor-pointer"
              >
                Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: WORLD 1 COMPLETION CELEBRATION & FREE-ROAM UNLOCK
          ===================================================================== */}
      {overlay === 'finale' && (
        <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#102119] border border-[#F5C451] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="flex justify-center gap-3">
              <BadgeIcon kind="sprout" accentHex="#2F7D46" size={52} />
              <BadgeIcon kind="crown" accentHex="#F5C451" size={52} />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#F5C451]">
                World 1 Restored · 40/40 Stages Complete
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-balance">
                Congratulations, Master Builder of The Beginner&apos;s Forest!
              </h2>
              <p className="text-sm text-emerald-100/90 max-w-xl mx-auto leading-relaxed">
                Every beacon, compiler workshop, gatehouse, bridge, cliff staircase, lantern tower,
                ranger station, watermill, registration hall, and village monument now thrives
                because of the Java programs you wrote!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#152B21] border border-emerald-800/70 space-y-1">
                <div className="font-mono text-[#F5C451]">Badges Unlocked</div>
                <div className="font-bold">Forest Builder &amp; Forest Explorer</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#152B21] border border-emerald-800/70 space-y-1">
                <div className="font-mono text-[#4EF5A8]">Cosmetics Equipped</div>
                <div className="font-bold">Builder Cloak &amp; Companion Halo</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#152B21] border border-emerald-800/70 space-y-1">
                <div className="font-mono text-[#69B9E7]">Next Realm Unlocked</div>
                <div className="font-bold">World 2: Variable Village (Lv.11)</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#183126] hover:bg-[#224435] text-emerald-100 whitespace-nowrap cursor-pointer"
              >
                Free-Roam Exploration Mode
              </button>
              <button
                type="button"
                onClick={launchCinematicForestTour}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1D402E] hover:bg-[#27543D] text-[#F5C451] whitespace-nowrap cursor-pointer"
              >
                Replay Tour
              </button>
              <button
                type="button"
                onClick={() => openWorld('world-2', 11)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#1A241E] whitespace-nowrap cursor-pointer"
              >
                <span>Continue to World 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
