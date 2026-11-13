import React, { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { Play, RotateCcw, Lightbulb, Trash2, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { CodeValidationSpec } from '../types/codeland';
import {
  evaluateJavaSubmission,
  JavaEvaluationFeedback,
  JavaExecutionResult,
  runJavaSimulator,
} from '../lib/javaSimulator';
import { soundFX } from '../lib/audio';

interface JavaCodeEditorProps {
  code: string;
  onChange: (nextCode: string) => void;
  starterCode: string;
  hints?: string[];
  validation?: CodeValidationSpec;
  onValidatedPass?: (feedback: JavaEvaluationFeedback) => void;
  onEvaluationFail?: (feedback: JavaEvaluationFeedback) => void;
  runButtonLabel?: string;
  minHeight?: string;
  compact?: boolean;
}

export const JavaCodeEditor: React.FC<JavaCodeEditorProps> = ({
  code,
  onChange,
  starterCode,
  hints = [],
  validation,
  onValidatedPass,
  onEvaluationFail,
  runButtonLabel = 'Run Code',
  minHeight = '230px',
  compact = false,
}) => {
  const [execution, setExecution] = useState<JavaExecutionResult | null>(null);
  const [feedback, setFeedback] = useState<JavaEvaluationFeedback | null>(null);
  const [revealedHintCount, setRevealedHintCount] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cliCommand, setCliCommand] = useState<string>('');

  const extensions = useMemo(() => [java()], []);

  const handleRun = () => {
    setIsRunning(true);
    window.setTimeout(() => {
      if (validation) {
        const evalRes = evaluateJavaSubmission(code, validation, cliCommand);
        setExecution(evalRes.execution);
        setFeedback(evalRes);
        if (evalRes.passed) {
          soundFX.playCodeSuccess();
          onValidatedPass?.(evalRes);
        } else {
          soundFX.playCodeError();
          onEvaluationFail?.(evalRes);
        }
      } else {
        const execRes = runJavaSimulator(code);
        setExecution(execRes);
        setFeedback(null);
        if (execRes.success) {
          soundFX.playCodeSuccess();
        } else {
          soundFX.playCodeError();
        }
      }
      setIsRunning(false);
    }, 80);
  };

  const handleReset = () => {
    onChange(starterCode);
    setCliCommand('');
    setExecution(null);
    setFeedback(null);
  };

  const handleClearConsole = () => {
    setExecution(null);
    setFeedback(null);
  };

  const handleRevealNextHint = () => {
    if (revealedHintCount < hints.length) {
      setRevealedHintCount((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-stone-300 dark:border-emerald-900/60 bg-[#141E18] text-stone-100 overflow-hidden shadow-sm">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#1B2B22] border-b border-emerald-950/80">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-300/90">
          <Terminal className="w-3.5 h-3.5 text-[#F5C451]" />
          <span>Main.java</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-400 font-sans text-[11px]">
            CODELAND Java Practice Simulator (Educational Subset)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hints.length > 0 && (
            <button
              type="button"
              onClick={handleRevealNextHint}
              disabled={revealedHintCount >= hints.length}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#24382D] hover:bg-[#2E4739] disabled:opacity-50 text-[#F5C451] transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Reveal a helpful hint"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>
                Hint {revealedHintCount}/{hints.length}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#24382D] hover:bg-[#2E4739] text-stone-200 transition-colors cursor-pointer"
            title="Reset back to starter code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#2F7D46] hover:bg-[#389152] text-white shadow-sm transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Running...' : runButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Optional Scanner Test Input Stream Bar */}
      {validation?.simulatedStdin && validation.simulatedStdin.length > 0 && (
        <div className="px-3.5 py-1.5 bg-[#16241C] border-b border-emerald-950/80 flex flex-wrap items-center gap-2 text-[11px] font-mono text-emerald-200/90">
          <span className="text-[#F5C451] font-semibold">Scanner Input Stream:</span>
          <span>
            {validation.simulatedStdin.map((item) => JSON.stringify(item)).join('  ·  ')}
          </span>
        </div>
      )}

      {/* CodeMirror Editor Surface */}
      <div className="text-[13px] font-mono leading-relaxed overflow-auto">
        <CodeMirror
          value={code}
          height={minHeight}
          theme="dark"
          extensions={extensions}
          readOnly={Boolean(validation?.cliCommandSpec?.commandOnly)}
          onChange={(val) => onChange(val)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
        />
      </div>

      {/* Optional Interactive JDK / JVM Terminal Command Prompt Bar */}
      {validation?.cliCommandSpec && (
        <div className="px-3.5 py-2.5 bg-[#122119] border-t border-emerald-900/70 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#F5C451]">
              {validation.cliCommandSpec.promptLabel}
            </span>
            <span className="text-emerald-300/80 font-mono">
              Press Enter or click &ldquo;{runButtonLabel}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A130E] border border-emerald-800/80 font-mono text-xs">
            <span className="text-[#4EF5A8] font-bold select-none">$</span>
            <input
              type="text"
              value={cliCommand}
              onChange={(e) => setCliCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRun();
                }
              }}
              placeholder={validation.cliCommandSpec.placeholder}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-white placeholder:text-stone-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Progressive Hints Drawer */}
      {revealedHintCount > 0 && (
        <div className="px-3.5 py-2.5 bg-[#1F2F25] border-t border-emerald-900/60 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F5C451]">
            Explorer Hints
          </div>
          {hints.slice(0, revealedHintCount).map((hintText, idx) => (
            <p key={idx} className="text-xs text-stone-200 leading-relaxed">
              <span className="font-mono text-[#F5C451] mr-1.5">#{idx + 1}</span>
              {hintText}
            </p>
          ))}
        </div>
      )}

      {/* Console Output Area */}
      <div className="border-t border-emerald-950/90 bg-[#0F1713]">
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-emerald-950/70">
          <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Console Output
          </span>
          {(execution || feedback) && (
            <button
              type="button"
              onClick={handleClearConsole}
              className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className={`px-3.5 ${compact ? 'py-2.5 min-h-[76px]' : 'py-3 min-h-[96px]'} font-mono text-xs`}>
          {!execution ? (
            <p className="text-stone-500">
              Click &ldquo;{runButtonLabel}&rdquo; to compile and execute your Java program.
            </p>
          ) : execution.success ? (
            <div className="space-y-1">
              {execution.outputLines.length > 0 ? (
                execution.outputLines.map((line, i) => (
                  <div key={i} className="text-emerald-300 whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-stone-400 italic">(Program finished with no printed output)</div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold text-[#F28C45]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {execution.errorLine ? `Line ${execution.errorLine}: ` : ''}
                  {execution.errorTitle || 'Syntax or Runtime Issue'}
                </span>
              </div>
              <p className="font-sans text-xs text-stone-200 leading-relaxed">
                {execution.friendlyErrorExplanation}
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Feedback Banner */}
        {feedback && (
          <div
            className={`px-3.5 py-2.5 border-t text-xs flex items-start gap-2.5 ${
              feedback.passed
                ? 'bg-[#173B2B]/85 border-emerald-600/40 text-emerald-100'
                : 'bg-[#2C2118] border-[#F28C45]/40 text-amber-100'
            }`}
          >
            {feedback.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#F28C45] shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-semibold">{feedback.headline}</div>
              <p className="text-stone-200 leading-relaxed">{feedback.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
