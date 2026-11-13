import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { ExerciseDifficulty, PracticeExercise } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { PRACTICE_EXERCISES } from '../data/practiceExercises';
import { JavaCodeEditor } from '../components/JavaCodeEditor';
import { soundFX } from '../lib/audio';

const TYPE_LABELS: Record<PracticeExercise['type'], string> = {
  mcq: 'Multiple Choice',
  predict_output: 'Output Prediction',
  fill_blank: 'Fill in the Blank',
  find_error: 'Spot the Error',
  arrange_code: 'Arrange Code Lines',
  write_code: 'Write Java Program',
  debug_code: 'Debug Java Code',
};

export const PracticeArenaView: React.FC = () => {
  const { profile, completePracticeExercise } = usePlayer();

  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [diffFilter, setDiffFilter] = useState<ExerciseDifficulty | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');

  const topics = useMemo(() => {
    const set = new Set(PRACTICE_EXERCISES.map((e) => e.topic));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredExercises = useMemo(() => {
    return PRACTICE_EXERCISES.filter((ex) => {
      if (levelFilter !== 'all' && ex.levelNumber !== levelFilter) return false;
      if (topicFilter !== 'All' && ex.topic !== topicFilter) return false;
      if (diffFilter !== 'All' && ex.difficulty !== diffFilter) return false;
      const done = profile?.completedExercises.includes(ex.id) ?? false;
      if (statusFilter === 'todo' && done) return false;
      if (statusFilter === 'done' && !done) return false;
      return true;
    });
  }, [levelFilter, topicFilter, diffFilter, statusFilter, profile?.completedExercises]);

  const [selectedId, setSelectedId] = useState<string>(PRACTICE_EXERCISES[0].id);

  const activeEx = useMemo(() => {
    return (
      filteredExercises.find((e) => e.id === selectedId) ||
      filteredExercises[0] ||
      PRACTICE_EXERCISES[0]
    );
  }, [filteredExercises, selectedId]);

  // Interactive per-exercise user inputs
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [arrangedOrder, setArrangedOrder] = useState<number[]>([]);
  const [codeValue, setCodeValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [resultState, setResultState] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    setPickedOption(null);
    setTextInput('');
    setArrangedOrder(
      activeEx.jumbledLines ? activeEx.jumbledLines.map((_, idx) => idx) : []
    );
    setCodeValue(activeEx.starterCode || '');
    setShowHint(false);
    setResultState('idle');
  }, [activeEx]);

  if (!profile) return null;

  const isSolvedEver = profile.completedExercises.includes(activeEx.id);

  const handleMoveLine = (pos: number, delta: -1 | 1) => {
    const target = pos + delta;
    if (target < 0 || target >= arrangedOrder.length) return;
    const copy = [...arrangedOrder];
    const tmp = copy[pos];
    copy[pos] = copy[target];
    copy[target] = tmp;
    setArrangedOrder(copy);
    setResultState('idle');
  };

  const handleCheckNonEditorExercise = async () => {
    let correct = false;

    if (activeEx.type === 'mcq' || activeEx.type === 'find_error') {
      correct = pickedOption !== null && pickedOption === activeEx.correctOptionIndex;
    } else if (activeEx.type === 'predict_output' || activeEx.type === 'fill_blank') {
      const expected = (activeEx.expectedTextAnswer || '').trim();
      correct = textInput.trim() === expected;
    } else if (activeEx.type === 'arrange_code') {
      const expectedOrder = activeEx.correctOrderIndices || [];
      correct =
        arrangedOrder.length === expectedOrder.length &&
        arrangedOrder.every((val, i) => val === expectedOrder[i]);
    }

    if (correct) {
      setResultState('correct');
      soundFX.playCodeSuccess();
      await completePracticeExercise(activeEx.id, activeEx.title);
    } else {
      setResultState('wrong');
      soundFX.playCodeError();
    }
  };

  const handleCodeExercisePassed = async () => {
    setResultState('correct');
    await completePracticeExercise(activeEx.id, activeEx.title);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#2F7D46] dark:text-[#F5C451]">
            7 Challenge Formats · Anti-Farming XP
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Java Practice Arena
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Sharpen your Java reflexes across output prediction, bug hunting, code arrangement, and
            live coding drills.
          </p>
        </div>

        <div className="text-xs font-mono tabular-nums text-stone-600 dark:text-stone-300">
          Solved: <strong>{profile.completedExercises.length}</strong> / {PRACTICE_EXERCISES.length}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 mb-1">
            Java Level
          </label>
          <select
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-xs font-medium"
          >
            <option value="all">All 6 Levels</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Level {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 mb-1">
            Topic
          </label>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-xs font-medium"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 mb-1">
            Difficulty
          </label>
          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value as ExerciseDifficulty | 'All')}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-xs font-medium"
          >
            <option value="All">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'todo' | 'done')}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] text-xs font-medium"
          >
            <option value="all">All Challenges</option>
            <option value="todo">Unsolved Only</option>
            <option value="done">Completed Only</option>
          </select>
        </div>
      </div>

      {/* Main Arena Split View */}
      {filteredExercises.length === 0 ? (
        <div className="p-10 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] text-center space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            No practice challenges match your current filter combination.
          </p>
          <button
            type="button"
            onClick={() => {
              setLevelFilter('all');
              setTopicFilter('All');
              setDiffFilter('All');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Challenge Selector List */}
          <div className="lg:col-span-4 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-3 space-y-1.5 max-h-[620px] overflow-y-auto">
            {filteredExercises.map((ex) => {
              const solved = profile.completedExercises.includes(ex.id);
              const selected = ex.id === activeEx.id;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedId(ex.id)}
                  className={`w-full p-3 rounded-xl text-left transition-colors cursor-pointer space-y-1 ${
                    selected
                      ? 'bg-[#2F7D46] text-white'
                      : 'hover:bg-stone-100 dark:hover:bg-[#1A3127]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono opacity-85">
                    <span>
                      Lv.{ex.levelNumber} · {ex.difficulty} · {TYPE_LABELS[ex.type]}
                    </span>
                    {solved && (
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          selected ? 'text-[#F5C451]' : 'text-[#2F7D46] dark:text-emerald-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-bold truncate">{ex.title}</div>
                </button>
              );
            })}
          </div>

          {/* Right Active Exercise Workspace */}
          <div className="lg:col-span-8 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-stone-500 dark:text-stone-400">
              <span>
                Level {activeEx.levelNumber} · {activeEx.topic} · {activeEx.difficulty} ·{' '}
                {TYPE_LABELS[activeEx.type]}
              </span>
              <span className="text-[#2F7D46] dark:text-[#F5C451] font-semibold tabular-nums">
                {isSolvedEver
                  ? 'Completed (Practice Replay)'
                  : `+${activeEx.xpReward} XP · +${activeEx.coinReward} Coins`}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold">{activeEx.title}</h2>
              <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                {activeEx.prompt}
              </p>
            </div>

            {activeEx.codeContext && (
              <pre className="p-4 rounded-xl bg-[#101A14] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{activeEx.codeContext}</code>
              </pre>
            )}

            {/* Format 1 & 4: Multiple Choice / Find Error */}
            {(activeEx.type === 'mcq' || activeEx.type === 'find_error') && activeEx.options && (
              <div className="space-y-2">
                {activeEx.options.map((opt, idx) => {
                  const chosen = pickedOption === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPickedOption(idx);
                        setResultState('idle');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border font-mono text-xs transition-colors cursor-pointer ${
                        chosen
                          ? 'border-[#F5C451] bg-[#F5C451]/15 font-semibold'
                          : 'border-stone-200 dark:border-emerald-900/60 hover:bg-stone-100 dark:hover:bg-[#101E17]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Format 2 & 3: Predict Output / Fill Blank */}
            {(activeEx.type === 'predict_output' || activeEx.type === 'fill_blank') && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
                  {activeEx.type === 'predict_output'
                    ? 'Type the exact printed output:'
                    : 'Type the exact missing Java keyword or token:'}
                </label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    setResultState('idle');
                  }}
                  placeholder="Enter your answer..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0F1B15] font-mono text-sm focus:outline-none focus:border-[#2F7D46]"
                />
              </div>
            )}

            {/* Format 5: Arrange Jumbled Java Lines */}
            {activeEx.type === 'arrange_code' && activeEx.jumbledLines && (
              <div className="space-y-2">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Use the Up/Down controls to place the Java lines in valid execution order:
                </div>
                {arrangedOrder.map((origIdx, pos) => (
                  <div
                    key={origIdx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-emerald-900/60 bg-[#101A14] text-emerald-300 font-mono text-xs"
                  >
                    <span className="truncate">{activeEx.jumbledLines?.[origIdx]}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={pos === 0}
                        onClick={() => handleMoveLine(pos, -1)}
                        className="p-1 rounded bg-[#1D3126] hover:bg-[#284536] disabled:opacity-35 text-stone-200 cursor-pointer"
                        aria-label="Move line up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={pos === arrangedOrder.length - 1}
                        onClick={() => handleMoveLine(pos, 1)}
                        className="p-1 rounded bg-[#1D3126] hover:bg-[#284536] disabled:opacity-35 text-stone-200 cursor-pointer"
                        aria-label="Move line down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Format 6 & 7: Write Code / Debug Code */}
            {(activeEx.type === 'write_code' || activeEx.type === 'debug_code') && (
              <JavaCodeEditor
                key={activeEx.id}
                code={codeValue}
                onChange={setCodeValue}
                starterCode={activeEx.starterCode || ''}
                hints={[activeEx.hint]}
                validation={activeEx.validation}
                onValidatedPass={() => void handleCodeExercisePassed()}
                runButtonLabel="Run & Submit Java"
                minHeight="220px"
              />
            )}

            {/* Action Buttons for Non-Editor Formats */}
            {activeEx.type !== 'write_code' && activeEx.type !== 'debug_code' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowHint((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-200/80 dark:bg-[#1A3126] text-stone-700 dark:text-[#F5C451] cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {resultState !== 'idle' && (
                    <button
                      type="button"
                      onClick={() => {
                        setResultState('idle');
                        setPickedOption(null);
                        setTextInput('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-[#1A3126] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleCheckNonEditorExercise()}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
                  >
                    Submit Answer
                  </button>
                </div>
              </div>
            )}

            {showHint && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-[#1F2F25] border border-[#F5C451]/40 text-xs text-stone-700 dark:text-stone-200">
                <strong>Hint:</strong> {activeEx.hint}
              </div>
            )}

            {/* Feedback & Explanation Box */}
            {resultState !== 'idle' && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  resultState === 'correct'
                    ? 'border-[#2F7D46] bg-[#2F7D46]/12 dark:bg-[#173828]'
                    : 'border-[#F28C45] bg-[#F28C45]/12 dark:bg-[#2C2018]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {resultState === 'correct' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-[#2F7D46] dark:text-[#F5C451]" />
                      <span>Correct! Well done!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-[#F28C45]" />
                      <span>Not quite right yet — try again!</span>
                    </>
                  )}
                </div>
                <p className="text-stone-700 dark:text-stone-200 leading-relaxed">
                  {activeEx.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
