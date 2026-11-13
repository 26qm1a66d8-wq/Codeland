import React, { useState } from 'react';
import { Users, Check, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { AvatarImage } from './BadgeIcon';

export const InviteNotificationOverlay: React.FC = () => {
  const {
    profile,
    incomingInvitations,
    acceptDirectInviteAndJoin,
    declineDirectInvite,
  } = usePlayer();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!profile || !profile.onboardingCompleted || incomingInvitations.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-18 lg:bottom-6 left-4 right-4 sm:right-auto sm:w-[400px] z-50 space-y-3 pointer-events-none"
      aria-live="polite"
    >
      {incomingInvitations.slice(0, 3).map((inv) => {
        const modeLabel =
          inv.gameMode === 'coding_race'
            ? 'Coding Race'
            : inv.gameMode === 'coop_adventure'
            ? 'Co-op Adventure'
            : 'Challenge Mode';
        const isBusy = busyId === inv.id;

        return (
          <div
            key={inv.id}
            className="pointer-events-auto rounded-2xl border-2 border-[#F5C451] bg-[#13261D] text-[#F5F1E6] p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-start gap-3">
              <AvatarImage avatarId={inv.senderAvatarId} sizeClass="w-11 h-11 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#F5C451]">
                  <Users className="w-3.5 h-3.5" />
                  <span>Private Room Invitation</span>
                </div>
                <p className="text-xs sm:text-sm text-white font-semibold leading-snug">
                  Your friend <span className="text-[#F5C451]">@{inv.senderUsername}</span> invited
                  you to a private CODELAND room.
                </p>
                <div className="text-xs font-mono text-stone-300">
                  {inv.roomName} · Code: <strong className="text-emerald-300">{inv.roomCode}</strong>{' '}
                  · Lv.{inv.selectedLevel} {modeLabel}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setBusyId(inv.id);
                  await acceptDirectInviteAndJoin(inv);
                  setBusyId(null);
                }}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#3A9454] disabled:opacity-60 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>JOIN ROOM</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setBusyId(inv.id);
                  await declineDirectInvite(inv);
                  setBusyId(null);
                }}
                className="py-2 px-3 rounded-xl text-xs font-semibold border border-emerald-800/80 bg-[#1B3328] hover:bg-[#234234] disabled:opacity-60 text-stone-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>DECLINE</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
