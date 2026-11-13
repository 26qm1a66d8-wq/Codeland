import React, { useState } from 'react';
import { KeyRound, Plus, Share2, Users } from 'lucide-react';
import { GameRoom } from '../../types/codeland';
import { normalizeRoomCode } from '../../lib/multiplayerClient';

interface MultiplayerQuickPanelProps {
  activeRoom: GameRoom | null;
  pendingInvitesCount: number;
  onCreatePrivateRoom: () => void;
  onJoinRoomByCode: (code: string) => Promise<unknown>;
  onOpenMultiplayerHub: () => void;
}

export const MultiplayerQuickPanel: React.FC<MultiplayerQuickPanelProps> = ({
  activeRoom,
  pendingInvitesCount,
  onCreatePrivateRoom,
  onJoinRoomByCode,
  onOpenMultiplayerHub,
}) => {
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinError, setQuickJoinError] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeRoomCode(quickJoinCode);
    if (cleaned.length < 4) {
      setQuickJoinError('Enter a valid room code (for example, JAVA42).');
      return;
    }
    setQuickJoinError(null);
    setJoiningRoom(true);
    try {
      await onJoinRoomByCode(cleaned);
      setQuickJoinCode('');
    } catch (err) {
      setQuickJoinError(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setJoiningRoom(false);
    }
  };

  return (
    <section
      aria-label="Private Multiplayer Rooms and Direct Invites"
      className="h-full rounded-2xl border border-indigo-400/25 bg-[#111936] p-5 flex flex-col justify-between gap-4 shadow-lg"
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/40 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#A855F7]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] tracking-tight">
                Private Multiplayer Guild
              </h2>
              <p className="text-[11px] text-slate-300">
                Coding Race · Co-op Adventure · Direct Friend Invites
              </p>
            </div>
          </div>

          {activeRoom ? (
            <button
              type="button"
              onClick={onOpenMultiplayerHub}
              className="text-xs font-mono font-bold text-[#22D3EE] hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Room {activeRoom.roomCode} →
            </button>
          ) : pendingInvitesCount > 0 ? (
            <button
              type="button"
              onClick={onOpenMultiplayerHub}
              className="text-xs font-mono font-bold text-[#FBBF24] hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {pendingInvitesCount} Invite{pendingInvitesCount === 1 ? '' : 's'} Waiting →
            </button>
          ) : null}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Host a private coding room for any of the 100 campaign levels, share a short room code via
          WhatsApp, SMS, or direct link, and solve Java challenges together in real time.
        </p>
      </div>

      {/* Actions: Create Private Room + Join by Code + Invite Friends */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCreatePrivateRoom}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A855F7] text-white shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE PRIVATE ROOM</span>
          </button>

          <button
            type="button"
            onClick={onOpenMultiplayerHub}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold bg-[#192350] hover:bg-[#23316D] text-cyan-200 border border-cyan-400/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Invite Friends</span>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2">
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={8}
              value={quickJoinCode}
              onChange={(e) => {
                setQuickJoinCode(normalizeRoomCode(e.target.value));
                if (quickJoinError) setQuickJoinError(null);
              }}
              placeholder="Enter room code (e.g. JAVA42)"
              aria-label="Enter room code"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-indigo-400/30 bg-[#0B1026] text-xs font-mono uppercase tracking-wider text-white placeholder:text-slate-500 focus:outline-none focus:border-[#22D3EE]"
            />
          </div>
          <button
            type="submit"
            disabled={joiningRoom}
            className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-b from-[#FDE047] via-[#FBBF24] to-[#F59E0B] hover:from-[#FEF08A] hover:to-[#FBBF24] disabled:opacity-60 text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {joiningRoom ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        {quickJoinError && (
          <p className="text-xs text-amber-300 font-medium">{quickJoinError}</p>
        )}
      </div>
    </section>
  );
};
