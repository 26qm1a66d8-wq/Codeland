import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Lightbulb,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
} from 'lucide-react';
import { AppSection, LevelStageNumber } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import {
  CAMPAIGN_WORLDS,
  getCampaignLevel,
  getCampaignWorldMeta,
  getLevelsForWorld,
} from '../data/campaign100';
import { AvatarImage, BadgeIcon } from '../components/BadgeIcon';
import { JavaCodeEditor } from '../components/JavaCodeEditor';
import { VisualConceptWidget } from '../components/VisualConceptWidget';
import { ACHIEVEMENTS_CATALOG } from '../data/charactersAndBadges';
import { soundFX } from '../lib/audio';

export const LessonDetailView: React.FC = () => {
  const {
    profile,
    activeCampaignLevel,
    activeStage,
    setActiveStage,
    setSection,
    getCampaignLevelProgress,
    openCampaignLevel,
    completeCampaignLesson,
    completeCampaignGuidedPractice,
    setGlossaryOpen,
    setCertificateOpen,
  } = usePlayer();

  const currentLevel = useMemo(
    () => getCampaignLevel(activeCampaignLevel),
    [activeCampaignLevel]
  );

  const worldMeta = useMemo(
    () => getCampaignWorldMeta(currentLevel.worldNumber),
    [currentLevel.worldNumber]
  );

  const [sidebarWorldNum, setSidebarWorldNum] = useState<number>(currentLevel.worldNumber);

  useEffect(() => {
    setSidebarWorldNum(currentLevel.worldNumber);
  }, [currentLevel.worldNumber]);

  const sidebarLevels = useMemo(
    () => getLevelsForWorld(sidebarWorldNum),
    [sidebarWorldNum]
  );

  // Stage 2 Interactive Java Editor state
  const [editorCode, setEditorCode] = useState<string>(currentLevel.lesson.javaExample);
  const [lessonJustVerified, setLessonJustVerified] = useState<boolean>(false);

  // Stage 3 Guided Practice state
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [blankInput, setBlankInput] = useState<string>('');
  const [arrangedOrder, setArrangedOrder] = useState<number[]>([]);
  const [practiceHintShown, setPracticeHintShown] = useState<boolean>(false);
  const [practiceFeedback, setPracticeFeedback] = useState<{
    passed: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setEditorCode(currentLevel.lesson.javaExample);
    setLessonJustVerified(false);
    setSelectedOptionIdx(null);
    setBlankInput('');
    setArrangedOrder([]);
    setPracticeHintShown(false);
    setPracticeFeedback(null);
  }, [currentLevel.id, currentLevel.lesson.javaExample]);

  const usesScannerInExample = /\bScanner\b/.test(currentLevel.lesson.javaExample);

  const stage2Validation = useMemo(
    () => ({
      simulatedStdin: usesScannerInExample ? ['Explorer', '12', '7'] : undefined,
    }),
    [usesScannerInExample]
  );

  if (!profile) return null;

  const prog = getCampaignLevelProgress(currentLevel.levelNumber);
  const lessonCompleted = prog.lessonDone || lessonJustVerified;
  const practiceCompleted = prog.practiceDone || Boolean(practiceFeedback?.passed);
  const canLaunch3D =
    currentLevel.worldNumber === 1 ||
    (lessonCompleted && practiceCompleted) ||
    prog.missionDone;

  const worldBadgeDef = ACHIEVEMENTS_CATALOG.find((b) => b.id === worldMeta.rewardBadgeId);

  const handleStage2Pass = async () => {
    setLessonJustVerified(true);
    await completeCampaignLesson(currentLevel.levelNumber);
  };

  const gp = currentLevel.guidedPractice;

  const handleCheckGuidedPractice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let isCorrect = false;
    let customMessage = gp.explanation;

    if (gp.kind === 'arrange_code' && gp.jumbledLines && gp.correctOrderIndices) {
      if (arrangedOrder.length !== gp.correctOrderIndices.length) {
        setPracticeFeedback({
          passed: false,
          message: `Select all ${gp.correctOrderIndices.length} Java lines in execution order before checking.`,
        });
        soundFX.playCodeError();
        return;
      }
      isCorrect = arrangedOrder.every((val, i) => val === gp.correctOrderIndices![i]);
      if (!isCorrect) {
        customMessage =
          'That line order does not compile cleanly yet. Reset or click a line to adjust its position, then check again.';
      }
    } else if (gp.options && gp.options.length > 0 && gp.correctOptionIndex !== undefined) {
      if (selectedOptionIdx === null) {
        setPracticeFeedback({
          passed: false,
          message: 'Choose one of the Java options above to check your answer.',
        });
        return;
      }
      isCorrect = selectedOptionIdx === gp.correctOptionIndex;
      if (!isCorrect) {
        customMessage =
          gp.optionFeedback?.[selectedOptionIdx] ||
          'Not quite! Review the Java snippet and Stage 2 syntax rules, then try another option.';
      }
    } else {
      const cleaned = blankInput.trim();
      if (!cleaned) {
        setPracticeFeedback({
          passed: false,
          message: 'Type your Java answer in the blank field first.',
        });
        return;
      }
      const validAnswers = [
        gp.expectedBlankAnswer,
        ...(gp.acceptableBlankAnswers || []),
      ]
        .filter((x): x is string => Boolean(x))
        .map((x) => x.trim());

      isCorrect = validAnswers.some((ans) => ans === cleaned);
      if (!isCorrect) {
        customMessage =
          'Check exact Java capitalization, quotes, or punctuation. Reveal the hint if you want a nudge!';
      }
    }

    if (isCorrect) {
      soundFX.playCodeSuccess();
      setPracticeFeedback({
        passed: true,
        message: gp.explanation,
      });
      await completeCampaignGuidedPractice(currentLevel.levelNumber);
    } else {
      soundFX.playCodeError();
      setPracticeFeedback({
        passed: false,
        message: customMessage,
      });
    }
  };

  const stages: {
    num: LevelStageNumber;
    label: string;
    done: boolean;
    locked: boolean;
  }[] = [
    { num: 1, label: '1. Briefing', done: lessonCompleted, locked: false },
    { num: 2, label: '2. Java Lesson', done: lessonCompleted, locked: false },
    { num: 3, label: '3. Guided Practice', done: practiceCompleted, locked: false },
    { num: 4, label: '4. 3D Mission', done: prog.missionDone, locked: !canLaunch3D },
    { num: 5, label: '5. Mastery', done: prog.missionDone, locked: !prog.missionDone },
  ];

  const handleStageTabClick = (st: (typeof stages)[number]) => {
    if (st.locked) return;
    setActiveStage(st.num);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top Sub-Header & 5-Stage Stepper */}
      <div className="px-4 sm:px-6 py-3 border-b border-stone-300/80 dark:border-emerald-950 bg-white/90 dark:bg-[#12211A] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setSection(AppSection.ACADEMY)}
              className="inline-flex items-center gap-1.5 font-semibold text-stone-600 dark:text-stone-300 hover:text-[#2F7D46] dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Academy</span>
            </button>
            <span className="text-stone-400" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums font-bold text-[#173B2B] dark:text-[#F5C451]">
              Level {String(currentLevel.levelNumber).padStart(2, '0')} / 100
            </span>
            <span className="text-stone-400" aria-hidden="true">
              ·
            </span>
            <span className="text-stone-600 dark:text-stone-300">{worldMeta.name}</span>
            {currentLevel.isBossLevel && (
              <>
                <span className="text-stone-400" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-[#F28C45]">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Boss Battle: {currentLevel.bossTitle}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-[#2F7D46] dark:text-emerald-400 font-semibold">
              +{currentLevel.xpReward} Mission XP · +{currentLevel.coinReward} Coins
            </span>
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-semibold bg-stone-200/80 dark:bg-[#193126] text-stone-800 dark:text-emerald-100 hover:bg-stone-300 dark:hover:bg-[#224233] cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 text-[#2F7D46] dark:text-[#F5C451]" />
              <span>Glossary</span>
            </button>
          </div>
        </div>

        {/* Interactive 5-Stage Progress Bar */}
        <div
          role="tablist"
          aria-label="Campaign Level Stages"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
        >
          {stages.map((st) => {
            const isCurrent = activeStage === st.num;
            return (
              <button
                key={st.num}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                disabled={st.locked}
                onClick={() => handleStageTabClick(st)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-[#2F7D46] text-white shadow-xs cursor-pointer'
                    : st.locked
                    ? 'bg-stone-200/60 dark:bg-[#0D1813] text-stone-400 dark:text-stone-500 cursor-not-allowed'
                    : 'bg-stone-100 dark:bg-[#172C22] text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-[#1F3A2D] cursor-pointer'
                }`}
              >
                <span>{st.label}</span>
                {st.done ? (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      isCurrent ? 'text-[#F5C451]' : 'text-[#2F7D46] dark:text-emerald-400'
                    }`}
                  />
                ) : st.locked ? (
                  <Lock className="w-3 h-3 opacity-75" />
                ) : null}
              </button>
            );
          })}

          {canLaunch3D && (
            <button
              type="button"
              onClick={() => openCampaignLevel(currentLevel.levelNumber, 4)}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{prog.missionDone ? 'Replay 3D World' : 'Launch 3D Mission'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12">
        {/* Left Sidebar: 100-Level World Navigator */}
        <aside className="xl:col-span-3 2xl:col-span-2 border-b xl:border-b-0 xl:border-r border-stone-300/80 dark:border-emerald-950 bg-[#EFEADE] dark:bg-[#101E17] p-4 space-y-3 overflow-y-auto xl:max-h-[calc(100vh-8.25rem)]">
          <div className="space-y-1.5">
            <label
              htmlFor="lesson-world-switcher"
              className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400"
            >
              Campaign Realm
            </label>
            <select
              id="lesson-world-switcher"
              value={sidebarWorldNum}
              onChange={(e) => setSidebarWorldNum(Number(e.target.value))}
              className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs font-semibold"
            >
              {CAMPAIGN_WORLDS.map((w) => (
                <option key={w.worldId} value={w.worldNumber}>
                  W{w.worldNumber}: {w.name} ({w.levelRange[0]}–{w.levelRange[1]})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            {sidebarLevels.map((lvl) => {
              const lvlProg = getCampaignLevelProgress(lvl.levelNumber);
              const active = lvl.levelNumber === currentLevel.levelNumber;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!lvlProg.unlocked}
                  onClick={() => openCampaignLevel(lvl.levelNumber)}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                    active
                      ? 'bg-[#2F7D46] text-white font-semibold cursor-pointer'
                      : lvlProg.unlocked
                      ? 'hover:bg-stone-300/60 dark:hover:bg-[#182D23] text-stone-700 dark:text-stone-300 cursor-pointer'
                      : 'opacity-45 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono tabular-nums mr-1.5">
                      {String(lvl.levelNumber).padStart(2, '0')}.
                    </span>
                    {lvl.whatPlayerLearns}
                  </span>
                  {lvlProg.missionDone ? (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        active ? 'text-[#F5C451]' : 'text-[#2F7D46] dark:text-emerald-400'
                      }`}
                    />
                  ) : !lvlProg.unlocked ? (
                    <Lock className="w-3 h-3 shrink-0" />
                  ) : lvl.isBossLevel ? (
                    <Swords className="w-3.5 h-3.5 shrink-0 text-[#F28C45]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Stage Content Surface */}
        <main className="xl:col-span-9 2xl:col-span-10 overflow-y-auto xl:max-h-[calc(100vh-8.25rem)]">
          {/* ==================== STAGE 1: STORY BRIEFING ==================== */}
          {activeStage === 1 && (
            <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#2F7D46] dark:text-[#F5C451]">
                  <span>STAGE 1 OF 5 · STORY &amp; MISSION BRIEFING</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentLevel.difficultyBandLabel}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {currentLevel.briefing.storyHeadline}
                </h1>
              </div>

              {/* Mentor Dialogue Card */}
              <div className="p-5 sm:p-6 rounded-2xl border border-stone-300/90 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] flex flex-col sm:flex-row items-start gap-4 shadow-xs">
                <AvatarImage avatarId={worldMeta.mentorAvatarId} sizeClass="w-16 h-16 shrink-0" />
                <div className="space-y-2.5">
                  <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                    {worldMeta.mentorName} · {worldMeta.mentorRole}
                  </div>
                  {currentLevel.briefing.mentorDialogue.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-sm sm:text-base text-stone-700 dark:text-stone-200 leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Learning Focus & 3D Mission Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/70 bg-white dark:bg-[#14261E] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-emerald-300">
                    <BookOpen className="w-4 h-4" />
                    <span>Java Concept Focus</span>
                  </div>
                  <h2 className="text-base font-bold">{currentLevel.whatPlayerLearns}</h2>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {currentLevel.lesson.conceptSummary[0]}
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/70 bg-white dark:bg-[#14261E] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#F28C45] dark:text-[#F5C451]">
                    <Compass className="w-4 h-4" />
                    <span>3D Voxel Mission Goal</span>
                  </div>
                  <h2 className="text-base font-bold">{currentLevel.mission3d.missionTitle}</h2>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {currentLevel.whatPlayerDoes}
                  </p>
                </div>
              </div>

              {/* Prerequisite Rule Notice & Next CTA */}
              <div className="p-5 rounded-2xl border border-[#2F7D46]/40 bg-[#2F7D46]/8 dark:bg-[#163024] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-stone-900 dark:text-white">
                    Ready to learn the Java syntax for Level {currentLevel.levelNumber}?
                  </div>
                  <p className="text-xs text-stone-600 dark:text-emerald-200">
                    Complete Stage 2 (Interactive Lesson) and Stage 3 (Guided Practice) to unlock
                    the 3D Voxel World for this level.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(2)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Start Stage 2: Java Lesson</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 2: INTERACTIVE JAVA LESSON ==================== */}
          {activeStage === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-8.25rem)]">
              {/* Left Column: Concept Breakdown, Visual Lab & Walkthrough */}
              <section className="lg:col-span-6 p-5 sm:p-7 space-y-6 border-b lg:border-b-0 lg:border-r border-stone-300/80 dark:border-emerald-950">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                    STAGE 2 OF 5 · INTERACTIVE JAVA LESSON
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {currentLevel.whatPlayerLearns}
                  </h1>
                </div>

                <div className="space-y-3">
                  {currentLevel.lesson.conceptSummary.map((para, idx) => (
                    <p
                      key={idx}
                      className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>

                <VisualConceptWidget config={currentLevel.lesson.visualDemo} />

                <div className="space-y-3">
                  <h2 className="text-sm font-bold">Java Syntax Walkthrough</h2>
                  <pre className="p-4 rounded-xl bg-[#101A14] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed border border-emerald-950">
                    <code>{currentLevel.lesson.javaExample}</code>
                  </pre>

                  <div className="space-y-2">
                    {currentLevel.lesson.lineByLine.map((row, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#14261E] border border-stone-200 dark:border-emerald-900/60 space-y-1"
                      >
                        <code className="block font-mono text-xs text-[#2F7D46] dark:text-[#F5C451] whitespace-pre-wrap">
                          {row.line}
                        </code>
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          {row.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Right Column: Live Java Simulator Sandbox */}
              <section className="lg:col-span-6 p-5 sm:p-7 bg-[#EBE5D6] dark:bg-[#0D1813] flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-bold flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[#2F7D46] dark:text-[#F5C451]" />
                        <span>Try It Live in Main.java</span>
                      </h2>
                      {lessonCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2F7D46] dark:text-[#F5C451]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lesson Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">
                      Click <strong>Run &amp; Complete Lesson</strong> to execute the Java example in
                      the simulator, inspect the console output, and earn +20 XP.
                    </p>
                  </div>

                  <JavaCodeEditor
                    key={`stage2-${currentLevel.id}`}
                    code={editorCode}
                    onChange={setEditorCode}
                    starterCode={currentLevel.lesson.javaExample}
                    hints={[
                      'Click Reset if you want to restore the clean lesson example code.',
                      currentLevel.guidedPractice.hint,
                    ]}
                    validation={stage2Validation}
                    onValidatedPass={() => void handleStage2Pass()}
                    runButtonLabel="Run & Complete Lesson"
                    minHeight="270px"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-stone-300 dark:border-emerald-900/70 bg-white dark:bg-[#14261E] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">
                      {lessonCompleted
                        ? 'Stage 2 Java Lesson Completed!'
                        : 'Run the Java code above to verify Stage 2'}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Next up: Stage 3 Guided Practice (+15 XP)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      lessonCompleted
                        ? 'bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923]'
                        : 'bg-[#2F7D46] hover:bg-[#389152] text-white'
                    }`}
                  >
                    <span>Continue to Guided Practice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ==================== STAGE 3: GUIDED PRACTICE ==================== */}
          {activeStage === 3 && (
            <div className="max-w-3xl mx-auto p-5 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                    STAGE 3 OF 5 · GUIDED JAVA PRACTICE
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Verify Your Understanding
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setPracticeHintShown((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-[#F5C451] cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{practiceHintShown ? 'Hide Hint' : 'Need a Hint?'}</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl border border-stone-300/90 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] space-y-5 shadow-xs">
                <p className="text-sm sm:text-base font-semibold text-stone-900 dark:text-white leading-relaxed">
                  {gp.prompt}
                </p>

                {gp.codeSnippet && (
                  <pre className="p-4 rounded-xl bg-[#101A14] text-emerald-300 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed border border-emerald-950">
                    <code>{gp.codeSnippet}</code>
                  </pre>
                )}

                {/* Variant A: Arrange Code Lines */}
                {gp.kind === 'arrange_code' && gp.jumbledLines && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
                        <span>Your Ordered Program ({arrangedOrder.length}/{gp.jumbledLines.length})</span>
                        {arrangedOrder.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setArrangedOrder([]);
                              setPracticeFeedback(null);
                            }}
                            className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300 hover:underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset Order
                          </button>
                        )}
                      </div>

                      <div className="min-h-[96px] p-3 rounded-xl bg-[#0F1813] border border-emerald-900/70 space-y-1.5">
                        {arrangedOrder.length === 0 ? (
                          <p className="text-xs font-mono text-stone-500 py-4 text-center">
                            Click the jumbled Java lines below in top-to-bottom order.
                          </p>
                        ) : (
                          arrangedOrder.map((lineIdx, pos) => (
                            <button
                              key={`${lineIdx}-${pos}`}
                              type="button"
                              onClick={() => {
                                setArrangedOrder((prev) => prev.filter((_, i) => i !== pos));
                                setPracticeFeedback(null);
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-[#193024] hover:bg-[#234232] text-left font-mono text-xs text-emerald-200 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="whitespace-pre">{gp.jumbledLines![lineIdx]}</span>
                              <span className="text-[10px] text-stone-400">Remove</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                        Available Lines
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {gp.jumbledLines.map((lineText, idx) => {
                          const used = arrangedOrder.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={used}
                              onClick={() => {
                                setArrangedOrder((prev) => [...prev, idx]);
                                setPracticeFeedback(null);
                              }}
                              className={`px-3.5 py-2.5 rounded-xl border text-left font-mono text-xs transition-colors ${
                                used
                                  ? 'border-stone-200 dark:border-emerald-950 bg-stone-100 dark:bg-[#0D1712] text-stone-400 opacity-50 cursor-not-allowed'
                                  : 'border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1E17] hover:border-[#2F7D46] text-stone-800 dark:text-emerald-200 cursor-pointer'
                              }`}
                            >
                              <span className="whitespace-pre">{lineText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Variant B: Multiple-Choice Options (predict_output / fix_error / etc.) */}
                {gp.kind !== 'arrange_code' && gp.options && gp.options.length > 0 && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {gp.options.map((opt, idx) => {
                      const active = selectedOptionIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedOptionIdx(idx);
                            setPracticeFeedback(null);
                          }}
                          className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-mono transition-colors flex items-center gap-3 cursor-pointer ${
                            active
                              ? 'border-[#2F7D46] dark:border-[#F5C451] bg-[#2F7D46]/10 dark:bg-[#1C3629] font-bold text-stone-900 dark:text-white'
                              : 'border-stone-200 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#0F1E17] hover:border-stone-400 dark:hover:border-emerald-700 text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-stone-200 dark:bg-[#162B21] flex items-center justify-center text-xs font-bold shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="break-words">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Variant C: Fill-in-the-Blank Input */}
                {gp.kind === 'fill_blank' && (!gp.options || gp.options.length === 0) && (
                  <form onSubmit={(e) => void handleCheckGuidedPractice(e)} className="space-y-2">
                    <label
                      htmlFor="guided-blank-input"
                      className="block text-xs font-mono text-stone-500 dark:text-stone-400"
                    >
                      Type the exact missing Java code:
                    </label>
                    <input
                      id="guided-blank-input"
                      type="text"
                      value={blankInput}
                      onChange={(e) => {
                        setBlankInput(e.target.value);
                        setPracticeFeedback(null);
                      }}
                      placeholder="Type Java token or expression..."
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1E17] font-mono text-sm focus:outline-none focus:border-[#F5C451]"
                    />
                  </form>
                )}

                {practiceHintShown && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-[#1F2F25] border border-amber-300/70 dark:border-[#F5C451]/40 text-xs text-stone-800 dark:text-amber-100 leading-relaxed">
                    <strong className="font-mono text-[#2F7D46] dark:text-[#F5C451] mr-1.5">
                      Hint:
                    </strong>
                    {gp.hint}
                  </div>
                )}

                {practiceFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                      practiceFeedback.passed
                        ? 'bg-[#2F7D46]/12 dark:bg-[#173B2B] border-[#2F7D46] dark:border-emerald-500/60 text-stone-900 dark:text-emerald-100'
                        : 'bg-amber-50 dark:bg-[#2C2118] border-[#F28C45]/60 text-stone-900 dark:text-amber-100'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {practiceFeedback.passed
                        ? 'Correct — Guided Practice Passed!'
                        : 'Try Again'}
                    </div>
                    <p>{practiceFeedback.message}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleCheckGuidedPractice()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Check Java Answer</span>
                  </button>

                  {practiceCompleted && !lessonCompleted && (
                    <button
                      type="button"
                      onClick={() => setActiveStage(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5C451] text-[#202923] cursor-pointer"
                    >
                      <span>Finish Stage 2 Lesson to Unlock 3D</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {canLaunch3D && (
                    <button
                      type="button"
                      onClick={() => openCampaignLevel(currentLevel.levelNumber, 4)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] cursor-pointer"
                    >
                      <Compass className="w-4 h-4" />
                      <span>
                        {prog.missionDone
                          ? 'Replay 3D Voxel Mission'
                          : 'Enter Stage 4: 3D Voxel Mission →'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== STAGE 4: 3D MISSION LAUNCH GATE ==================== */}
          {activeStage === 4 && (
            <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                  STAGE 4 OF 5 · 3D VOXEL GAMEPLAY MISSION
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Level {currentLevel.levelNumber}: {currentLevel.mission3d.missionTitle}
                </h1>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {currentLevel.mission3d.missionSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLevel.mission3d.obstacles.map((obs, idx) => (
                  <div
                    key={obs.id}
                    className="p-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/70 bg-white dark:bg-[#14261E] space-y-2"
                  >
                    <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                      IN-WORLD TERMINAL 0{idx + 1}
                    </div>
                    <h2 className="text-base font-bold">{obs.title}</h2>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      <strong>Objective:</strong> {obs.objectiveLabel}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl border border-[#F5C451]/70 bg-[#13261D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#F5C451]">
                    PREREQUISITES VERIFIED · LESSON ✓ · PRACTICE ✓
                  </div>
                  <div className="text-base font-bold">
                    {worldMeta.name} is ready for deployment
                  </div>
                  <p className="text-xs text-emerald-100/90">
                    Program both Java consoles inside the 3D world and step through the Victory
                    Portal to unlock{' '}
                    {currentLevel.levelNumber < 100
                      ? `Level ${currentLevel.levelNumber + 1}`
                      : 'your Grand Citadel Certificate'}
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openCampaignLevel(currentLevel.levelNumber, 4)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Launch 3D World</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 5: LEVEL MASTERY SUMMARY ==================== */}
          {activeStage === 5 && (
            <div className="max-w-3xl mx-auto p-5 sm:p-8 space-y-6">
              <div className="p-6 sm:p-8 rounded-2xl border border-[#2F7D46] dark:border-[#F5C451]/70 bg-white dark:bg-[#14261E] text-center space-y-5 shadow-sm">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F5C451]/20 text-[#2F7D46] dark:text-[#F5C451] flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-[#2F7D46] dark:text-[#F5C451] font-bold">
                    STAGE 5 OF 5 · LEVEL {currentLevel.levelNumber} MASTERED
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold">
                    {currentLevel.whatPlayerLearns}
                  </h1>
                  <p className="text-sm text-stone-600 dark:text-stone-300 max-w-xl mx-auto leading-relaxed">
                    {currentLevel.masterySummary}
                  </p>
                </div>

                {currentLevel.isBossLevel && (
                  <div className="p-4 rounded-xl border border-[#F5C451]/60 bg-amber-50/70 dark:bg-[#0F1E17] flex items-center justify-center gap-3 max-w-md mx-auto">
                    <BadgeIcon
                      kind={worldBadgeDef?.iconKind || 'crown'}
                      accentHex={worldMeta.accentColor}
                      size={42}
                    />
                    <div className="text-left text-xs">
                      <div className="font-mono text-[#F28C45] dark:text-[#F5C451] font-bold">
                        WORLD {worldMeta.worldNumber} BOSS REWARD
                      </div>
                      <div className="font-bold text-sm">{worldMeta.rewardBadgeTitle}</div>
                      <div className="text-stone-600 dark:text-stone-300">
                        +{worldMeta.rewardBonusXp} Bonus XP
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {currentLevel.levelNumber === 100 && (
                    <button
                      type="button"
                      onClick={() => setCertificateOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Open Grand Citadel Certificate</span>
                    </button>
                  )}

                  {currentLevel.levelNumber < 100 && (
                    <button
                      type="button"
                      onClick={() => openCampaignLevel(currentLevel.levelNumber + 1)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
                    >
                      <span>Start Level {currentLevel.levelNumber + 1}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openCampaignLevel(currentLevel.levelNumber, 4)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-stone-200 dark:bg-[#193126] text-stone-800 dark:text-stone-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay 3D Mission</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
