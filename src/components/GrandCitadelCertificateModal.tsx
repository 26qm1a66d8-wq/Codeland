import React from 'react';
import { Award, CheckCircle2, Printer, X } from 'lucide-react';
import { CAMPAIGN_WORLDS } from '../data/campaign100';
import { AvatarImage, BadgeIcon, VoxelBrandMark } from './BadgeIcon';

export interface GrandCitadelCertificateModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  totalXp: number;
  completedLevelsCount: number;
  unlocked: boolean;
}

export const GrandCitadelCertificateModal: React.FC<GrandCitadelCertificateModalProps> = ({
  open,
  onClose,
  displayName,
  username,
  totalXp,
  completedLevelsCount,
  unlocked,
}) => {
  if (!open) return null;

  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="CODELAND Grand Citadel Completion Certificate"
    >
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-[#F5C451] bg-[#0F1E17] text-[#F5F1E6] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-emerald-900/70 pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#F5C451]" />
            <span className="text-sm font-bold text-white">
              Grand Citadel Completion Certificate
            </span>
          </div>

          <div className="flex items-center gap-2">
            {unlocked && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#183024] hover:bg-[#224232] text-stone-200 cursor-pointer"
              aria-label="Close Certificate"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Frame */}
        <div className="rounded-2xl border border-[#F5C451]/60 bg-[#13261D] p-6 sm:p-10 text-center space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <VoxelBrandMark size={32} />
              <span className="font-display text-lg tracking-wider text-[#F5C451]">CODELAND</span>
            </div>
            <p className="text-xs font-mono text-emerald-300">
              Official Java Programming Mastery &amp; 6-Realm Restoration Record
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-stone-300">This certifies that</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {displayName}
            </h2>
            <p className="text-xs font-mono text-[#F5C451]">@{username}</p>
          </div>

          <p className="text-sm sm:text-base text-stone-200 max-w-xl mx-auto leading-relaxed">
            {unlocked
              ? 'has completed all 100 progressive Java levels across the six realms of CODELAND, mastering Java output, typed variables, conditional logic, iteration, modular methods, object-oriented design, collections, and exception handling to restore the Grand Citadel Core.'
              : `is currently progressing toward the Grand Citadel Core (${completedLevelsCount} / 100 levels completed). Clear Level 100: The Grand Core Restoration to officially issue and sign this certificate.`}
          </p>

          {/* 6 Realm Mentor Seals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
            {CAMPAIGN_WORLDS.map((w) => (
              <div
                key={w.worldId}
                className="p-2.5 rounded-xl border border-emerald-800/70 bg-[#0E1C15] flex flex-col items-center gap-1.5 text-center"
              >
                <AvatarImage avatarId={w.mentorAvatarId} sizeClass="w-9 h-9" />
                <div className="text-[11px] font-bold text-white truncate max-w-full">
                  {w.mentorName}
                </div>
                <div className="text-[10px] font-mono text-stone-400 truncate max-w-full">
                  W{w.worldNumber} · Lv.{w.levelRange[0]}–{w.levelRange[1]}
                </div>
              </div>
            ))}
          </div>

          {/* Champion Seal & Verification Metadata */}
          <div className="pt-4 border-t border-emerald-900/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono tabular-nums text-stone-300">
            <div className="flex items-center gap-3">
              <BadgeIcon kind="crown" accentHex="#F5C451" size={40} locked={!unlocked} />
              <div className="text-left">
                <div className="font-sans font-bold text-white">CODELAND Java Champion</div>
                <div className="text-[11px] text-emerald-300">
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#F5C451]" /> Verified 100/100 Levels
                    </span>
                  ) : (
                    <span>Progress: {completedLevelsCount}/100 Levels</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-0.5">
              <div>Total Experience: {totalXp} XP</div>
              <div className="text-stone-400">{unlocked ? `Issued: ${issueDate}` : 'Status: In Progress'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
