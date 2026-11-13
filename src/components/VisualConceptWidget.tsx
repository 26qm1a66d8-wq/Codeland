import React, { useState } from 'react';
import { VisualDemoConfig } from '../types/codeland';
import { Play, RotateCcw, ArrowRight } from 'lucide-react';

interface VisualConceptWidgetProps {
  config: VisualDemoConfig;
}

export const VisualConceptWidget: React.FC<VisualConceptWidgetProps> = ({ config }) => {
  // Interactive state for each visual demo kind
  const [messageText, setMessageText] = useState('Bridge Activated!');
  const [usePrintln, setUsePrintln] = useState(true);

  const [intGems, setIntGems] = useState(24);
  const [doubleSpeed, setDoubleSpeed] = useState(3.5);
  const [boolTorchLit, setBoolTorchLit] = useState(true);

  const [playerKeyCount, setPlayerKeyCount] = useState(3);
  const [hasShield, setHasShield] = useState(true);

  const [loopLimit, setLoopLimit] = useState(4);
  const [currentStep, setCurrentStep] = useState(1);

  const [inputA, setInputA] = useState(6);
  const [inputB, setInputB] = useState(4);

  const [guardianName, setGuardianName] = useState('Aegis');
  const [guardianShield, setGuardianShield] = useState(80);
  const [spawnedUnits, setSpawnedUnits] = useState<{ name: string; shield: number }[]>([
    { name: 'Aegis', shield: 80 },
  ]);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-emerald-900/50 bg-[#F9F6EE] dark:bg-[#16261E] p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-[#173B2B] dark:text-emerald-200">
          Interactive Concept Lab · {config.title}
        </h4>
        <span className="text-xs text-stone-500 dark:text-stone-400">Adjust values to test live</span>
      </div>
      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{config.caption}</p>

      {config.kind === 'output_flow' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={messageText}
              maxLength={28}
              onChange={(e) => setMessageText(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#101B15] text-xs font-mono text-stone-800 dark:text-stone-100 flex-1 min-w-[160px]"
              aria-label="Message inside quotes"
            />
            <button
              type="button"
              onClick={() => setUsePrintln((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#2F7D46] text-white cursor-pointer"
            >
              Mode: {usePrintln ? 'println()' : 'print()'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#101A14] text-stone-200">
              <div className="text-[10px] uppercase text-stone-400 mb-1">Java Statement</div>
              <code>
                System.out.{usePrintln ? 'println' : 'print'}(&quot;{messageText}&quot;);
              </code>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101A14] text-emerald-300">
              <div className="text-[10px] uppercase text-stone-400 mb-1">Console Stream</div>
              <div>
                {messageText}
                {usePrintln ? ' ↵ (moves to next line)' : '▋ (stays on same line)'}
              </div>
            </div>
          </div>
        </div>
      )}

      {config.kind === 'variable_boxes' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-lg bg-white dark:bg-[#101B15] border border-stone-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#2F7D46] dark:text-emerald-400 font-semibold">int gems</span>
              <span className="tabular-nums font-bold text-sm">{intGems}</span>
            </div>
            <input
              type="range"
              min={0}
              max={99}
              value={intGems}
              onChange={(e) => setIntGems(Number(e.target.value))}
              className="w-full accent-[#2F7D46]"
            />
            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
              int gems = {intGems};
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-[#101B15] border border-stone-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#69B9E7] font-semibold">double speed</span>
              <span className="tabular-nums font-bold text-sm">{doubleSpeed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              value={Math.round(doubleSpeed * 10)}
              onChange={(e) => setDoubleSpeed(Number(e.target.value) / 10)}
              className="w-full accent-[#69B9E7]"
            />
            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
              double speed = {doubleSpeed.toFixed(1)};
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-[#101B15] border border-stone-200 dark:border-emerald-900/60 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#F28C45] font-semibold">boolean lit</span>
              <span className="font-bold">{String(boolTorchLit)}</span>
            </div>
            <button
              type="button"
              onClick={() => setBoolTorchLit((v) => !v)}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                boolTorchLit
                  ? 'bg-[#F5C451] text-[#202923]'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              Toggle boolean ({boolTorchLit ? 'true' : 'false'})
            </button>
            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
              boolean lit = {String(boolTorchLit)};
            </div>
          </div>
        </div>
      )}

      {config.kind === 'condition_gate' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium">
              <span className="font-mono">keys: {playerKeyCount}</span>
              <input
                type="range"
                min={0}
                max={5}
                value={playerKeyCount}
                onChange={(e) => setPlayerKeyCount(Number(e.target.value))}
                className="w-28 accent-[#2F7D46]"
              />
            </label>
            <button
              type="button"
              onClick={() => setHasShield((v) => !v)}
              className="px-3 py-1 rounded-lg text-xs font-mono bg-white dark:bg-[#101B15] border border-stone-300 dark:border-emerald-800 cursor-pointer"
            >
              hasShield = {String(hasShield)}
            </button>
          </div>
          <div className="p-3 rounded-lg bg-[#101A14] font-mono text-xs space-y-1.5">
            <div className="text-stone-300">
              if (keys &gt;= 3 &amp;&amp; hasShield) &#123; ... &#125; else &#123; ... &#125;
            </div>
            <div className="flex items-center gap-2 pt-1">
              <ArrowRight className="w-3.5 h-3.5 text-[#F5C451]" />
              {playerKeyCount >= 3 && hasShield ? (
                <span className="text-emerald-400 font-semibold">
                  Condition is TRUE → Castle Drawbridge Lowers!
                </span>
              ) : (
                <span className="text-[#F28C45] font-semibold">
                  Condition is FALSE → else branch runs (Gate stays locked)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {config.kind === 'loop_stepper' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-mono">
              <span>for (int i = 1; i &lt;= {loopLimit}; i++)</span>
              <input
                type="range"
                min={2}
                max={6}
                value={loopLimit}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLoopLimit(val);
                  setCurrentStep(1);
                }}
                className="w-24 accent-[#2F7D46]"
              />
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s < loopLimit ? s + 1 : 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2F7D46] text-white cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Step i++</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-stone-200 dark:bg-[#101B15] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {Array.from({ length: loopLimit }, (_, idx) => {
              const stepNum = idx + 1;
              const active = stepNum <= currentStep;
              return (
                <div
                  key={stepNum}
                  className={`px-3 py-2 rounded-lg font-mono text-xs border transition-all tabular-nums ${
                    active
                      ? 'bg-[#2F7D46] text-white border-[#2F7D46]'
                      : 'bg-white dark:bg-[#101B15] text-stone-400 border-stone-200 dark:border-emerald-900/50'
                  }`}
                >
                  Block #{stepNum}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {config.kind === 'method_machine' && (
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#101B15] border border-stone-200 dark:border-emerald-900/60 space-y-1.5">
              <div className="text-[10px] uppercase text-stone-400">Arguments In</div>
              <div className="flex items-center justify-between">
                <span>a = {inputA}</span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={inputA}
                  onChange={(e) => setInputA(Number(e.target.value))}
                  className="w-16 accent-[#2F7D46]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>b = {inputB}</span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={inputB}
                  onChange={(e) => setInputB(Number(e.target.value))}
                  className="w-16 accent-[#69B9E7]"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#173B2B] text-emerald-100 text-center space-y-1">
              <div className="text-[10px] uppercase text-[#F5C451]">Method Machine</div>
              <div>computePower({inputA}, {inputB})</div>
              <div className="text-emerald-300">return a * b;</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#101A14] text-[#F5C451] text-center space-y-1">
              <div className="text-[10px] uppercase text-stone-400">Returned Value</div>
              <div className="text-lg font-bold tabular-nums">{inputA * inputB}</div>
            </div>
          </div>
        </div>
      )}

      {config.kind === 'object_blueprint' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={guardianName}
              maxLength={14}
              onChange={(e) => setGuardianName(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#101B15] text-xs font-mono w-32"
              placeholder="Name"
            />
            <label className="flex items-center gap-1.5 text-xs font-mono">
              <span>shield: {guardianShield}</span>
              <input
                type="range"
                min={20}
                max={150}
                step={10}
                value={guardianShield}
                onChange={(e) => setGuardianShield(Number(e.target.value))}
                className="w-20 accent-[#2F7D46]"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setSpawnedUnits((prev) => [
                  ...prev.slice(-2),
                  { name: guardianName || 'Unit', shield: guardianShield },
                ])
              }
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#2F7D46] text-white cursor-pointer"
            >
              new Guardian(&quot;{guardianName}&quot;, {guardianShield})
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {spawnedUnits.map((u, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#101A14] text-stone-200 font-mono text-xs border border-emerald-800/50"
              >
                <div className="text-[#F5C451] font-semibold">Instance #{idx + 1}</div>
                <div>name: &quot;{u.name}&quot;</div>
                <div className="tabular-nums">shield: {u.shield}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
