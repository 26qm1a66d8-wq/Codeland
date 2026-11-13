import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Smartphone,
  Link2,
  Crown,
  Play,
  Settings2,
  UserPlus,
  UserMinus,
  LogOut,
  XCircle,
  KeyRound,
  Compass,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  AppSection,
  ExerciseDifficulty,
  FriendEntry,
  GameRoom,
  RoomGameMode,
  RoomInvitation,
} from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import {
  buildFullInvitationMessage,
  buildRoomInvitationUrl,
  buildSmsShareHref,
  buildWhatsAppShareHref,
  closePrivateRoom,
  copyTextToClipboard,
  createPrivateRoom,
  fetchFriendsDirectory,
  fetchRoomByCode,
  fetchRoomInvitations,
  kickRoomPlayer,
  leavePrivateRoom,
  normalizeRoomCode,
  respondFriendRequest,
  sendDirectRoomInvite,
  sendFriendRequest,
  startRoomMatch,
  toggleRoomReady,
  updateRoomSettings,
} from '../lib/multiplayerClient';
import {
  CAMPAIGN_WORLDS,
  getCampaignLevel,
  getCampaignWorldMeta,
  getLevelsForWorld,
} from '../data/campaign100';
import { AvatarImage } from '../components/BadgeIcon';
import { soundFX } from '../lib/audio';

const GAME_MODE_INFO: {
  id: RoomGameMode;
  title: string;
  tagline: string;
  accent: string;
}[] = [
  {
    id: 'coding_race',
    title: 'Coding Race',
    tagline: 'Solve 5 Java relay beacons around the 360° arena fastest to claim #1.',
    accent: '#F5C451',
  },
  {
    id: 'coop_adventure',
    title: 'Co-op Adventure',
    tagline: 'Work together as a squad to charge the shared Central Energy Core.',
    accent: '#2F7D46',
  },
  {
    id: 'challenge_mode',
    title: 'Challenge Mode',
    tagline: 'Compete for maximum route scan efficiency and first-try Java accuracy.',
    accent: '#69B9E7',
  },
];

function formatModeLabel(mode: RoomGameMode): string {
  return GAME_MODE_INFO.find((m) => m.id === mode)?.title || 'Coding Race';
}

export const MultiplayerView: React.FC = () => {
  const {
    profile,
    canonicalAppOrigin,
    activeRoom,
    setActiveRoom,
    previewRoomCode,
    setPreviewRoomCode,
    createModalRequested,
    setCreateModalRequested,
    joinRoomByCodeAction,
    friendsRevision,
    bumpFriendsRevision,
    pushToast,
    setSection,
  } = usePlayer();

  // Room creation state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [justCreatedCode, setJustCreatedCode] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [gameMode, setGameMode] = useState<RoomGameMode>('coding_race');
  const [javaDifficulty, setJavaDifficulty] = useState<ExerciseDifficulty>('Beginner');
  const [allowFriendsToInvite, setAllowFriendsToInvite] = useState<boolean>(true);
  const [preselectedFriendIds, setPreselectedFriendIds] = useState<string[]>([]);
  const [creatingBusy, setCreatingBusy] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join by code state
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningBusy, setJoiningBusy] = useState<boolean>(false);

  // Deep-link Room Preview state
  const [previewRoom, setPreviewRoom] = useState<GameRoom | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Lobby & Share UI state
  const [copiedField, setCopiedField] = useState<'code' | 'link' | 'message' | null>(null);
  const [showShareDrawer, setShowShareDrawer] = useState<boolean>(true);
  const [editingSettings, setEditingSettings] = useState<boolean>(false);
  const [confirmCloseRoom, setConfirmCloseRoom] = useState<boolean>(false);
  const [lobbyActionBusy, setLobbyActionBusy] = useState<boolean>(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Friends & Room Invitations state
  const [friendsEntries, setFriendsEntries] = useState<FriendEntry[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvitation[]>([]);
  const [friendHandleInput, setFriendHandleInput] = useState<string>('');
  const [friendFeedback, setFriendFeedback] = useState<string | null>(null);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  // Auto-open Create Private Room form when triggered from Dashboard CTA
  useEffect(() => {
    if (createModalRequested) {
      setShowCreateForm(true);
      setCreateModalRequested(false);
    }
  }, [createModalRequested, setCreateModalRequested]);

  // Pre-populate default room name
  useEffect(() => {
    if (profile && !roomName) {
      setRoomName(`${profile.displayName}'s Java Squad`);
    }
  }, [profile, roomName]);

  // Sync edit form values when host opens settings editor
  useEffect(() => {
    if (activeRoom && editingSettings) {
      setRoomName(activeRoom.roomName);
      setMaxPlayers(activeRoom.maxPlayers);
      setSelectedLevel(activeRoom.selectedLevel);
      setGameMode(activeRoom.gameMode);
      setJavaDifficulty(activeRoom.javaDifficulty);
      setAllowFriendsToInvite(activeRoom.allowFriendsToInvite);
    }
  }, [activeRoom, editingSettings]);

  // Load Friends & Online Explorers directory
  const refreshFriendsAndInvites = useCallback(async () => {
    if (!profile) return;
    try {
      const list = await fetchFriendsDirectory(profile.uid);
      setFriendsEntries(list);
    } catch {
      // Ignore transient network hiccup
    }
    if (activeRoom) {
      try {
        const invs = await fetchRoomInvitations({ roomId: activeRoom.id });
        setRoomInvites(invs);
      } catch {
        // Ignore
      }
    }
  }, [profile, activeRoom]);

  useEffect(() => {
    void refreshFriendsAndInvites();
  }, [refreshFriendsAndInvites, friendsRevision]);

  // Load Deep-Link Room Preview if arriving via /room/CODE and not already inside that room
  useEffect(() => {
    if (!previewRoomCode) {
      setPreviewRoom(null);
      setPreviewError(null);
      return;
    }
    if (activeRoom && activeRoom.roomCode === previewRoomCode) {
      setPreviewRoom(null);
      setPreviewRoomCode(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    void fetchRoomByCode(previewRoomCode)
      .then((r) => {
        if (!cancelled) setPreviewRoom(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(
            err instanceof Error ? err.message : `Room ${previewRoomCode} could not be found.`
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewRoomCode, activeRoom, setPreviewRoomCode]);

  const acceptedFriends = useMemo(
    () => friendsEntries.filter((f) => f.relation === 'friend'),
    [friendsEntries]
  );
  const incomingFriendRequests = useMemo(
    () => friendsEntries.filter((f) => f.relation === 'incoming_request'),
    [friendsEntries]
  );
  const discoverExplorers = useMemo(
    () => friendsEntries.filter((f) => f.relation === 'discover' || f.relation === 'outgoing_request'),
    [friendsEntries]
  );

  if (!profile) return null;

  const triggerCopyFeedback = async (
    kind: 'code' | 'link' | 'message',
    text: string,
    toastTitle: string
  ) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedField(kind);
      soundFX.playCoinCollect();
      pushToast({
        title: toastTitle,
        subtitle: kind === 'code' ? `Room code ${text} copied to clipboard.` : 'Ready to paste and share with friends!',
      });
      window.setTimeout(() => {
        setCopiedField((prev) => (prev === kind ? null : prev));
      }, 2400);
    }
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatingBusy(true);
    try {
      const created = await createPrivateRoom({
        hostUserId: profile.uid,
        hostUsername: profile.username,
        hostDisplayName: profile.displayName,
        hostAvatarId: profile.avatarId,
        roomName: roomName.trim() || `${profile.displayName}'s Java Squad`,
        maxPlayers,
        selectedLevel,
        gameMode,
        javaDifficulty,
        allowFriendsToInvite,
      });

      setActiveRoom(created);
      setJustCreatedCode(created.roomCode);
      setShowCreateForm(false);
      setShowShareDrawer(true);
      soundFX.playAchievementUnlock();

      // Dispatch direct invitations to any friends selected during room creation
      if (preselectedFriendIds.length > 0) {
        await Promise.allSettled(
          preselectedFriendIds.map((fid) =>
            sendDirectRoomInvite(created.roomCode, profile.uid, fid)
          )
        );
        setPreselectedFriendIds([]);
        const updatedInvs = await fetchRoomInvitations({ roomId: created.id }).catch(() => []);
        setRoomInvites(updatedInvs);
      }

      pushToast({
        title: `Room ${created.roomCode} Created!`,
        subtitle: 'Share your short code, invite link, or send direct friend invites.',
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setCreatingBusy(false);
    }
  };

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeRoomCode(joinCodeInput);
    if (cleaned.length < 4) {
      setJoinError('Please enter a valid 6-character room code (e.g., JAVA42).');
      return;
    }
    setJoinError(null);
    setJoiningBusy(true);
    try {
      await joinRoomByCodeAction(cleaned);
      setJoinCodeInput('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join room.');
    } finally {
      setJoiningBusy(false);
    }
  };

  const handleAddFriendByHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendHandleInput.trim().replace(/^@/, '');
    if (cleaned.length < 2) return;
    setFriendFeedback(null);
    try {
      const res = await sendFriendRequest({
        userId: profile.uid,
        targetUsername: cleaned,
      });
      setFriendHandleInput('');
      setFriendFeedback(
        res.status === 'accepted'
          ? `You and @${cleaned} are now CODELAND friends!`
          : `Friend request sent to @${cleaned}!`
      );
      bumpFriendsRevision();
    } catch (err) {
      setFriendFeedback(err instanceof Error ? err.message : 'Could not send friend request.');
    }
  };

  const handleDirectInviteFriend = async (friendUserId: string, friendUsername: string) => {
    if (!activeRoom) return;
    setInvitingUserId(friendUserId);
    setLobbyError(null);
    try {
      const inv = await sendDirectRoomInvite(activeRoom.roomCode, profile.uid, friendUserId);
      setRoomInvites((prev) => [inv, ...prev.filter((x) => x.id !== inv.id)]);
      soundFX.playCoinCollect();
      pushToast({
        title: `Invited @${friendUsername}`,
        subtitle: `Direct room invitation sent for Room ${activeRoom.roomCode}.`,
      });
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Could not send invitation.');
    } finally {
      setInvitingUserId(null);
    }
  };

  // ================= ACTIVE PRIVATE ROOM LOBBY VIEW =================
  if (
    activeRoom &&
    (activeRoom.roomStatus === 'waiting' || activeRoom.roomStatus === 'completed')
  ) {
    const isHost = activeRoom.hostUserId === profile.uid;
    const myMember = activeRoom.members.find((m) => m.userId === profile.uid);
    const canInviteFriends = isHost || activeRoom.allowFriendsToInvite;
    const roomCampaignLevel = getCampaignLevel(activeRoom.selectedLevel);
    const worldMeta = getCampaignWorldMeta(roomCampaignLevel.worldNumber);

    const inviteUrl = buildRoomInvitationUrl(activeRoom.roomCode, canonicalAppOrigin);
    const fullInviteText = buildFullInvitationMessage(activeRoom.roomCode, inviteUrl);
    const whatsappHref = buildWhatsAppShareHref(activeRoom.roomCode, inviteUrl);
    const smsHref = buildSmsShareHref(activeRoom.roomCode, inviteUrl);

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Room Created / Lobby Banner */}
        <section className="rounded-2xl border-2 border-[#2F7D46] dark:border-[#F5C451]/70 bg-white dark:bg-[#14261E] p-6 shadow-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-[#2F7D46] dark:text-[#F5C451] font-bold">
                {justCreatedCode === activeRoom.roomCode
                  ? 'ROOM CREATED! · PRIVATE LOBBY READY'
                  : `PRIVATE ROOM LOBBY · STATUS: ${activeRoom.roomStatus.toUpperCase()}`}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {activeRoom.roomName}
              </h1>
              <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-mono">
                Host: @{activeRoom.hostUsername} · Players: {activeRoom.members.length}/
                {activeRoom.maxPlayers} · Level {activeRoom.selectedLevel} ({worldMeta.name}) ·{' '}
                {formatModeLabel(activeRoom.gameMode)} · {activeRoom.javaDifficulty}
              </div>
            </div>

            {/* Prominent Short Room Code Display Box */}
            <div className="p-4 rounded-2xl border-2 border-[#F5C451] bg-[#102018] text-white flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
                  Room Code
                </div>
                <div className="font-display text-2xl sm:text-3xl tracking-widest text-[#F5C451] select-all">
                  {activeRoom.roomCode}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void triggerCopyFeedback('code', activeRoom.roomCode, 'Room Code Copied!')
                  }
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#3A9454] text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedField === 'code' ? (
                    <Check className="w-4 h-4 text-[#F5C451]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedField === 'code' ? 'COPIED!' : 'COPY CODE'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareDrawer((v) => !v)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#1F3A2D] hover:bg-[#284B3A] border border-emerald-700/70 text-emerald-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#69B9E7]" />
                  <span>SHARE INVITE</span>
                </button>
              </div>
            </div>
          </div>

          {/* Shareable Link, WhatsApp, SMS & Copy-Paste Suite */}
          {showShareDrawer && (
            <div className="p-4 sm:p-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#0F1D17] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-emerald-200">
                  Shareable Invitation Link &amp; Instant Messaging
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Opens CODELAND directly and preserves room invite across sign-in
                </div>
              </div>

              {/* Direct Real URL Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#14261E] font-mono text-xs text-stone-700 dark:text-emerald-200 truncate select-all">
                  {inviteUrl}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void triggerCopyFeedback('link', inviteUrl, 'Invitation Link Copied!')
                    }
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-[#1C352A] hover:bg-stone-300 dark:hover:bg-[#254638] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'link' ? (
                      <Check className="w-3.5 h-3.5 text-[#2F7D46] dark:text-[#F5C451]" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'link' ? 'Link Copied!' : 'Copy Invitation Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void triggerCopyFeedback(
                        'message',
                        fullInviteText,
                        'Full Invitation Message Copied!'
                      )
                    }
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-[#1C352A] hover:bg-stone-300 dark:hover:bg-[#254638] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'message' ? (
                      <Check className="w-3.5 h-3.5 text-[#2F7D46] dark:text-[#F5C451]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedField === 'message' ? 'Message Copied!' : 'Copy Full Message'}
                    </span>
                  </button>
                </div>
              </div>

              {/* WhatsApp & SMS Pre-filled Share Links (User presses send inside app) */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-[#0D1A12] inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </a>

                <a
                  href={smsHref}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#69B9E7] hover:bg-[#7ec5ee] text-[#0F1B15] inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Share via SMS</span>
                </a>

                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Opens your messaging app with a pre-filled invite—nothing is sent until you press
                  Send.
                </span>
              </div>
            </div>
          )}

          {lobbyError && (
            <div className="p-3 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100">
              {lobbyError}
            </div>
          )}

          {/* Primary Host & Guest Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {isHost ? (
                <>
                  <button
                    type="button"
                    disabled={lobbyActionBusy}
                    onClick={async () => {
                      setLobbyActionBusy(true);
                      setLobbyError(null);
                      try {
                        const updated = await startRoomMatch(activeRoom.roomCode, profile.uid);
                        setActiveRoom(updated);
                        setSection(AppSection.MULTIPLAYER_GAME);
                      } catch (err) {
                        setLobbyError(err instanceof Error ? err.message : 'Could not start match.');
                      } finally {
                        setLobbyActionBusy(false);
                      }
                    }}
                    className="px-6 py-3 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] disabled:opacity-60 text-[#202923] inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {activeRoom.roomStatus === 'completed' ? 'START REMATCH' : 'START GAME'}
                    </span>
                  </button>

                  {activeRoom.roomStatus === 'waiting' && (
                    <button
                      type="button"
                      onClick={() => setEditingSettings((v) => !v)}
                      className="px-4 py-3 rounded-xl text-xs font-bold border border-stone-300 dark:border-emerald-800 bg-stone-100 dark:bg-[#193126] hover:bg-stone-200 dark:hover:bg-[#224032] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4" />
                      <span>{editingSettings ? 'Hide Room Settings' : 'Change Room Settings'}</span>
                    </button>
                  )}

                  {activeRoom.roomStatus === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setSection(AppSection.MULTIPLAYER_GAME)}
                      className="px-4 py-3 rounded-xl text-xs font-bold border border-emerald-700 bg-[#1B3529] text-emerald-100 cursor-pointer"
                    >
                      View Match Results
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={lobbyActionBusy || activeRoom.roomStatus !== 'waiting'}
                  onClick={async () => {
                    setLobbyActionBusy(true);
                    try {
                      const updated = await toggleRoomReady(
                        activeRoom.roomCode,
                        profile.uid,
                        !myMember?.isReady
                      );
                      setActiveRoom(updated);
                      soundFX.playCoinCollect();
                    } catch (err) {
                      setLobbyError(err instanceof Error ? err.message : 'Could not update status.');
                    } finally {
                      setLobbyActionBusy(false);
                    }
                  }}
                  className={`px-6 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    myMember?.isReady
                      ? 'bg-[#2F7D46] text-white'
                      : 'bg-[#F5C451] text-[#202923]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{myMember?.isReady ? 'READY! (Click to Unready)' : 'MARK AS READY'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={lobbyActionBusy}
                onClick={async () => {
                  setLobbyActionBusy(true);
                  await leavePrivateRoom(activeRoom.roomCode, profile.uid).catch(() => {});
                  setActiveRoom(null);
                  setJustCreatedCode(null);
                  setLobbyActionBusy(false);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-stone-300 dark:border-emerald-900 bg-stone-100 dark:bg-[#162920] hover:bg-stone-200 dark:hover:bg-[#1E372B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Room</span>
              </button>

              {isHost && !confirmCloseRoom && (
                <button
                  type="button"
                  onClick={() => setConfirmCloseRoom(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#F28C45]/50 text-[#F28C45] hover:bg-[#F28C45]/10 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close Room</span>
                </button>
              )}

              {isHost && confirmCloseRoom && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await closePrivateRoom(activeRoom.roomCode, profile.uid).catch(() => {});
                      setActiveRoom(null);
                      setConfirmCloseRoom(false);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F28C45] text-[#0F1B15] cursor-pointer"
                  >
                    Confirm Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCloseRoom(false)}
                    className="px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Host Inline Room Settings Editor */}
          {isHost && editingSettings && activeRoom.roomStatus === 'waiting' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLobbyActionBusy(true);
                setLobbyError(null);
                try {
                  const updated = await updateRoomSettings(activeRoom.roomCode, {
                    userId: profile.uid,
                    roomName,
                    maxPlayers,
                    selectedLevel,
                    gameMode,
                    javaDifficulty,
                    allowFriendsToInvite,
                  });
                  setActiveRoom(updated);
                  setEditingSettings(false);
                  pushToast({
                    title: 'Room Settings Saved',
                    subtitle: `Updated configuration for Room ${updated.roomCode}.`,
                  });
                } catch (err) {
                  setLobbyError(err instanceof Error ? err.message : 'Failed to save settings.');
                } finally {
                  setLobbyActionBusy(false);
                }
              }}
              className="p-5 rounded-2xl border border-emerald-800/70 bg-stone-50 dark:bg-[#0E1A14] space-y-4"
            >
              <div className="text-sm font-bold">Update Room Configuration</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Room Name</label>
                  <input
                    type="text"
                    maxLength={42}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Max Players (2–6)</label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs"
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n} disabled={n < activeRoom.members.length}>
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Java Level (1–100)</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs"
                  >
                    {CAMPAIGN_WORLDS.map((w) => (
                      <optgroup
                        key={w.worldId}
                        label={`W${w.worldNumber}: ${w.name} (Lv.${w.levelRange[0]}–${w.levelRange[1]})`}
                      >
                        {getLevelsForWorld(w.worldNumber).map((lvl) => (
                          <option key={lvl.id} value={lvl.levelNumber}>
                            Level {lvl.levelNumber}: {lvl.whatPlayerLearns}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Game Mode</label>
                  <select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value as RoomGameMode)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs"
                  >
                    {GAME_MODE_INFO.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Java Difficulty</label>
                  <select
                    value={javaDifficulty}
                    onChange={(e) => setJavaDifficulty(e.target.value as ExerciseDifficulty)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#14261E] text-xs"
                  >
                    {(['Beginner', 'Intermediate', 'Advanced'] as ExerciseDifficulty[]).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowFriendsToInvite}
                      onChange={(e) => setAllowFriendsToInvite(e.target.checked)}
                      className="rounded accent-[#2F7D46]"
                    />
                    <span>Invited friends can invite others</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={lobbyActionBusy}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSettings(false)}
                  className="px-3 py-2 rounded-xl text-xs text-stone-500 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Bottom Lobby Columns: Player Roster + Direct Friend Invitations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Player Roster */}
          <section className="lg:col-span-7 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2F7D46] dark:text-[#F5C451]" />
                <span>
                  Lobby Players ({activeRoom.members.length} / {activeRoom.maxPlayers})
                </span>
              </h2>
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                360° Panoramic / AR Ready
              </span>
            </div>

            <div className="space-y-3">
              {activeRoom.members.map((member) => {
                const isMe = member.userId === profile.uid;
                return (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isMe
                        ? 'border-[#2F7D46] bg-[#2F7D46]/10 dark:bg-[#1B3629]'
                        : 'border-stone-200 dark:border-emerald-900/60 bg-stone-50 dark:bg-[#0F1D17]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <AvatarImage avatarId={member.avatarId} sizeClass="w-12 h-12" />
                        <span
                          className={`w-3 h-3 rounded-full border-2 border-[#14261E] absolute -bottom-0.5 -right-0.5 ${
                            member.online ? 'bg-emerald-400' : 'bg-stone-500'
                          }`}
                          title={member.online ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{member.displayName}</span>
                          {member.isHost && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#F5C451]">
                              <Crown className="w-3.5 h-3.5" />
                              <span>HOST</span>
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-300">
                              · You
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-stone-500 dark:text-stone-400 truncate">
                          @{member.username} · {member.online ? 'Connected Live' : 'Reconnecting'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-mono font-bold ${
                          member.isHost || member.isReady
                            ? 'text-[#2F7D46] dark:text-emerald-400'
                            : 'text-amber-600 dark:text-[#F5C451]'
                        }`}
                      >
                        {member.isHost ? 'HOST READY' : member.isReady ? 'READY' : 'NOT READY'}
                      </span>

                      {isHost && !member.isHost && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await kickRoomPlayer(
                                activeRoom.roomCode,
                                profile.uid,
                                member.userId
                              );
                              setActiveRoom(updated);
                            } catch (err) {
                              setLobbyError(
                                err instanceof Error ? err.message : 'Could not remove player.'
                              );
                            }
                          }}
                          className="p-2 rounded-lg text-stone-400 hover:text-[#F28C45] hover:bg-[#F28C45]/10 transition-colors cursor-pointer"
                          title={`Remove ${member.displayName}`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Direct Friend Invitations Panel */}
          <section className="lg:col-span-5 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#69B9E7]" />
                <span>Direct Friend Invites</span>
              </h2>
              <button
                type="button"
                onClick={() => void refreshFriendsAndInvites()}
                className="p-1.5 rounded-lg text-stone-500 hover:text-white cursor-pointer"
                title="Refresh Friends & Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!canInviteFriends ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Only the host (@{activeRoom.hostUsername}) has direct invitation permissions in this
                room.
              </p>
            ) : acceptedFriends.length === 0 && discoverExplorers.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#0F1D17] border border-stone-200 dark:border-emerald-950 text-xs text-stone-500 dark:text-stone-400 space-y-2">
                <p>
                  No other CODELAND explorers are in your Friends list yet. Share your short code{' '}
                  <strong className="font-mono text-[#2F7D46] dark:text-[#F5C451]">
                    {activeRoom.roomCode}
                  </strong>{' '}
                  or link above so a friend can open CODELAND and connect!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {[...acceptedFriends, ...discoverExplorers].map((person) => {
                  const alreadyInRoom = activeRoom.members.some(
                    (m) => m.userId === person.userId
                  );
                  const latestInv = roomInvites.find(
                    (inv) => inv.recipientUserId === person.userId
                  );
                  const hasPending = latestInv?.invitationStatus === 'pending';

                  return (
                    <div
                      key={person.userId}
                      className="p-3 rounded-xl border border-stone-200 dark:border-emerald-900/60 bg-stone-50 dark:bg-[#0F1D17] flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <AvatarImage avatarId={person.avatarId} sizeClass="w-9 h-9" />
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-[#0F1D17] absolute -bottom-0.5 -right-0.5 ${
                              person.online ? 'bg-emerald-400' : 'bg-stone-500'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{person.displayName}</div>
                          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
                            @{person.username} · {person.online ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {alreadyInRoom ? (
                          <span className="text-[11px] font-mono font-bold text-[#2F7D46] dark:text-emerald-400">
                            In Lobby
                          </span>
                        ) : hasPending ? (
                          <span className="text-[11px] font-mono font-bold text-[#F5C451]">
                            Pending
                          </span>
                        ) : (
                          <>
                            {latestInv && (
                              <span className="text-[10px] font-mono text-stone-400 capitalize">
                                {latestInv.invitationStatus}
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={invitingUserId === person.userId}
                              onClick={() =>
                                void handleDirectInviteFriend(person.userId, person.username)
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2F7D46] hover:bg-[#3A9454] disabled:opacity-60 text-white cursor-pointer"
                            >
                              {invitingUserId === person.userId ? 'Sending...' : 'Invite'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ================= MULTIPLAYER HUB & ROOM CREATION SCREEN =================
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-widest text-[#2F7D46] dark:text-[#F5C451]">
            360° Panoramic &amp; AR Multiplayer
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Private Coding Rooms &amp; Direct Invites
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-2xl">
            Create a private room, share a 6-character code or real link via WhatsApp &amp; SMS, or
            invite CODELAND friends directly into a live 360° Java coding arena.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="px-6 py-3.5 rounded-xl text-sm font-extrabold tracking-wide bg-[#2F7D46] hover:bg-[#3A9454] text-white inline-flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'BACK TO MULTIPLAYER HUB' : 'CREATE PRIVATE ROOM'}</span>
        </button>
      </div>

      {/* Deep-Link Invitation Room Preview Card (/room/JAVA42) */}
      {previewRoomCode && (
        <section className="rounded-2xl border-2 border-[#F5C451] bg-[#15281F] text-white p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Invitation Link Preview · Room {previewRoomCode}</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewRoomCode(null)}
              className="text-xs text-stone-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {previewLoading ? (
            <div className="text-sm font-mono text-stone-300">
              Checking Room {previewRoomCode}...
            </div>
          ) : previewError ? (
            <div className="p-3.5 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100">
              {previewError}
            </div>
          ) : previewRoom ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{previewRoom.roomName}</h2>
                <div className="text-xs font-mono text-emerald-200">
                  Host: @{previewRoom.hostUsername} · Level {previewRoom.selectedLevel} ·{' '}
                  {formatModeLabel(previewRoom.gameMode)} · {previewRoom.javaDifficulty} · Players:{' '}
                  {previewRoom.members.length}/{previewRoom.maxPlayers} · Status:{' '}
                  {previewRoom.roomStatus}
                </div>
              </div>

              {previewRoom.roomStatus === 'waiting' &&
              previewRoom.members.length < previewRoom.maxPlayers ? (
                <button
                  type="button"
                  disabled={joiningBusy}
                  onClick={async () => {
                    setJoiningBusy(true);
                    setPreviewError(null);
                    try {
                      await joinRoomByCodeAction(previewRoom.roomCode);
                    } catch (err) {
                      setPreviewError(
                        err instanceof Error ? err.message : 'Unable to join room.'
                      );
                    } finally {
                      setJoiningBusy(false);
                    }
                  }}
                  className="px-6 py-3 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] cursor-pointer shrink-0"
                >
                  {joiningBusy ? 'JOINING...' : `JOIN ROOM ${previewRoom.roomCode}`}
                </button>
              ) : (
                <div className="text-xs font-mono text-[#F28C45]">
                  {previewRoom.roomStatus !== 'waiting'
                    ? `Cannot join (${previewRoom.roomStatus.replace('_', ' ')})`
                    : 'Room is currently full'}
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Room Creation Screen */}
      {showCreateForm ? (
        <form
          onSubmit={(e) => void handleCreateRoomSubmit(e)}
          className="rounded-2xl border border-stone-300/80 dark:border-emerald-800/80 bg-white dark:bg-[#14261E] p-6 sm:p-8 space-y-6 shadow-lg"
        >
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-widest text-[#2F7D46] dark:text-[#F5C451]">
              Step 1 · Configure Private Session
            </div>
            <h2 className="text-2xl font-extrabold">Create Private Coding Room</h2>
          </div>

          {createError && (
            <div className="p-3.5 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="room-name-input" className="block text-xs font-bold">
                Room Name
              </label>
              <input
                id="room-name-input"
                type="text"
                maxLength={42}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Forest Java Sprint"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0E1B15] text-sm focus:outline-none focus:border-[#F5C451]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="room-max-players" className="block text-xs font-bold">
                Maximum Players
              </label>
              <select
                id="room-max-players"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0E1B15] text-sm focus:outline-none focus:border-[#F5C451]"
              >
                {[2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} Players
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="room-level-select" className="block text-xs font-bold">
                Selected Game Level (1–100)
              </label>
              <select
                id="room-level-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0E1B15] text-sm focus:outline-none focus:border-[#F5C451]"
              >
                {CAMPAIGN_WORLDS.map((w) => (
                  <optgroup
                    key={w.worldId}
                    label={`World ${w.worldNumber}: ${w.name} (Levels ${w.levelRange[0]}–${w.levelRange[1]})`}
                  >
                    {getLevelsForWorld(w.worldNumber).map((lvl) => (
                      <option key={lvl.id} value={lvl.levelNumber}>
                        Level {lvl.levelNumber}: {lvl.whatPlayerLearns}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Game Mode Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold">Select Game Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {GAME_MODE_INFO.map((m) => {
                const selected = gameMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGameMode(m.id)}
                    className={`p-4 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#F5C451] bg-amber-50/60 dark:bg-[#1D3529] shadow-sm'
                        : 'border-stone-200 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#0E1B15]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{m.title}</span>
                      {selected && <Check className="w-4 h-4 text-[#2F7D46] dark:text-[#F5C451]" />}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      {m.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Java Difficulty & Invite Permission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            <div className="space-y-2">
              <label className="block text-xs font-bold">Java Challenge Difficulty</label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['Beginner', 'Intermediate', 'Advanced'] as ExerciseDifficulty[]).map((diff) => {
                  const active = javaDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setJavaDifficulty(diff)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        active
                          ? 'border-[#2F7D46] bg-[#2F7D46] text-white'
                          : 'border-stone-300 dark:border-emerald-900 bg-stone-50 dark:bg-[#0E1B15]'
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#0E1B15]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowFriendsToInvite}
                  onChange={(e) => setAllowFriendsToInvite(e.target.checked)}
                  className="mt-1 rounded accent-[#2F7D46]"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold">Allow invited friends to invite others</div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    When enabled, friends who join your lobby can also send direct invites to their
                    friends.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Friends List Pre-Selection During Room Creation */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold">
                Invite CODELAND Friends Immediately (Optional)
              </label>
              <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                {preselectedFriendIds.length} selected
              </span>
            </div>

            {acceptedFriends.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#0E1B15] text-xs text-stone-500 dark:text-stone-400">
                No accepted friends yet—you can add friends in the Friends panel or share your room
                code &amp; WhatsApp/SMS link right after creating the room!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {acceptedFriends.map((friend) => {
                  const chosen = preselectedFriendIds.includes(friend.userId);
                  return (
                    <button
                      key={friend.userId}
                      type="button"
                      onClick={() =>
                        setPreselectedFriendIds((prev) =>
                          prev.includes(friend.userId)
                            ? prev.filter((id) => id !== friend.userId)
                            : [...prev, friend.userId]
                        )
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-left cursor-pointer ${
                        chosen
                          ? 'border-[#F5C451] bg-[#1B3529]'
                          : 'border-stone-200 dark:border-emerald-900/60 bg-stone-50 dark:bg-[#0E1B15]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarImage avatarId={friend.avatarId} sizeClass="w-9 h-9" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{friend.displayName}</div>
                          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
                            @{friend.username} · {friend.online ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#2F7D46] dark:text-[#F5C451]">
                        {chosen ? 'Invited ✓' : '+ Invite'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingBusy}
              className="px-6 py-3 rounded-xl text-sm font-extrabold bg-[#2F7D46] hover:bg-[#3A9454] disabled:opacity-60 text-white inline-flex items-center gap-2 shadow-md cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#F5C451]" />
              <span>{creatingBusy ? 'GENERATING ROOM CODE...' : 'CREATE PRIVATE ROOM'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Main Hub Grid: Join by Code + Modes Info + Friends Directory */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Join Private Room by Code + 360° Arena Overview */}
          <div className="lg:col-span-5 space-y-6">
            {/* Join Private Room Card */}
            <section className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-4 shadow-sm">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-[#F5C451] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>Have a Friend&apos;s Code?</span>
                </div>
                <h2 className="text-xl font-bold">JOIN PRIVATE ROOM</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Enter the 6-character code shared by your friend (for example,{' '}
                  <span className="font-mono font-semibold">JAVA42</span>).
                </p>
              </div>

              <form onSubmit={(e) => void handleJoinByCodeSubmit(e)} className="space-y-3">
                <input
                  type="text"
                  maxLength={8}
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(normalizeRoomCode(e.target.value));
                    if (joinError) setJoinError(null);
                  }}
                  placeholder="Enter your room code"
                  aria-label="Enter your room code"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0E1B15] font-display text-lg tracking-widest uppercase text-center focus:outline-none focus:border-[#F5C451]"
                />
                <button
                  type="submit"
                  disabled={joiningBusy}
                  className="w-full py-3 px-5 rounded-xl text-sm font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] disabled:opacity-60 text-[#202923] transition-colors cursor-pointer"
                >
                  {joiningBusy ? 'VALIDATING ROOM...' : 'JOIN'}
                </button>
              </form>

              {joinError && (
                <div className="p-3 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100">
                  {joinError}
                </div>
              )}
            </section>

            {/* 360° Panoramic & AR Modes Card */}
            <section className="rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Compass className="w-4 h-4 text-[#69B9E7]" />
                <span>360° Panoramic &amp; Camera AR Modes</span>
              </div>
              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {GAME_MODE_INFO.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-[#0F1D17] border border-stone-200 dark:border-emerald-950 space-y-1"
                  >
                    <div className="font-bold text-stone-900 dark:text-white">{m.title}</div>
                    <p>{m.tagline}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: CODELAND Friends & Live Online Explorers */}
          <section className="lg:col-span-7 rounded-2xl border border-stone-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#14261E] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2F7D46] dark:text-[#F5C451]" />
                  <span>CODELAND Friends &amp; Online Explorers</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Add friends by @username or connect with live explorers to send 1-click room
                  invites.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshFriendsAndInvites()}
                className="p-2 rounded-lg bg-stone-100 dark:bg-[#193025] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Add Friend by Handle */}
            <form onSubmit={(e) => void handleAddFriendByHandle(e)} className="flex gap-2">
              <input
                type="text"
                maxLength={24}
                value={friendHandleInput}
                onChange={(e) => setFriendHandleInput(e.target.value)}
                placeholder="Add friend by @username"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#0E1B15] text-xs font-mono focus:outline-none focus:border-[#F5C451]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#3A9454] text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </button>
            </form>

            {friendFeedback && (
              <div className="text-xs font-medium text-[#2F7D46] dark:text-[#F5C451]">
                {friendFeedback}
              </div>
            )}

            {/* Incoming Friend Requests */}
            {incomingFriendRequests.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-[#F5C451]">
                  Incoming Friend Requests ({incomingFriendRequests.length})
                </div>
                {incomingFriendRequests.map((req) => (
                  <div
                    key={req.userId}
                    className="p-3 rounded-xl border border-[#F5C451]/60 bg-amber-50/40 dark:bg-[#1A3126] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <AvatarImage avatarId={req.avatarId} sizeClass="w-9 h-9" />
                      <div>
                        <div className="text-xs font-bold">{req.displayName}</div>
                        <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                          @{req.username}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await respondFriendRequest({
                            userId: profile.uid,
                            otherUserId: req.userId,
                            accept: true,
                          });
                          bumpFriendsRevision();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await respondFriendRequest({
                            userId: profile.uid,
                            otherUserId: req.userId,
                            accept: false,
                          });
                          bumpFriendsRevision();
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Friends List */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Your Friends ({acceptedFriends.length})
              </div>
              {acceptedFriends.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400 py-2">
                  No friends added yet. Connect with active explorers below or create a room and
                  share your link!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {acceptedFriends.map((friend) => (
                    <div
                      key={friend.userId}
                      className="p-3 rounded-xl border border-stone-200 dark:border-emerald-900/60 bg-stone-50 dark:bg-[#0F1D17] flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <AvatarImage avatarId={friend.avatarId} sizeClass="w-10 h-10" />
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-[#0F1D17] absolute -bottom-0.5 -right-0.5 ${
                              friend.online ? 'bg-emerald-400' : 'bg-stone-500'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{friend.displayName}</div>
                          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
                            @{friend.username} · {friend.online ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#2F7D46] dark:text-[#F5C451] shrink-0">
                        {friend.totalXp} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active / Registered Explorers to Connect With */}
            {discoverExplorers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-emerald-950">
                <div className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Discover CODELAND Explorers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {discoverExplorers.slice(0, 12).map((exp) => (
                    <div
                      key={exp.userId}
                      className="p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#0F1D17] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <AvatarImage avatarId={exp.avatarId} sizeClass="w-8 h-8" />
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-[#0F1D17] absolute -bottom-0.5 -right-0.5 ${
                              exp.online ? 'bg-emerald-400' : 'bg-stone-500'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{exp.displayName}</div>
                          <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400 truncate">
                            @{exp.username}
                          </div>
                        </div>
                      </div>

                      {exp.relation === 'outgoing_request' ? (
                        <span className="text-[11px] font-mono text-[#F5C451]">Requested</span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await sendFriendRequest({
                              userId: profile.uid,
                              targetUserId: exp.userId,
                            });
                            bumpFriendsRevision();
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-200 dark:bg-[#1B3429] hover:bg-[#2F7D46] hover:text-white transition-colors cursor-pointer"
                        >
                          + Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
