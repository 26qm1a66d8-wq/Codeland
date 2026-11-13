import {
  ExerciseDifficulty,
  FriendEntry,
  GameRoom,
  RoomGameMode,
  RoomInvitation,
  UserStreakRecord,
} from '../types/codeland';

const PENDING_ROOM_STORAGE_KEY = 'codeland_pending_room_code_v1';

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function extractRoomCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const pathMatch = window.location.pathname.match(/^\/room\/([a-zA-Z0-9_-]{4,10})\/?$/);
  if (pathMatch && pathMatch[1]) {
    return normalizeRoomCode(pathMatch[1]);
  }
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get('room');
  if (queryRoom) {
    const cleaned = normalizeRoomCode(queryRoom);
    if (cleaned.length >= 4) return cleaned;
  }
  return null;
}

export function savePendingInviteRoomCode(code: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (code) {
      sessionStorage.setItem(PENDING_ROOM_STORAGE_KEY, normalizeRoomCode(code));
    } else {
      sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY);
    }
  } catch {
    // Ignore restricted sessionStorage
  }
}

export function loadPendingInviteRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(PENDING_ROOM_STORAGE_KEY);
    return val ? normalizeRoomCode(val) : null;
  } catch {
    return null;
  }
}

let cachedAppOrigin: string | null = null;

export async function resolveCanonicalAppOrigin(): Promise<string> {
  if (cachedAppOrigin) return cachedAppOrigin;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = (await res.json()) as { appOrigin?: string };
      if (data.appOrigin && data.appOrigin.startsWith('http')) {
        cachedAppOrigin = data.appOrigin.replace(/\/+$/, '');
        return cachedAppOrigin;
      }
    }
  } catch {
    // Fallback to current window origin
  }
  if (typeof window !== 'undefined') {
    cachedAppOrigin = window.location.origin.replace(/\/+$/, '');
    return cachedAppOrigin;
  }
  return '';
}

export function buildRoomInvitationUrl(roomCode: string, appOrigin?: string): string {
  const origin = (
    appOrigin ||
    cachedAppOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '');
  return `${origin}/room/${normalizeRoomCode(roomCode)}`;
}

export function buildFullInvitationMessage(roomCode: string, inviteUrl: string): string {
  const cleanCode = normalizeRoomCode(roomCode);
  return [
    `Hey! I'm playing CODELAND. Join my private coding game!`,
    ``,
    `Room Code: ${cleanCode}`,
    ``,
    `Join here: ${inviteUrl}`,
    ``,
    `Let's see who can master Java faster!`,
  ].join('\n');
}

export function buildWhatsAppShareHref(roomCode: string, inviteUrl: string): string {
  const message = buildFullInvitationMessage(roomCode, inviteUrl);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildSmsShareHref(roomCode: string, inviteUrl: string): string {
  const cleanCode = normalizeRoomCode(roomCode);
  const smsBody = `Join my private CODELAND Java game! Room Code: ${cleanCode} — Open here: ${inviteUrl}`;
  const isAppleMobile =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const separator = isAppleMobile ? '?&body=' : '?body=';
  return `sms:${separator}${encodeURIComponent(smsBody)}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for iframe clipboard policies
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg =
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return data as T;
}

// ================= STREAK API =================

export async function syncServerDailyStreak(params: {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  totalXp: number;
  localDateKey: string;
  activityType:
    | 'daily_login'
    | 'lesson'
    | 'exercise'
    | 'assessment'
    | 'mission'
    | 'multiplayer_match';
  currentStreak: number;
  longestStreak: number;
}): Promise<{ streak: UserStreakRecord; recordedNewDay: boolean }> {
  return apiJson('/api/streaks/sync', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ================= FRIENDS API =================

export async function fetchFriendsDirectory(userId: string): Promise<FriendEntry[]> {
  const res = await apiJson<{ entries: FriendEntry[] }>(
    `/api/friends?userId=${encodeURIComponent(userId)}`
  );
  return res.entries;
}

export async function sendFriendRequest(params: {
  userId: string;
  targetUserId?: string;
  targetUsername?: string;
}): Promise<{ status: string }> {
  return apiJson('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function respondFriendRequest(params: {
  userId: string;
  otherUserId: string;
  accept: boolean;
}): Promise<{ ok: boolean }> {
  return apiJson('/api/friends/respond', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ================= ROOMS & INVITATIONS API =================

export async function createPrivateRoom(params: {
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatarId: string;
  roomName: string;
  maxPlayers: number;
  selectedLevel: number;
  gameMode: RoomGameMode;
  javaDifficulty: ExerciseDifficulty;
  allowFriendsToInvite: boolean;
}): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.room;
}

export async function fetchRoomByCode(roomCode: string): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>(
    `/api/rooms/by-code/${encodeURIComponent(normalizeRoomCode(roomCode))}`
  );
  return res.room;
}

export async function fetchActiveRoomForUser(userId: string): Promise<GameRoom | null> {
  const res = await apiJson<{ room: GameRoom | null }>(
    `/api/rooms/active-for-user/${encodeURIComponent(userId)}`
  );
  return res.room;
}

export async function joinPrivateRoom(
  roomCode: string,
  player: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
  }
): Promise<{ room: GameRoom; rejoined: boolean }> {
  return apiJson(`/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/join`, {
    method: 'POST',
    body: JSON.stringify(player),
  });
}

export async function toggleRoomReady(
  roomCode: string,
  userId: string,
  isReady?: boolean
): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>(
    `/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/ready`,
    {
      method: 'POST',
      body: JSON.stringify({ userId, isReady }),
    }
  );
  return res.room;
}

export async function updateRoomSettings(
  roomCode: string,
  params: {
    userId: string;
    roomName?: string;
    maxPlayers?: number;
    selectedLevel?: number;
    gameMode?: RoomGameMode;
    javaDifficulty?: ExerciseDifficulty;
    allowFriendsToInvite?: boolean;
  }
): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>(
    `/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/settings`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  return res.room;
}

export async function kickRoomPlayer(
  roomCode: string,
  hostUserId: string,
  targetUserId: string
): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>(
    `/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/kick`,
    {
      method: 'POST',
      body: JSON.stringify({ hostUserId, targetUserId }),
    }
  );
  return res.room;
}

export async function leavePrivateRoom(roomCode: string, userId: string): Promise<void> {
  await apiJson(`/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/leave`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function closePrivateRoom(roomCode: string, userId: string): Promise<void> {
  await apiJson(`/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/close`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function startRoomMatch(roomCode: string, userId: string): Promise<GameRoom> {
  const res = await apiJson<{ room: GameRoom }>(
    `/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/start`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
  return res.room;
}

export async function solveRoomChallengeNode(
  roomCode: string,
  params: {
    userId: string;
    nodeId: string;
    selectedOptionIndex: number;
    scanStepsTaken: number;
  }
): Promise<{
  correct: boolean;
  pointsEarned?: number;
  explanation: string;
  room: GameRoom;
}> {
  return apiJson(`/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/solve-node`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchRoomInvitations(params: {
  userId?: string;
  roomId?: string;
}): Promise<RoomInvitation[]> {
  const search = new URLSearchParams();
  if (params.userId) search.set('userId', params.userId);
  if (params.roomId) search.set('roomId', params.roomId);
  const res = await apiJson<{ invitations: RoomInvitation[] }>(
    `/api/invitations?${search.toString()}`
  );
  return res.invitations;
}

export async function sendDirectRoomInvite(
  roomCode: string,
  senderUserId: string,
  recipientUserId: string
): Promise<RoomInvitation> {
  const res = await apiJson<{ invitation: RoomInvitation }>(
    `/api/rooms/${encodeURIComponent(normalizeRoomCode(roomCode))}/invite`,
    {
      method: 'POST',
      body: JSON.stringify({ senderUserId, recipientUserId }),
    }
  );
  return res.invitation;
}

export async function respondToRoomInvite(
  inviteId: string,
  userId: string,
  decision: 'accepted' | 'declined'
): Promise<RoomInvitation> {
  const res = await apiJson<{ invitation: RoomInvitation }>(
    `/api/invitations/${encodeURIComponent(inviteId)}/respond`,
    {
      method: 'POST',
      body: JSON.stringify({ userId, decision }),
    }
  );
  return res.invitation;
}

// ================= REAL-TIME WEBSOCKET HUB CLIENT =================

export type RealtimeServerEvent =
  | { type: 'room:updated'; room: GameRoom }
  | { type: 'room:kicked'; roomCode: string; roomName: string }
  | { type: 'player:pose'; roomCode: string; userId: string; yawDeg: number; pitchDeg: number }
  | { type: 'invite:init'; invitations: RoomInvitation[] }
  | { type: 'invite:received'; invitation: RoomInvitation }
  | { type: 'invite:updated'; invitation: RoomInvitation }
  | { type: 'presence:updated'; onlineUserIds: string[] }
  | { type: 'friend:updated' }
  | { type: 'pong' };

export class CodelandSocketConnection {
  private ws: WebSocket | null = null;
  private disposed = false;
  private reconnectDelayMs = 1000;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private identity: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
    totalXp: number;
    currentStreak: number;
  } | null = null;
  private watchedRoomCode: string | null = null;
  private lastPoseSentAt = 0;
  private onEvent: (ev: RealtimeServerEvent) => void;
  private onReconnectSync?: () => void;

  constructor(
    onEvent: (ev: RealtimeServerEvent) => void,
    onReconnectSync?: () => void
  ) {
    this.onEvent = onEvent;
    this.onReconnectSync = onReconnectSync;
    this.connect();
  }

  private connect() {
    if (this.disposed || typeof window === 'undefined') return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/ws`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectDelayMs = 1000;
        if (this.identity) {
          this.sendRaw({ type: 'auth:identify', ...this.identity });
        }
        if (this.watchedRoomCode) {
          this.sendRaw({ type: 'room:watch', roomCode: this.watchedRoomCode });
        }
        this.onReconnectSync?.();

        if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = window.setInterval(() => {
          this.sendRaw({ type: 'ping' });
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as RealtimeServerEvent;
          if (parsed && typeof parsed.type === 'string') {
            this.onEvent(parsed);
          }
        } catch {
          // Ignore malformed message
        }
      };

      socket.onclose = () => {
        if (this.heartbeatTimer) {
          window.clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        if (!this.disposed) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectDelayMs = Math.min(8000, this.reconnectDelayMs * 1.8);
            this.connect();
          }, this.reconnectDelayMs);
        }
      };

      socket.onerror = () => {
        // Handled by onclose auto-reconnect
      };
    } catch {
      if (!this.disposed) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 2500);
      }
    }
  }

  private sendRaw(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public identify(identity: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
    totalXp: number;
    currentStreak: number;
  }) {
    this.identity = identity;
    this.sendRaw({ type: 'auth:identify', ...identity });
  }

  public watchRoom(roomCode: string | null) {
    const clean = roomCode ? normalizeRoomCode(roomCode) : null;
    this.watchedRoomCode = clean;
    this.sendRaw({ type: 'room:watch', roomCode: clean || '' });
  }

  public sendPlayerPoseThrottled(roomCode: string, yawDeg: number, pitchDeg: number) {
    const now = performance.now();
    if (now - this.lastPoseSentAt < 80) return;
    this.lastPoseSentAt = now;
    this.sendRaw({
      type: 'player:pose',
      roomCode: normalizeRoomCode(roomCode),
      yawDeg: Math.round(yawDeg * 10) / 10,
      pitchDeg: Math.round(pitchDeg * 10) / 10,
    });
  }

  public dispose() {
    this.disposed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
