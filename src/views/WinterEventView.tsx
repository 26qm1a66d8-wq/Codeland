import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Code2,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { WINTER_CHALLENGES, WINTER_EVENT_META } from '../data/winterEventData';
import { AppSection, WinterEventChallenge } from '../types/codeland';
import {
  HudByteCoinIcon,
  HudCrystalIcon,
  VoxelSnowmanArt,
} from '../components/hub/VoxelHubArtwork';

export const WinterEventView: React.FC = () => {
  const {
    profile,
    setSection,
    completedWinterChallengeIds,
    completeWinterChallenge,
  } = usePlayer();

  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    WINTER_CHALLENGES.forEach((c) => {
      initial[c.id] = c.starterCode;
    });
    return initial;
  });
  const [executionOutput, setExecutionOutput] = useState<{
    challengeId: string;
    passed: boolean;
    output: string;
    error?: string;
  } | null>(null);
  const [rewardToast, setRewardToast] = useState<{
    title: string;
    xp: number;
    coins: number;
  } | null>(null);

  const activeChallenge = WINTER_CHALLENGES[activeChallengeIndex] || WINTER_CHALLENGES[0];
  const currentCode = codeInputs[activeChallenge.id] ?? activeChallenge.starterCode;

  const handleCodeChange = (newCode: string) => {
    setCodeInputs((prev) => ({ ...prev, [activeChallenge.id]: newCode }));
  };

  const handleResetCode = () => {
    setCodeInputs((prev) => ({ ...prev, [activeChallenge.id]: activeChallenge.starterCode }));
    setExecutionOutput(null);
  };

  const handleRunCode = async () => {
    const code = currentCode.trim();
    const expected = activeChallenge.expectedOutput.trim();

    // Check code correctness against expected task
    let isCorrect = false;
    let actualOutput = '';

    if (activeChallenge.id === 'winter-c1') {
      if (
        code.includes('System.out.println("Ignite Hearth Flame!")') ||
        code.includes('System.out.print("Ignite Hearth Flame!")') ||
        code.includes('"Ignite Hearth Flame!"')
      ) {
        isCorrect = true;
        actualOutput = 'Ignite Hearth Flame!\n[Process completed with exit code 0]';
      } else {
        actualOutput =
          'Error: Output did not match expected warming phrase "Ignite Hearth Flame!". Check your System.out.println string literal.';
      }
    } else if (activeChallenge.id === 'winter-c2') {
      if (
        (code.includes('finalTemp') || code.includes('8') || code.includes('currentTemp + warmingDegrees')) &&
        code.includes('System.out.println')
      ) {
        isCorrect = true;
        actualOutput = 'Final Temp: 8\n[Process completed with exit code 0]';
      } else {
        actualOutput = 'Error: Output did not match expected "Final Temp: 8". Check your arithmetic expression.';
      }
    } else if (activeChallenge.id === 'winter-c3') {
      if (
        code.includes('for') &&
        code.includes('1') &&
        code.includes('5') &&
        code.includes('Melted Lock #')
      ) {
        isCorrect = true;
        actualOutput =
          'Melted Lock #1\nMelted Lock #2\nMelted Lock #3\nMelted Lock #4\nMelted Lock #5\n[All 5 locks successfully melted!]';
      } else {
        actualOutput =
          'Error: The loop did not output all 5 melted locks. Check your loop bounds (i <= 5).';
      }
    } else if (activeChallenge.id === 'winter-c4') {
      if (
        (code.includes('blizzardPower > 80') || code.includes('if')) &&
        code.includes('Core Thawed!')
      ) {
        isCorrect = true;
        actualOutput =
          'Core Thawed!\n[Blizzard Core dissipated. Northern Gateway restored!]';
      } else {
        actualOutput =
          'Error: Output did not match expected "Core Thawed!". Check your conditional statement.';
      }
    }

    setExecutionOutput({
      challengeId: activeChallenge.id,
      passed: isCorrect,
      output: actualOutput,
    });

    if (isCorrect) {
      const alreadyDone = completedWinterChallengeIds.includes(activeChallenge.id);
      if (!alreadyDone) {
        const res = await completeWinterChallenge(activeChallenge.id);
        if (res.success) {
          setRewardToast({
            title: activeChallenge.title,
            xp: res.xpAwarded,
            coins: res.coinsAwarded,
          });
          setTimeout(() => setRewardToast(null), 4000);
        }
      }
    }
  };

  const completedCount = completedWinterChallengeIds.length;
  const progressPct = Math.round((completedCount / WINTER_CHALLENGES.length) * 100);

  return (
    <div className="min-h-full bg-[#080D21] text-[#F8FAFC] pb-16">
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Header & Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSection(AppSection.DASHBOARD)}
              className="p-2 rounded-xl bg-[#131C3F] hover:bg-[#1E2B61] border border-indigo-400/25 text-slate-200 transition-colors cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">
                  {WINTER_EVENT_META.seasonLabel}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-indigo-300 font-bold">
                  {WINTER_EVENT_META.daysRemaining} Days Remaining
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {WINTER_EVENT_META.eventName}
              </h1>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#131D45] border border-cyan-400/30 text-xs font-bold text-cyan-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{completedCount} / 4 Missions Thawed</span>
            </div>
            <button
              type="button"
              onClick={() => setSection(AppSection.DASHBOARD)}
              className="px-3.5 py-1.5 rounded-xl bg-[#151F47] hover:bg-[#1D2B5E] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Hub
            </button>
          </div>
        </div>

        {/* Reward Alert Toast */}
        {rewardToast && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0A261C] to-indigo-950 border border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.25)] flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Challenge Complete!</h4>
                <p className="text-xs text-emerald-200">{rewardToast.title} solved</p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-xs sm:text-sm">
              <span className="text-violet-300">+{rewardToast.xp} XP</span>
              <span className="text-amber-300">+{rewardToast.coins} Coins</span>
            </div>
          </div>
        )}

        {/* Hero Event Banner with Voxel Snowman Artwork */}
        <div className="rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-[#12234D] via-[#0E1A3C] to-[#0A1026] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl space-y-3 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Special Limited-Time World Event
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {WINTER_EVENT_META.storyHeadline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {WINTER_EVENT_META.storyParagraph}
              </p>

              {/* Event Progress Bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-200 mb-1.5">
                  <span>Thawing Progress</span>
                  <span className="font-extrabold">{progressPct}%</span>
                </div>
                <div className="h-3 rounded-full bg-[#070B18] overflow-hidden border border-cyan-400/20">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-400 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Snowman Artwork Presentation */}
            <div className="flex flex-col items-center shrink-0">
              <div className="p-4 rounded-2xl bg-[#091026]/80 border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                <VoxelSnowmanArt size={110} />
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs font-extrabold text-cyan-300">
                  Reward: Frost Sovereign
                </div>
                <div className="text-[11px] text-slate-400">Complete all 4 missions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Challenge Interface: Tabs on Left, Code Runner on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Challenge Selector List */}
          <div className="lg:col-span-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Event Coding Missions
            </h3>
            {WINTER_CHALLENGES.map((challenge, idx) => {
              const isSelected = idx === activeChallengeIndex;
              const isDone = completedWinterChallengeIds.includes(challenge.id);

              return (
                <button
                  key={challenge.id}
                  type="button"
                  onClick={() => {
                    setActiveChallengeIndex(idx);
                    setExecutionOutput(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400/70 bg-[#162752] shadow-[0_0_15px_rgba(34,211,238,0.18)]'
                      : isDone
                      ? 'border-emerald-500/30 bg-[#0C1B2B] hover:bg-[#122338]'
                      : 'border-indigo-500/20 bg-[#0F1636] hover:bg-[#151F47]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                      {challenge.concept}
                    </span>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Solved</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
                        <span className="text-violet-300">+{challenge.xpReward} XP</span>
                        <span className="text-amber-400">+{challenge.coinReward} C</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-white">{challenge.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {challenge.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive Java Code Editor & Runner */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-indigo-400/25 bg-[#0C132E] p-4 sm:p-5 space-y-4 shadow-xl">
              {/* Task Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400 font-bold">
                    {activeChallenge.concept}
                  </div>
                  <h3 className="text-lg font-black text-white">{activeChallenge.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141E44] hover:bg-[#1C285B] border border-indigo-400/25 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRunCode}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-[#051C12] text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Java Code</span>
                  </button>
                </div>
              </div>

              {/* Task Instruction Box */}
              <div className="p-3 rounded-xl bg-[#131D45] border border-cyan-400/20 text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-cyan-300 uppercase tracking-wide mr-1.5">
                  Objective:
                </span>
                {activeChallenge.codeTaskPrompt}
              </div>

              {/* Code Area */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Main.java</span>
                  </span>
                  <span>Java SE 17 (Compiler Ready)</span>
                </div>
                <textarea
                  value={currentCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl bg-[#070B1A] border border-indigo-500/30 p-3 text-xs sm:text-sm text-cyan-100 font-mono focus:outline-none focus:border-cyan-400 selection:bg-cyan-900 leading-relaxed resize-y"
                  spellCheck={false}
                />
              </div>

              {/* Execution Console Output */}
              {executionOutput && (
                <div
                  className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
                    executionOutput.passed
                      ? 'bg-emerald-950/70 border-emerald-400/40 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-400/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold font-sans">
                    {executionOutput.passed ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Execution Passed! The frost is melting...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4 text-rose-400" />
                        <span>Execution Failed: Try again</span>
                      </>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] opacity-90">
                    {executionOutput.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
