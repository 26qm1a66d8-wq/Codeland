import React from 'react';
import { Award, CheckCircle2, Code2, Play, Sparkles } from 'lucide-react';
import { WorldBiomePortalArt } from './VoxelHubArtwork';

interface ContinueAdventureCardProps {
  worldNumber: number;
  worldName: string;
  levelNumber: number;
  conceptTitle: string;
  stageSummary: string;
  lessonDone: boolean;
  practiceDone: boolean;
  missionDone: boolean;
  all100Completed: boolean;
  primaryCtaLabel: string;
  onContinue: () => void;
  onOpenPractice: () => void;
  onOpenCertificate: () => void;
}

export const ContinueAdventureCard: React.FC<ContinueAdventureCardProps> = ({
  worldNumber,
  worldName,
  levelNumber,
  conceptTitle,
  stageSummary,
  lessonDone,
  practiceDone,
  missionDone,
  all100Completed,
  primaryCtaLabel,
  onContinue,
  onOpenPractice,
  onOpenCertificate,
}) => {
  return (
    <section
      aria-label="Continue Your Adventure"
      className="h-full rounded-2xl border border-indigo-400/30 bg-[#111936] p-5 flex flex-col justify-between gap-4 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#FBBF24] tracking-tight">
            Continue Your Adventure
          </h2>
        </div>

        <span className="text-xs font-mono tabular-nums text-cyan-300">
          Level {levelNumber} / 100
        </span>
      </div>

      {/* Biome Preview + Active Level Details */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        <div className="sm:col-span-5 relative rounded-xl overflow-hidden border border-cyan-400/35 bg-[#0B1026] aspect-[16/10]">
          <WorldBiomePortalArt worldNumber={worldNumber} />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#0B1026]/90 border border-indigo-400/35 text-[11px] font-mono tabular-nums text-white">
            World {worldNumber}
          </div>
        </div>

        <div className="sm:col-span-7 space-y-2 min-w-0">
          <div className="text-xs text-indigo-200 font-medium">
            World {worldNumber}: <span className="text-white font-bold">{worldName}</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] leading-snug text-balance">
            {all100Completed
              ? 'All 100 CODELAND Java Realms Restored!'
              : `Level ${levelNumber} · ${conceptTitle}`}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{stageSummary}</p>

          {/* Clean Unboxed Stage Readiness Row */}
          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-300">
            <span className={lessonDone ? 'text-emerald-300 font-semibold' : ''}>
              {lessonDone ? '✓ Lesson' : '○ Lesson'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={practiceDone ? 'text-emerald-300 font-semibold' : ''}>
              {practiceDone ? '✓ Practice' : '○ Practice'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={missionDone ? 'text-emerald-300 font-semibold' : ''}>
              {missionDone ? '✓ 3D Mission' : '○ 3D Mission'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary & Secondary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-b from-[#FDE047] via-[#FBBF24] to-[#F59E0B] hover:from-[#FEF08A] hover:to-[#FBBF24] text-[#111827] shadow-md transition-transform active:scale-98 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{primaryCtaLabel}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPractice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#1A2550] hover:bg-[#233168] text-cyan-200 border border-cyan-400/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Practice Arena</span>
          </button>

          {all100Completed && (
            <button
              type="button"
              onClick={onOpenCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Certificate</span>
            </button>
          )}

          {!all100Completed && lessonDone && (
            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
