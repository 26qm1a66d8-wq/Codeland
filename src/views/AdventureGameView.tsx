import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  ArrowUp,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Cpu,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Terminal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppSection, GraphicsQuality } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import {
  buildWorldSpecForCampaignLevel,
  getCampaignLevel,
} from '../data/campaign100';
import {
  MobileControlState,
  NearbyInteractable,
  VoxelAdventureCanvas,
} from '../game/VoxelAdventureCanvas';
import { AvatarImage, VoxelBrandMark } from '../components/BadgeIcon';
import { JavaCodeEditor } from '../components/JavaCodeEditor';
import { World1ForestGameView } from './World1ForestGameView';

type ActiveModalKind = 'intro' | 'npc' | 'obstacle-1' | 'obstacle-2' | 'pause' | 'victory' | null;

export const AdventureGameView: React.FC = () => {
  const { activeCampaignLevel } = usePlayer();
  const campaignLevel = getCampaignLevel(activeCampaignLevel);
  if (campaignLevel.worldNumber === 1) {
    return <World1ForestGameView />;
  }
  return <LegacyAdventureGameView />;
};

const LegacyAdventureGameView: React.FC = () => {
  const {
    profile,
    activeCampaignLevel,
    setSection,
    getCampaignLevelProgress,
    openCampaignLevel,
    completeCampaignMission3D,
    saveSettings,
    setCertificateOpen,
  } = usePlayer();

  const campaignLevel = useMemo(
    () => getCampaignLevel(activeCampaignLevel),
    [activeCampaignLevel]
  );

  const world = useMemo(
    () => buildWorldSpecForCampaignLevel(campaignLevel.levelNumber),
    [campaignLevel.levelNumber]
  );

  const prog = getCampaignLevelProgress(campaignLevel.levelNumber);

  // Enforce sequential unlock + Lesson & Practice prerequisite before 3D mission
  useEffect(() => {
    if (!profile) return;
    const allowed = prog.unlocked && ((prog.lessonDone && prog.practiceDone) || prog.missionDone);
    if (!allowed) {
      openCampaignLevel(campaignLevel.levelNumber);
    }
  }, [
    profile,
    prog.unlocked,
    prog.lessonDone,
    prog.practiceDone,
    prog.missionDone,
    campaignLevel.levelNumber,
    openCampaignLevel,
  ]);

  const [modal, setModal] = useState<ActiveModalKind>('intro');
  const [obstacle1Solved, setObstacle1Solved] = useState<boolean>(false);
  const [obstacle2Solved, setObstacle2Solved] = useState<boolean>(false);
  const [obs1JustSolvedBanner, setObs1JustSolvedBanner] = useState<boolean>(false);
  const [obs2JustSolvedBanner, setObs2JustSolvedBanner] = useState<boolean>(false);

  const [codeObs1, setCodeObs1] = useState<string>(world.obstacles[0].starterCode);
  const [codeObs2, setCodeObs2] = useState<string>(world.obstacles[1].starterCode);

  const [collectedCoinSet, setCollectedCoinSet] = useState<Set<number>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [showControlsHelp, setShowControlsHelp] = useState<boolean>(true);
  const [showTouchPad, setShowTouchPad] = useState<boolean>(false);

  const [victorySummary, setVictorySummary] = useState<{
    score: number;
    timeSeconds: number;
    coinsCollected: number;
    xpAwarded: number;
    totalCoinsAwarded: number;
    firstTime: boolean;
    unlockedWorldBadgeTitle?: string;
    unlockedCertificate?: boolean;
  } | null>(null);

  const mobileControlsRef = useRef<MobileControlState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jumpRequested: false,
    interactRequested: false,
  });

  useEffect(() => {
    setModal('intro');
    setObstacle1Solved(false);
    setObstacle2Solved(false);
    setObs1JustSolvedBanner(false);
    setObs2JustSolvedBanner(false);
    setCodeObs1(world.obstacles[0].starterCode);
    setCodeObs2(world.obstacles[1].starterCode);
    setCollectedCoinSet(new Set());
    setElapsedSeconds(0);
    setVictorySummary(null);
    setResetSignal((s) => s + 1);
  }, [campaignLevel.levelNumber, world]);

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowTouchPad(true);
    }
  }, []);

  const isSimulationPaused = modal !== null;

  useEffect(() => {
    if (isSimulationPaused) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isSimulationPaused]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modal === 'intro' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        setModal(null);
        return;
      }
      if (e.code === 'Escape') {
        if (modal === null) {
          setModal('pause');
        } else if (modal === 'pause' || modal === 'npc') {
          setModal(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  const handleTriggerInteract = useCallback((target: NearbyInteractable) => {
    if (target.kind === 'npc') {
      setModal('npc');
    } else if (target.kind === 'obstacle-1') {
      setObs1JustSolvedBanner(false);
      setModal('obstacle-1');
    } else if (target.kind === 'obstacle-2') {
      setObs2JustSolvedBanner(false);
      setModal('obstacle-2');
    }
  }, []);

  const handleCollectCoin = useCallback((idx: number) => {
    setCollectedCoinSet((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  const victoryTriggeredRef = useRef(false);
  useEffect(() => {
    victoryTriggeredRef.current = false;
  }, [campaignLevel.levelNumber, resetSignal]);

  const handleReachVictoryPortal = useCallback(async () => {
    if (victoryTriggeredRef.current) return;
    victoryTriggeredRef.current = true;

    const coinsCount = collectedCoinSet.size;
    const speedBonus = Math.max(0, 300 - elapsedSeconds * 2);
    const score = 700 + coinsCount * 50 + speedBonus;

    setModal('victory');
    const res = await completeCampaignMission3D(
      campaignLevel.levelNumber,
      score,
      elapsedSeconds,
      coinsCount
    );
    setVictorySummary({
      score,
      timeSeconds: elapsedSeconds,
      coinsCollected: coinsCount,
      xpAwarded: res.xpAwarded,
      totalCoinsAwarded: res.totalCoinsAwarded,
      firstTime: res.firstTime,
      unlockedWorldBadgeTitle: res.unlockedWorldBadgeTitle,
      unlockedCertificate: res.unlockedCertificate,
    });
  }, [
    collectedCoinSet.size,
    elapsedSeconds,
    completeCampaignMission3D,
    campaignLevel.levelNumber,
  ]);

  const handleRestartMission = () => {
    setObstacle1Solved(false);
    setObstacle2Solved(false);
    setObs1JustSolvedBanner(false);
    setObs2JustSolvedBanner(false);
    setCodeObs1(world.obstacles[0].starterCode);
    setCodeObs2(world.obstacles[1].starterCode);
    setCollectedCoinSet(new Set());
    setElapsedSeconds(0);
    setVictorySummary(null);
    setResetSignal((s) => s + 1);
    setModal(null);
  };

  if (!profile) return null;

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleMute = () => {
    void saveSettings({
      graphicsQuality: profile.graphicsQuality,
      soundMuted: !profile.soundMuted,
      theme: profile.theme,
    });
  };

  const toggleQuality = () => {
    const nextQ: GraphicsQuality = profile.graphicsQuality === 'high' ? 'low' : 'high';
    void saveSettings({
      graphicsQuality: nextQ,
      soundMuted: profile.soundMuted,
      theme: profile.theme,
    });
  };

  const currentStepText = !obstacle1Solved
    ? `Step 1/3: Program ${world.obstacles[0].title}`
    : !obstacle2Solved
    ? `Step 2/3: Cross & program ${world.obstacles[1].title}`
    : 'Step 3/3: Step into the glowing Victory Portal!';

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0D1712] text-white select-none">
      {/* Full-Viewport 3D Voxel Canvas */}
      <VoxelAdventureCanvas
        world={world}
        playerAvatarId={profile.avatarId}
        graphicsQuality={profile.graphicsQuality}
        paused={isSimulationPaused}
        obstacle1Solved={obstacle1Solved}
        obstacle2Solved={obstacle2Solved}
        resetSignal={resetSignal}
        mobileControlsRef={mobileControlsRef}
        onNearbyChange={setNearby}
        onTriggerInteract={handleTriggerInteract}
        onCollectCoin={handleCollectCoin}
        onReachVictoryPortal={() => void handleReachVictoryPortal()}
      />

      {/* Perimeter HUD Overlay (NO backdrop-filter so WebGL never stalls) */}
      <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* Top-Left: Exit + Campaign Level & Objective */}
          <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#112018]/95 border border-emerald-800/70 shadow-lg">
            <button
              type="button"
              onClick={() => openCampaignLevel(campaignLevel.levelNumber, 3)}
              className="p-1.5 rounded-lg bg-[#1C3529] hover:bg-[#274938] text-stone-200 transition-colors cursor-pointer"
              title="Back to Level Stages"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="font-display text-xs text-[#F5C451] leading-tight flex items-center gap-1.5">
                <span>
                  LV.{String(campaignLevel.levelNumber).padStart(2, '0')}/100 · W0
                  {campaignLevel.worldNumber} {world.name}
                </span>
                {campaignLevel.isBossLevel && (
                  <span className="inline-flex items-center gap-1 font-sans font-bold text-[#F28C45]">
                    · <Swords className="w-3 h-3" /> Boss
                  </span>
                )}
              </div>
              <div className="text-xs text-emerald-100 font-medium">{currentStepText}</div>
            </div>
          </div>

          {/* Top-Right: Telemetry & Quick Controls */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-[#112018]/95 border border-emerald-800/70 shadow-lg font-mono text-xs tabular-nums">
            <div className="flex items-center gap-1.5 text-amber-300 px-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>
                {collectedCoinSet.size}/{world.coinPositions.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sky-300 px-1.5 border-l border-emerald-900">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatClock(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowTouchPad((v) => !v)}
              className="px-2 py-1 rounded-lg bg-[#1C3529] hover:bg-[#274938] text-[11px] font-sans cursor-pointer"
              title="Toggle On-Screen Touch Pad"
            >
              {showTouchPad ? 'Hide Pad' : 'Touch Pad'}
            </button>

            <button
              type="button"
              onClick={toggleQuality}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1C3529] hover:bg-[#274938] text-[11px] font-sans cursor-pointer"
              title="Switch 3D Graphics Quality"
            >
              <Cpu className="w-3 h-3 text-[#69B9E7]" />
              <span>{profile.graphicsQuality === 'high' ? 'High 3D' : 'Low 3D'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-[#1C3529] hover:bg-[#274938] cursor-pointer"
              aria-label="Toggle Sound"
            >
              {profile.soundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#F5C451]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setModal('pause')}
              className="p-1.5 rounded-lg bg-[#1C3529] hover:bg-[#274938] cursor-pointer"
              aria-label="Pause Mission"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Perimeter Dock */}
        <div className="flex flex-col items-center gap-2">
          {nearby && nearby.kind !== 'portal' && modal === null && (
            <button
              type="button"
              onClick={() => handleTriggerInteract(nearby)}
              className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5C451] hover:bg-[#f7d06f] text-[#202923] font-bold text-xs sm:text-sm shadow-xl cursor-pointer"
            >
              {nearby.kind === 'npc' ? (
                <MessageSquare className="w-4 h-4" />
              ) : (
                <Terminal className="w-4 h-4" />
              )}
              <span>Press [E] or Click: {nearby.label}</span>
            </button>
          )}

          {nearby && nearby.kind === 'portal' && modal === null && (
            <div className="px-4 py-2 rounded-xl bg-[#112018]/95 border border-emerald-700 text-xs text-emerald-200">
              {nearby.label}
            </div>
          )}

          {showTouchPad && modal === null && (
            <div className="pointer-events-auto w-full flex items-end justify-between px-2 pb-1">
              <div className="grid grid-cols-3 gap-1.5 w-32">
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
                  className="h-10 rounded-lg bg-[#112018]/95 border border-emerald-700 flex items-center justify-center active:bg-[#2F7D46]"
                  aria-label="Move Forward"
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
                  className="h-10 rounded-lg bg-[#112018]/95 border border-emerald-700 flex items-center justify-center active:bg-[#2F7D46]"
                  aria-label="Move Left"
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
                  className="h-10 rounded-lg bg-[#112018]/95 border border-emerald-700 flex items-center justify-center active:bg-[#2F7D46]"
                  aria-label="Move Backward"
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
                  className="h-10 rounded-lg bg-[#112018]/95 border border-emerald-700 flex items-center justify-center active:bg-[#2F7D46]"
                  aria-label="Move Right"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    mobileControlsRef.current.interactRequested = true;
                  }}
                  className="px-4 h-11 rounded-xl bg-[#F5C451] text-[#202923] font-bold text-xs shadow-lg"
                >
                  Interact (E)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    mobileControlsRef.current.jumpRequested = true;
                  }}
                  className="px-4 h-11 rounded-xl bg-[#2F7D46] text-white font-bold text-xs shadow-lg"
                >
                  Jump
                </button>
              </div>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#112018]/95 border border-emerald-800/70 text-[11px] font-mono text-stone-300">
            {showControlsHelp ? (
              <>
                <span>WASD / Arrows Move · Drag Orbit · Space Jump · E Interact · Esc Pause</span>
                <button
                  type="button"
                  onClick={() => setShowControlsHelp(false)}
                  className="text-stone-400 hover:text-white cursor-pointer"
                  aria-label="Collapse controls hint"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowControlsHelp(true)}
                className="inline-flex items-center gap-1 text-stone-300 hover:text-white cursor-pointer"
              >
                <span>Controls</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Level & World Intro Screen */}
      {modal === 'intro' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-700/70 bg-[#13251D] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2F7D46]/25 flex items-center justify-center">
              <VoxelBrandMark size={36} />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
                Level {campaignLevel.levelNumber} of 100 · World 0{campaignLevel.worldNumber}{' '}
                {world.name}
              </div>
              {campaignLevel.isBossLevel && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F28C45]">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Boss Battle: {campaignLevel.bossTitle}</span>
                </div>
              )}
              <h1 className="font-display text-xl sm:text-2xl text-white">
                {campaignLevel.mission3d.missionTitle}
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-1">
                {campaignLevel.whatPlayerDoes}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1A14] border border-emerald-900/70 text-xs font-mono text-emerald-200">
              WASD Move · Mouse Drag Orbit · Space Jump · E Interact · Esc Pause
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#2F7D46] hover:bg-[#3A9454] text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start 3D Mission (Press Enter)</span>
              </button>

              <button
                type="button"
                onClick={() => openCampaignLevel(campaignLevel.levelNumber, 2)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white cursor-pointer"
              >
                Review Stage 2 Java Lesson First
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NPC Mentor Dialogue */}
      {modal === 'npc' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-700/70 bg-[#13251D] p-6 space-y-4 shadow-2xl select-text">
            <div className="flex items-center gap-3.5">
              <AvatarImage avatarId={world.npcAvatarId} sizeClass="w-14 h-14" />
              <div>
                <div className="text-xs font-mono text-[#F5C451]">{world.npcRole}</div>
                <h2 className="text-lg font-bold text-white">{world.npcName}</h2>
              </div>
            </div>

            <div className="space-y-2.5 text-sm text-stone-200 leading-relaxed">
              {world.npcDialogue.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
              >
                Got It — Explore World
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-World Java Obstacle Coding Terminal */}
      {(modal === 'obstacle-1' || modal === 'obstacle-2') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
          {(() => {
            const isFirst = modal === 'obstacle-1';
            const obs = isFirst ? world.obstacles[0] : world.obstacles[1];
            const solved = isFirst ? obstacle1Solved : obstacle2Solved;
            const justSolved = isFirst ? obs1JustSolvedBanner : obs2JustSolvedBanner;

            return (
              <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-emerald-700/80 bg-[#13251D] shadow-2xl overflow-hidden select-text">
                <div className="px-5 py-3.5 bg-[#183025] border-b border-emerald-900 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-[#F5C451]">
                      LEVEL {campaignLevel.levelNumber} TERMINAL ·{' '}
                      {isFirst ? 'CONSOLE 1 OF 2' : 'CONSOLE 2 OF 2'}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white">{obs.title}</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#224234] hover:bg-[#2C5442] text-stone-200 cursor-pointer"
                  >
                    Return to 3D World
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#0E1B15] border border-emerald-900/80 space-y-1">
                    <div className="text-xs font-semibold text-emerald-300">
                      Objective: {obs.objectiveLabel}
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">{obs.npcPrompt}</p>
                  </div>

                  <JavaCodeEditor
                    key={obs.id}
                    code={isFirst ? codeObs1 : codeObs2}
                    onChange={isFirst ? setCodeObs1 : setCodeObs2}
                    starterCode={obs.starterCode}
                    hints={obs.hints}
                    validation={obs.validation}
                    onValidatedPass={() => {
                      if (isFirst) {
                        setObstacle1Solved(true);
                        setObs1JustSolvedBanner(true);
                      } else {
                        setObstacle2Solved(true);
                        setObs2JustSolvedBanner(true);
                      }
                    }}
                    runButtonLabel="Execute Machine Code"
                    minHeight="210px"
                    compact
                  />

                  {(solved || justSolved) && (
                    <div className="p-4 rounded-xl bg-[#173B2B] border border-[#F5C451]/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-[#F5C451] shrink-0" />
                        <div className="text-xs sm:text-sm font-semibold text-white">
                          {obs.successActionText}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F5C451] text-[#202923] cursor-pointer"
                      >
                        Continue in 3D World →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL 4: Pause Menu */}
      {modal === 'pause' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-800 bg-[#13251D] p-6 space-y-4 shadow-2xl">
            <h2 className="font-display text-lg text-center text-white">
              Level {campaignLevel.levelNumber} Paused
            </h2>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
              >
                Resume Exploration
              </button>

              <button
                type="button"
                onClick={handleRestartMission}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1B3529] hover:bg-[#244636] text-stone-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Level {campaignLevel.levelNumber} Mission</span>
              </button>

              <button
                type="button"
                onClick={() => openCampaignLevel(campaignLevel.levelNumber, 2)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1B3529] hover:bg-[#244636] text-stone-200 cursor-pointer"
              >
                Review Stage 2 Java Lesson
              </button>

              <button
                type="button"
                onClick={() => setSection(AppSection.WORLDS)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1B3529] hover:bg-[#244636] text-stone-200 cursor-pointer"
              >
                Exit to Worlds Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Mission Victory Celebration */}
      {modal === 'victory' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-[#F5C451]/70 bg-[#13251D] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F5C451]/20 text-[#F5C451] flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
                Level {campaignLevel.levelNumber} of 100 Complete
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-white">
                {campaignLevel.isBossLevel && campaignLevel.bossTitle
                  ? `${campaignLevel.bossTitle} Defeated!`
                  : `${campaignLevel.mission3d.missionTitle} Cleared!`}
              </h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                {campaignLevel.masterySummary}
              </p>
            </div>

            {victorySummary?.unlockedWorldBadgeTitle && (
              <div className="p-3 rounded-xl border border-[#F5C451] bg-[#1C3528] text-xs font-bold text-[#F5C451]">
                World Boss Reward Unlocked: {victorySummary.unlockedWorldBadgeTitle}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-[#0D1A14] border border-emerald-900 font-mono text-xs tabular-nums">
              <div>
                <div className="text-stone-400 text-[10px]">SCORE</div>
                <div className="text-base font-bold text-white">
                  {victorySummary?.score ?? '...'}
                </div>
              </div>
              <div>
                <div className="text-stone-400 text-[10px]">TIME</div>
                <div className="text-base font-bold text-[#69B9E7]">
                  {formatClock(victorySummary?.timeSeconds ?? elapsedSeconds)}
                </div>
              </div>
              <div>
                <div className="text-stone-400 text-[10px]">REWARD</div>
                <div className="text-base font-bold text-[#F5C451]">
                  +{victorySummary?.xpAwarded ?? 0} XP
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {campaignLevel.levelNumber === 100 && (
                <button
                  type="button"
                  onClick={() => {
                    setSection(AppSection.DASHBOARD);
                    setCertificateOpen(true);
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f7d06f] text-[#202923] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>View Official Grand Citadel Certificate</span>
                </button>
              )}

              {campaignLevel.levelNumber < 100 && (
                <button
                  type="button"
                  onClick={() => openCampaignLevel(campaignLevel.levelNumber + 1)}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f7d06f] text-[#202923] cursor-pointer"
                >
                  Start Level {campaignLevel.levelNumber + 1} →
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => openCampaignLevel(campaignLevel.levelNumber, 5)}
                  className="py-2.5 rounded-xl text-xs font-semibold bg-[#1C3529] hover:bg-[#264737] text-stone-200 cursor-pointer"
                >
                  Stage 5 Summary
                </button>
                <button
                  type="button"
                  onClick={() => setSection(AppSection.WORLDS)}
                  className="py-2.5 rounded-xl text-xs font-semibold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
                >
                  All 6 Worlds
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
