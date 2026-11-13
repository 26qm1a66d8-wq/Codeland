import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ROOM_TTL_MS = 60 * 60 * 1000; // 60 minutes inactivity expiry
const INVITE_TTL_MS = 30 * 60 * 1000; // 30 minutes invite expiry
const COUNTDOWN_DURATION_MS = 3500;

type RoomGameMode = 'coding_race' | 'coop_adventure' | 'challenge_mode';
type RoomStatus = 'waiting' | 'starting' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
type JavaDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type StreakActivityKind =
  | 'daily_login'
  | 'lesson'
  | 'exercise'
  | 'assessment'
  | 'mission'
  | 'multiplayer_match';

interface ServerUserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalActiveDays: number;
  activityDates: string[];
  updatedAt: string;
}

interface ServerStreakActivity {
  id: string;
  userId: string;
  activityDate: string;
  activityType: StreakActivityKind;
  createdAt: string;
}

interface ServerPlayerRecord {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  totalXp: number;
  currentStreak: number;
  lastSeenAt: string;
}

interface ServerFriendship {
  id: string;
  userA: string;
  userB: string;
  requesterId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  updatedAt: string;
}

interface ServerChallengeNode {
  id: string;
  index: number;
  bearingDeg: number;
  elevationDeg: number;
  title: string;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  gridRouteTargetSteps: number;
  accentHex: string;
  solvedByUserIds: string[];
}

interface ServerRoomMatchState {
  startedAtIso: string;
  countdownEndsAtMs: number;
  completedAtIso?: string;
  winnerUserId?: string;
  winnerDisplayName?: string;
  sharedCoreEnergy: number;
  targetCoreEnergy: number;
  nodes: ServerChallengeNode[];
}

interface ServerRoomMember {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
  score: number;
  solvedNodeIds: string[];
  wrongAttempts: number;
  routeEfficiencyBonus: number;
  yawDeg: number;
  pitchDeg: number;
  completedAtIso?: string;
}

interface ServerGameRoom {
  id: string;
  roomCode: string;
  roomName: string;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string;
  maxPlayers: number;
  gameMode: RoomGameMode;
  selectedLevel: number;
  javaDifficulty: JavaDifficulty;
  allowFriendsToInvite: boolean;
  roomStatus: RoomStatus;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  matchState?: ServerRoomMatchState;
}

interface ServerRoomInvitation {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  gameMode: RoomGameMode;
  selectedLevel: number;
  senderUserId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarId: string;
  recipientUserId: string;
  recipientUsername: string;
  invitationStatus: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  userStreaks: Record<string, ServerUserStreak>;
  streakActivities: Record<string, ServerStreakActivity>;
  playersDirectory: Record<string, ServerPlayerRecord>;
  friendships: Record<string, ServerFriendship>;
  gameRooms: Record<string, ServerGameRoom>;
  roomMembers: Record<string, ServerRoomMember>;
  roomInvitations: Record<string, ServerRoomInvitation>;
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'codeland_state.json');

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      return {
        userStreaks: parsed.userStreaks || {},
        streakActivities: parsed.streakActivities || {},
        playersDirectory: parsed.playersDirectory || {},
        friendships: parsed.friendships || {},
        gameRooms: parsed.gameRooms || {},
        roomMembers: parsed.roomMembers || {},
        roomInvitations: parsed.roomInvitations || {},
      };
    }
  } catch (err) {
    console.error('Failed to read codeland_state.json, initializing clean state:', err);
  }
  return {
    userStreaks: {},
    streakActivities: {},
    playersDirectory: {},
    friendships: {},
    gameRooms: {},
    roomMembers: {},
    roomInvitations: {},
  };
}

const db: DatabaseSchema = loadDatabase();
let saveTimer: NodeJS.Timeout | null = null;

function scheduleSaveDatabase() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist codeland_state.json:', err);
    }
  }, 150);
}

// Safe unambiguous room code alphabet (strictly excludes O, 0, I, 1, L)
const SAFE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const READABLE_PREFIXES = [
  'JAVA',
  'BYTE',
  'CAST',
  'CUBE',
  'SYNC',
  'HEAP',
  'DATA',
  'MATH',
  'PATH',
  'RANK',
];

function generateUniqueRoomCode(): string {
  const existingCodes = new Set(
    Object.values(db.gameRooms)
      .filter((r) => r.roomStatus !== 'expired' && r.roomStatus !== 'cancelled')
      .map((r) => r.roomCode)
  );

  for (let attempt = 0; attempt < 40; attempt++) {
    const prefix = READABLE_PREFIXES[crypto.randomInt(0, READABLE_PREFIXES.length)];
    const c1 = SAFE_CODE_CHARS[crypto.randomInt(0, SAFE_CODE_CHARS.length)];
    const c2 = SAFE_CODE_CHARS[crypto.randomInt(0, SAFE_CODE_CHARS.length)];
    const candidate = `${prefix}${c1}${c2}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  while (true) {
    let fallback = '';
    for (let i = 0; i < 6; i++) {
      fallback += SAFE_CODE_CHARS[crypto.randomInt(0, SAFE_CODE_CHARS.length)];
    }
    if (!existingCodes.has(fallback)) {
      return fallback;
    }
  }
}

function sanitizeId(raw: unknown, maxLen = 128): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
}

function sanitizeDisplayText(raw: unknown, maxLen = 48): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

function isValidDateKey(val: unknown): val is string {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const py = prev.getUTCFullYear();
  const pm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(prev.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

// Curated Java Multiplayer Challenge Bank across Levels 1..6
interface ChallengeTemplate {
  level: number;
  difficulty: JavaDifficulty;
  title: string;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

const CHALLENGE_BANK: ChallengeTemplate[] = [
  // Level 1: Java Basics & Output
  {
    level: 1,
    difficulty: 'Beginner',
    title: 'Forest Signal Syntax',
    prompt: 'Which Java statement prints "Portal Ready" followed by a newline?',
    options: [
      'System.out.println("Portal Ready");',
      'system.out.println("Portal Ready");',
      'Console.log("Portal Ready");',
      'System.out.println(Portal Ready);',
    ],
    correctOptionIndex: 0,
    explanation: 'Java uses capital S in System.out.println("...") and requires double quotes + semicolon.',
  },
  {
    level: 1,
    difficulty: 'Beginner',
    title: 'Entry Point Method',
    prompt: 'Every standalone Java application begins execution inside which method signature?',
    options: [
      'public void start()',
      'public static void main(String[] args)',
      'static int main()',
      'function main(args)',
    ],
    correctOptionIndex: 1,
    explanation: 'The JVM searches for public static void main(String[] args) as the program entry point.',
  },
  {
    level: 1,
    difficulty: 'Intermediate',
    title: 'Arithmetic vs String Concatenation',
    prompt: 'What does this Java line output to the console?',
    codeSnippet: 'System.out.println("Beacon " + (4 + 6));',
    options: ['Beacon 46', 'Beacon 10', 'Beacon (4 + 6)', 'Compilation Error'],
    correctOptionIndex: 1,
    explanation: 'Parentheses force (4 + 6) to evaluate to 10 before concatenating with "Beacon ".',
  },
  {
    level: 1,
    difficulty: 'Intermediate',
    title: 'print vs println',
    prompt: 'What exact single line is printed by these two statements?',
    codeSnippet: 'System.out.print("JA");\nSystem.out.println("VA");',
    options: ['JA\\nVA', 'JAVA', 'JA VA', 'VAJA'],
    correctOptionIndex: 1,
    explanation: 'print() stays on the same line, so "VA" prints immediately after "JA".',
  },
  {
    level: 1,
    difficulty: 'Advanced',
    title: 'Left-to-Right Evaluation',
    prompt: 'Predict the exact output of this Java expression:',
    codeSnippet: 'System.out.println(3 + 5 + "XP" + 2 + 1);',
    options: ['8XP3', '8XP21', '35XP21', '11XP'],
    correctOptionIndex: 1,
    explanation: '3 + 5 adds to 8 first, then + "XP" produces "8XP", turning subsequent + into String concatenation ("8XP21").',
  },

  // Level 2: Variables & Data Types
  {
    level: 2,
    difficulty: 'Beginner',
    title: 'Decimal Storage Box',
    prompt: 'Which Java declaration accurately stores a bridge length of 14.5 meters?',
    options: [
      'int length = 14.5;',
      'double length = 14.5;',
      'boolean length = 14.5;',
      'char length = 14.5;',
    ],
    correctOptionIndex: 1,
    explanation: 'double stores floating-point decimal numbers in Java.',
  },
  {
    level: 2,
    difficulty: 'Beginner',
    title: 'Single Character Literal',
    prompt: 'How do you properly store a single rank grade letter in a Java char variable?',
    options: ['char grade = "S";', "char grade = 'S';", 'String grade = \'S\';', 'char grade = S;'],
    correctOptionIndex: 1,
    explanation: 'char literals use single quotes (\'S\'), whereas String literals use double quotes.',
  },
  {
    level: 2,
    difficulty: 'Intermediate',
    title: 'Integer Division Remainder',
    prompt: 'What value is stored in remainder after this line runs?',
    codeSnippet: 'int remainder = 17 % 5;',
    options: ['3', '2', '3.4', '5'],
    correctOptionIndex: 1,
    explanation: '17 divided by 5 is 3 with a remainder of 2 (5 * 3 = 15; 17 - 15 = 2).',
  },
  {
    level: 2,
    difficulty: 'Intermediate',
    title: 'Explicit Narrowing Cast',
    prompt: 'What integer is printed after casting double to int?',
    codeSnippet: 'double energy = 9.95;\nint whole = (int) energy;\nSystem.out.println(whole);',
    options: ['10', '9', '9.95', '0'],
    correctOptionIndex: 1,
    explanation: 'Casting double to int truncates (drops) the fractional part rather than rounding.',
  },
  {
    level: 2,
    difficulty: 'Advanced',
    title: 'Compound Assignment Trace',
    prompt: 'What is the final value of coins?',
    codeSnippet: 'int coins = 12;\ncoins += 8;\ncoins /= 4;\nSystem.out.println(coins);',
    options: ['5', '14', '4', '20'],
    correctOptionIndex: 0,
    explanation: '12 + 8 = 20, then 20 / 4 = 5.',
  },

  // Level 3: Conditionals & Boolean Logic
  {
    level: 3,
    difficulty: 'Beginner',
    title: 'Equality Check Operator',
    prompt: 'Which condition checks whether keys is equal to 3 inside a Java if statement?',
    options: ['if (keys = 3)', 'if (keys == 3)', 'if (keys === 3)', 'if (keys .eq. 3)'],
    correctOptionIndex: 1,
    explanation: 'Java uses == for primitive equality comparison and = for variable assignment.',
  },
  {
    level: 3,
    difficulty: 'Beginner',
    title: 'Logical AND Gate',
    prompt: 'Which operator requires BOTH conditions to be true to open the Castle Gate?',
    options: ['||', '&&', '!=', '=='],
    correctOptionIndex: 1,
    explanation: '&& is the logical AND operator—true only when both left and right sides are true.',
  },
  {
    level: 3,
    difficulty: 'Intermediate',
    title: 'Branch Execution Trace',
    prompt: 'Which word is printed by this if / else-if ladder?',
    codeSnippet:
      'int power = 75;\nif (power >= 90) {\n  System.out.println("GOLD");\n} else if (power >= 70) {\n  System.out.println("SILVER");\n} else {\n  System.out.println("BRONZE");\n}',
    options: ['GOLD', 'SILVER', 'BRONZE', 'GOLD SILVER'],
    correctOptionIndex: 1,
    explanation: '75 >= 90 is false, so Java tests 75 >= 70 (true), prints SILVER, and skips else.',
  },
  {
    level: 3,
    difficulty: 'Intermediate',
    title: 'Boolean Negation',
    prompt: 'What does this snippet output?',
    codeSnippet: 'boolean locked = false;\nif (!locked && 10 > 4) {\n  System.out.println("OPEN");\n}',
    options: ['Nothing', 'OPEN', 'false', 'Compilation Error'],
    correctOptionIndex: 1,
    explanation: '!locked flips false to true, and 10 > 4 is true, so OPEN is printed.',
  },
  {
    level: 3,
    difficulty: 'Advanced',
    title: 'Precedence of && over ||',
    prompt: 'Evaluate the boolean result printed here:',
    codeSnippet: 'boolean res = true || false && false;\nSystem.out.println(res);',
    options: ['false', 'true', '0', 'Compilation Error'],
    correctOptionIndex: 1,
    explanation: '&& has higher precedence than ||, so (false && false) is false, and true || false is true.',
  },

  // Level 4: Loops & Iteration
  {
    level: 4,
    difficulty: 'Beginner',
    title: 'For-Loop Iteration Count',
    prompt: 'How many times does this for loop print "STEP"?',
    codeSnippet: 'for (int i = 1; i <= 4; i++) {\n  System.out.println("STEP");\n}',
    options: ['3', '4', '5', 'Infinite'],
    correctOptionIndex: 1,
    explanation: 'i takes values 1, 2, 3, and 4—running the loop body 4 times.',
  },
  {
    level: 4,
    difficulty: 'Intermediate',
    title: 'Loop Accumulator Sum',
    prompt: 'What total is printed after the loop finishes?',
    codeSnippet: 'int sum = 0;\nfor (int n = 2; n <= 6; n += 2) {\n  sum += n;\n}\nSystem.out.println(sum);',
    options: ['8', '12', '10', '6'],
    correctOptionIndex: 1,
    explanation: 'n visits 2, 4, and 6. Adding 2 + 4 + 6 produces 12.',
  },
  {
    level: 4,
    difficulty: 'Intermediate',
    title: 'Do-While Guarantee',
    prompt: 'What does this do-while loop output?',
    codeSnippet: 'int x = 10;\ndo {\n  System.out.println(x);\n  x++;\n} while (x < 5);',
    options: ['Nothing', '10', '5', 'Infinite loop'],
    correctOptionIndex: 1,
    explanation: 'A do-while loop always executes its body once before checking the condition.',
  },
  {
    level: 4,
    difficulty: 'Advanced',
    title: 'Break Statement Control',
    prompt: 'What is the last number printed before the loop stops?',
    codeSnippet:
      'for (int i = 1; i <= 5; i++) {\n  if (i == 4) break;\n  System.out.print(i + " ");\n}',
    options: ['1 2 3 4 ', '1 2 3 ', '1 2 3 5 ', '4 '],
    correctOptionIndex: 1,
    explanation: 'When i reaches 4, break exits the loop immediately before printing 4.',
  },
  {
    level: 4,
    difficulty: 'Beginner',
    title: 'Preventing Infinite Loops',
    prompt: 'What is missing from this while loop so it eventually stops?',
    codeSnippet: 'int count = 0;\nwhile (count < 3) {\n  System.out.println(count);\n}',
    options: ['count++; inside the loop', 'count--; inside the loop', 'A semicolon after while()', 'Nothing'],
    correctOptionIndex: 0,
    explanation: 'Incrementing count (count++) moves it toward 3 so count < 3 eventually becomes false.',
  },

  // Level 5: Methods & Modular Code
  {
    level: 5,
    difficulty: 'Beginner',
    title: 'Return Type Declaration',
    prompt: 'If a Java method returns `a * b` where both are `int`, what return type replaces `void`?',
    options: ['String', 'int', 'boolean', 'return'],
    correctOptionIndex: 1,
    explanation: 'Multiplying two ints yields an int, so the method signature uses int.',
  },
  {
    level: 5,
    difficulty: 'Intermediate',
    title: 'Method Call Composition',
    prompt: 'What number is printed by main?',
    codeSnippet:
      'static int boost(int x) {\n  return x * 2 + 1;\n}\npublic static void main(String[] args) {\n  System.out.println(boost(4));\n}',
    options: ['8', '9', '10', '5'],
    correctOptionIndex: 1,
    explanation: 'boost(4) computes 4 * 2 + 1 = 9 and returns it to println.',
  },
  {
    level: 5,
    difficulty: 'Intermediate',
    title: 'Void Method Behavior',
    prompt: 'What does the keyword `void` in `public static void ping()` indicate?',
    options: [
      'The method takes zero parameters',
      'The method does not return any value',
      'The method cannot be called from main',
      'The method runs only once',
    ],
    correctOptionIndex: 1,
    explanation: 'void specifies that the method performs an action without returning a value.',
  },
  {
    level: 5,
    difficulty: 'Advanced',
    title: 'Nested Method Invocations',
    prompt: 'Trace the nested call `add(square(3), 5)`:',
    codeSnippet:
      'static int square(int n) { return n * n; }\nstatic int add(int a, int b) { return a + b; }',
    options: ['11', '14', '64', '8'],
    correctOptionIndex: 1,
    explanation: 'square(3) returns 9, and add(9, 5) returns 14.',
  },
  {
    level: 5,
    difficulty: 'Beginner',
    title: 'Method Arguments',
    prompt: 'In `healPlayer("Alex", 25);`, what are `"Alex"` and `25` called?',
    options: ['Return types', 'Arguments', 'Classes', 'Loops'],
    correctOptionIndex: 1,
    explanation: 'The concrete values passed into a method call are arguments.',
  },

  // Level 6: Classes, Constructors & OOP
  {
    level: 6,
    difficulty: 'Beginner',
    title: 'Instantiating an Object',
    prompt: 'Which Java keyword allocates a new object instance from a class blueprint?',
    options: ['create', 'new', 'class', 'build'],
    correctOptionIndex: 1,
    explanation: 'Java uses `new ClassName(...)` to invoke a constructor and create an object.',
  },
  {
    level: 6,
    difficulty: 'Beginner',
    title: 'Constructor Naming Rule',
    prompt: 'In Java, what must a constructor’s name always match?',
    options: [
      'The exact name of its class',
      'Always the word constructor',
      'Always lowercase main',
      'Any method name with void',
    ],
    correctOptionIndex: 0,
    explanation: 'A Java constructor has the exact same name as its class and no return type.',
  },
  {
    level: 6,
    difficulty: 'Intermediate',
    title: 'Constructor Field Initialization',
    prompt: 'What is printed when this Droid object is created?',
    codeSnippet:
      'class Droid {\n  int shield;\n  Droid(int s) { this.shield = s + 10; }\n}\n// In main:\nDroid d = new Droid(40);\nSystem.out.println(d.shield);',
    options: ['40', '50', '10', '0'],
    correctOptionIndex: 1,
    explanation: 'new Droid(40) runs the constructor, setting this.shield to 40 + 10 = 50.',
  },
  {
    level: 6,
    difficulty: 'Intermediate',
    title: 'Zero-Indexed Arrays',
    prompt: 'What element is printed from this Java array?',
    codeSnippet: 'int[] cores = {15, 30, 45, 60};\nSystem.out.println(cores[2]);',
    options: ['30', '45', '15', '60'],
    correctOptionIndex: 1,
    explanation: 'Java arrays are 0-indexed: index 0 is 15, index 1 is 30, and index 2 is 45.',
  },
  {
    level: 6,
    difficulty: 'Advanced',
    title: 'Inheritance Keyword',
    prompt: 'Which declaration makes `GuardianBot` inherit fields and methods from `Robot`?',
    options: [
      'class GuardianBot inherits Robot',
      'class GuardianBot extends Robot',
      'class GuardianBot implements new Robot',
      'class GuardianBot : Robot',
    ],
    correctOptionIndex: 1,
    explanation: 'Java uses `extends` to establish class inheritance.',
  },
];

const BEACON_COLORS = ['#2F7D46', '#69B9E7', '#F5C451', '#F28C45', '#4FD1C5'];

function mapSelectedLevelToWorldBucket(selectedLevel: number): number {
  if (selectedLevel <= 6) return Math.max(1, selectedLevel);
  if (selectedLevel <= 10) return 1;
  if (selectedLevel <= 25) return 2;
  if (selectedLevel <= 40) return 3;
  if (selectedLevel <= 55) return 4;
  if (selectedLevel <= 75) return 5;
  return 6;
}

function buildMatchNodes(selectedLevel: number, difficulty: JavaDifficulty): ServerChallengeNode[] {
  const bucket = mapSelectedLevelToWorldBucket(selectedLevel);
  const levelPool = CHALLENGE_BANK.filter((c) => c.level === bucket);
  const diffMatches = levelPool.filter((c) => c.difficulty === difficulty);
  const otherLevelItems = levelPool.filter((c) => c.difficulty !== difficulty);
  const crossPool = CHALLENGE_BANK.filter(
    (c) => c.level !== bucket && c.difficulty === difficulty
  );

  const combined = [...diffMatches, ...otherLevelItems, ...crossPool];
  const selected = combined.slice(0, 5);

  return selected.map((tpl, idx) => ({
    id: `node-${idx + 1}`,
    index: idx,
    bearingDeg: idx * 72, // 0, 72, 144, 216, 288 degrees around full 360° horizon
    elevationDeg: idx % 2 === 0 ? 4 : 14,
    title: tpl.title,
    prompt: tpl.prompt,
    codeSnippet: tpl.codeSnippet,
    options: tpl.options,
    correctOptionIndex: tpl.correctOptionIndex,
    explanation: tpl.explanation,
    gridRouteTargetSteps: 3 + ((idx + selectedLevel) % 4),
    accentHex: BEACON_COLORS[idx % BEACON_COLORS.length],
    solvedByUserIds: [],
  }));
}

// Live WebSocket presence & subscription tracking
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  watchedRoomCode: string | null;
}

const clients = new Set<ConnectedClient>();

function isUserOnline(userId: string): boolean {
  for (const c of clients) {
    if (c.userId === userId && c.ws.readyState === WebSocket.OPEN) {
      return true;
    }
  }
  return false;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToUser(userId: string, payload: unknown) {
  for (const c of clients) {
    if (c.userId === userId) {
      sendJson(c.ws, payload);
    }
  }
}

function serializeRoomForClient(room: ServerGameRoom) {
  const members = Object.values(db.roomMembers)
    .filter((m) => m.roomId === room.id)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      username: m.username,
      displayName: m.displayName,
      avatarId: m.avatarId,
      isHost: m.isHost,
      isReady: m.isReady,
      joinedAt: m.joinedAt,
      score: m.score,
      solvedNodeIds: m.solvedNodeIds,
      routeEfficiencyBonus: m.routeEfficiencyBonus,
      yawDeg: m.yawDeg,
      pitchDeg: m.pitchDeg,
      online: isUserOnline(m.userId),
      completedAtIso: m.completedAtIso,
    }));

  const safeMatchState = room.matchState
    ? {
        startedAtIso: room.matchState.startedAtIso,
        countdownEndsAtMs: room.matchState.countdownEndsAtMs,
        completedAtIso: room.matchState.completedAtIso,
        winnerUserId: room.matchState.winnerUserId,
        winnerDisplayName: room.matchState.winnerDisplayName,
        sharedCoreEnergy: room.matchState.sharedCoreEnergy,
        targetCoreEnergy: room.matchState.targetCoreEnergy,
        nodes: room.matchState.nodes.map((n) => ({
          id: n.id,
          index: n.index,
          bearingDeg: n.bearingDeg,
          elevationDeg: n.elevationDeg,
          title: n.title,
          prompt: n.prompt,
          codeSnippet: n.codeSnippet,
          options: n.options,
          gridRouteTargetSteps: n.gridRouteTargetSteps,
          accentHex: n.accentHex,
          solvedByUserIds: n.solvedByUserIds,
        })),
      }
    : undefined;

  return {
    id: room.id,
    roomCode: room.roomCode,
    roomName: room.roomName,
    hostUserId: room.hostUserId,
    hostUsername: room.hostUsername,
    hostDisplayName: room.hostDisplayName,
    maxPlayers: room.maxPlayers,
    gameMode: room.gameMode,
    selectedLevel: room.selectedLevel,
    javaDifficulty: room.javaDifficulty,
    allowFriendsToInvite: room.allowFriendsToInvite,
    roomStatus: room.roomStatus,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    lastActiveAt: room.lastActiveAt,
    members,
    matchState: safeMatchState,
  };
}

function broadcastRoomUpdate(room: ServerGameRoom) {
  const serialized = serializeRoomForClient(room);
  const memberIds = new Set(serialized.members.map((m) => m.userId));
  for (const c of clients) {
    if (c.watchedRoomCode === room.roomCode || (c.userId && memberIds.has(c.userId))) {
      sendJson(c.ws, {
        type: 'room:updated',
        room: serialized,
      });
    }
  }
}

function broadcastPresenceUpdate() {
  const onlineIds: string[] = [];
  for (const c of clients) {
    if (c.userId && c.ws.readyState === WebSocket.OPEN && !onlineIds.includes(c.userId)) {
      onlineIds.push(c.userId);
    }
  }
  for (const c of clients) {
    sendJson(c.ws, {
      type: 'presence:updated',
      onlineUserIds: onlineIds,
    });
  }
}

function findRoomByCode(codeRaw: string): ServerGameRoom | null {
  const code = codeRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return null;
  const rooms = Object.values(db.gameRooms);
  for (const r of rooms) {
    if (r.roomCode === code) {
      // Check lazy expiration
      if (
        (r.roomStatus === 'waiting' || r.roomStatus === 'starting') &&
        new Date(r.expiresAt).getTime() <= Date.now()
      ) {
        r.roomStatus = 'expired';
        scheduleSaveDatabase();
      }
      return r;
    }
  }
  return null;
}

function touchRoomActivity(room: ServerGameRoom) {
  const now = Date.now();
  room.lastActiveAt = new Date(now).toISOString();
  room.expiresAt = new Date(now + ROOM_TTL_MS).toISOString();
}

function upsertPlayerDirectory(input: {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  totalXp?: number;
  currentStreak?: number;
}) {
  const uid = sanitizeId(input.userId);
  if (!uid) return;
  const existing = db.playersDirectory[uid];
  db.playersDirectory[uid] = {
    userId: uid,
    username: sanitizeId(input.username, 24) || existing?.username || 'explorer',
    displayName: sanitizeDisplayText(input.displayName, 40) || existing?.displayName || 'Explorer',
    avatarId: sanitizeId(input.avatarId, 24) || existing?.avatarId || 'character-a',
    totalXp:
      typeof input.totalXp === 'number' && Number.isFinite(input.totalXp)
        ? Math.max(0, Math.round(input.totalXp))
        : existing?.totalXp ?? 0,
    currentStreak:
      typeof input.currentStreak === 'number' && Number.isFinite(input.currentStreak)
        ? Math.max(0, Math.round(input.currentStreak))
        : existing?.currentStreak ?? 0,
    lastSeenAt: new Date().toISOString(),
  };
  scheduleSaveDatabase();
}

function recordServerStreakActivity(
  userId: string,
  localDateKey: string,
  activityType: StreakActivityKind,
  clientCurrentStreak = 0,
  clientLongestStreak = 0
): {
  streak: ServerUserStreak;
  recordedNewDay: boolean;
} {
  const nowIso = new Date().toISOString();
  const compositeKey = `${userId}__${localDateKey}`;
  const existingActivity = db.streakActivities[compositeKey];

  let rec = db.userStreaks[userId];
  if (!rec) {
    rec = {
      userId,
      currentStreak: Math.max(0, Math.round(clientCurrentStreak)),
      longestStreak: Math.max(0, Math.round(clientLongestStreak)),
      lastActivityDate: '',
      totalActiveDays: 0,
      activityDates: [],
      updatedAt: nowIso,
    };
  }

  // Enforce unique (user_id, activity_date) constraint
  if (existingActivity && rec.lastActivityDate === localDateKey) {
    return { streak: rec, recordedNewDay: false };
  }

  if (!existingActivity) {
    db.streakActivities[compositeKey] = {
      id: compositeKey,
      userId,
      activityDate: localDateKey,
      activityType,
      createdAt: nowIso,
    };
  }

  const yesterdayKey = getPreviousDateKey(localDateKey);
  let nextCurrent = 1;
  if (rec.lastActivityDate === localDateKey) {
    nextCurrent = Math.max(1, rec.currentStreak);
  } else if (rec.lastActivityDate === yesterdayKey) {
    nextCurrent = Math.max(1, rec.currentStreak) + 1;
  } else {
    nextCurrent = 1;
  }

  const nextDates = rec.activityDates.includes(localDateKey)
    ? rec.activityDates.slice(-89)
    : [...rec.activityDates.slice(-88), localDateKey].sort();

  const totalForUser = Object.values(db.streakActivities).filter(
    (a) => a.userId === userId
  ).length;

  const updated: ServerUserStreak = {
    userId,
    currentStreak: nextCurrent,
    longestStreak: Math.max(rec.longestStreak, clientLongestStreak, nextCurrent),
    lastActivityDate: localDateKey,
    totalActiveDays: Math.max(totalForUser, nextDates.length),
    activityDates: nextDates,
    updatedAt: nowIso,
  };

  db.userStreaks[userId] = updated;
  if (db.playersDirectory[userId]) {
    db.playersDirectory[userId].currentStreak = updated.currentStreak;
  }
  scheduleSaveDatabase();
  return { streak: updated, recordedNewDay: !existingActivity };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Periodic room & invitation lifecycle sweep
  setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const room of Object.values(db.gameRooms)) {
      if (
        (room.roomStatus === 'waiting' || room.roomStatus === 'starting') &&
        new Date(room.expiresAt).getTime() <= now
      ) {
        room.roomStatus = 'expired';
        changed = true;
        broadcastRoomUpdate(room);
      }
      // Transition 'starting' rooms whose countdown elapsed into 'in_progress'
      if (
        room.roomStatus === 'starting' &&
        room.matchState &&
        room.matchState.countdownEndsAtMs <= now
      ) {
        room.roomStatus = 'in_progress';
        changed = true;
        broadcastRoomUpdate(room);
      }
    }

    for (const inv of Object.values(db.roomInvitations)) {
      if (inv.invitationStatus === 'pending' && new Date(inv.expiresAt).getTime() <= now) {
        inv.invitationStatus = 'expired';
        changed = true;
        broadcastToUser(inv.senderUserId, { type: 'invite:updated', invitation: inv });
        broadcastToUser(inv.recipientUserId, { type: 'invite:updated', invitation: inv });
      }
    }

    if (changed) {
      scheduleSaveDatabase();
    }
  }, 1500);

  // ================= API ROUTES =================

  // 1. Environment / Canonical Share URL helper
  app.get('/api/config', (req: Request, res: Response) => {
    const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers.host || 'localhost:3000';
    const inferredOrigin = `${proto}://${host}`;
    const appOrigin =
      envUrl && envUrl.startsWith('http') && !envUrl.includes('MY_APP_URL')
        ? envUrl
        : inferredOrigin;
    res.json({ appOrigin });
  });

  // 2. Daily Streak Sync & Activity Recording (Feature 1 & Feature 3)
  app.post('/api/streaks/sync', (req: Request, res: Response) => {
    const userId = sanitizeId(req.body?.userId);
    const localDateKey = req.body?.localDateKey;
    const activityType: StreakActivityKind = req.body?.activityType || 'daily_login';
    const validTypes: StreakActivityKind[] = [
      'daily_login',
      'lesson',
      'exercise',
      'assessment',
      'mission',
      'multiplayer_match',
    ];

    if (!userId || !isValidDateKey(localDateKey) || !validTypes.includes(activityType)) {
      res.status(400).json({ error: 'Invalid streak sync payload.' });
      return;
    }

    upsertPlayerDirectory({
      userId,
      username: req.body?.username || 'explorer',
      displayName: req.body?.displayName || 'Explorer',
      avatarId: req.body?.avatarId || 'character-a',
      totalXp: req.body?.totalXp,
    });

    const result = recordServerStreakActivity(
      userId,
      localDateKey,
      activityType,
      Number(req.body?.currentStreak) || 0,
      Number(req.body?.longestStreak) || 0
    );

    res.json(result);
  });

  // 3. Friends & Explorer Presence Directory (Feature 2G)
  app.get('/api/friends', (req: Request, res: Response) => {
    const userId = sanitizeId(req.query.userId);
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter.' });
      return;
    }

    const allPlayers = Object.values(db.playersDirectory).filter((p) => p.userId !== userId);
    const myFriendships = Object.values(db.friendships).filter(
      (f) => f.userA === userId || f.userB === userId
    );

    const entries = allPlayers.map((p) => {
      const rel = myFriendships.find((f) => f.userA === p.userId || f.userB === p.userId);
      let relation: 'friend' | 'incoming_request' | 'outgoing_request' | 'discover' = 'discover';
      if (rel) {
        if (rel.status === 'accepted') {
          relation = 'friend';
        } else if (rel.requesterId === userId) {
          relation = 'outgoing_request';
        } else {
          relation = 'incoming_request';
        }
      }
      return {
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatarId: p.avatarId,
        online: isUserOnline(p.userId),
        totalXp: p.totalXp,
        currentStreak: p.currentStreak,
        relation,
      };
    });

    // Sort: friends first (online first), then incoming requests, then online explorers
    entries.sort((a, b) => {
      const rank = (r: string) =>
        r === 'friend' ? 0 : r === 'incoming_request' ? 1 : r === 'outgoing_request' ? 2 : 3;
      if (rank(a.relation) !== rank(b.relation)) return rank(a.relation) - rank(b.relation);
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.totalXp - a.totalXp;
    });

    res.json({ entries });
  });

  app.post('/api/friends/request', (req: Request, res: Response) => {
    const userId = sanitizeId(req.body?.userId);
    let targetUserId = sanitizeId(req.body?.targetUserId);
    const targetUsername = sanitizeId(req.body?.targetUsername, 24).toLowerCase();

    if (!userId) {
      res.status(400).json({ error: 'Authentication required.' });
      return;
    }

    if (!targetUserId && targetUsername) {
      const found = Object.values(db.playersDirectory).find(
        (p) => p.username.toLowerCase() === targetUsername && p.userId !== userId
      );
      if (!found) {
        res.status(404).json({ error: `No CODELAND explorer found with handle @${targetUsername}.` });
        return;
      }
      targetUserId = found.userId;
    }

    if (!targetUserId || targetUserId === userId || !db.playersDirectory[targetUserId]) {
      res.status(400).json({ error: 'Valid friend target not found.' });
      return;
    }

    const pair = [userId, targetUserId].sort();
    const pairKey = `${pair[0]}__${pair[1]}`;
    const existing = db.friendships[pairKey];
    const nowIso = new Date().toISOString();

    if (existing) {
      if (existing.status === 'pending' && existing.requesterId !== userId) {
        existing.status = 'accepted';
        existing.updatedAt = nowIso;
        scheduleSaveDatabase();
        broadcastToUser(targetUserId, { type: 'friend:updated' });
        broadcastToUser(userId, { type: 'friend:updated' });
        res.json({ status: 'accepted' });
        return;
      }
      res.json({ status: existing.status });
      return;
    }

    db.friendships[pairKey] = {
      id: pairKey,
      userA: pair[0],
      userB: pair[1],
      requesterId: userId,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    scheduleSaveDatabase();
    broadcastToUser(targetUserId, { type: 'friend:updated' });
    broadcastToUser(userId, { type: 'friend:updated' });
    res.json({ status: 'pending' });
  });

  app.post('/api/friends/respond', (req: Request, res: Response) => {
    const userId = sanitizeId(req.body?.userId);
    const otherUserId = sanitizeId(req.body?.otherUserId);
    const accept = Boolean(req.body?.accept);

    if (!userId || !otherUserId) {
      res.status(400).json({ error: 'Invalid friend response.' });
      return;
    }

    const pair = [userId, otherUserId].sort();
    const pairKey = `${pair[0]}__${pair[1]}`;
    const existing = db.friendships[pairKey];
    if (!existing) {
      res.status(404).json({ error: 'Friend request not found.' });
      return;
    }

    if (accept) {
      existing.status = 'accepted';
      existing.updatedAt = new Date().toISOString();
    } else {
      delete db.friendships[pairKey];
    }
    scheduleSaveDatabase();
    broadcastToUser(otherUserId, { type: 'friend:updated' });
    broadcastToUser(userId, { type: 'friend:updated' });
    res.json({ ok: true });
  });

  // 4. Create Private Room (Feature 2A & 2B)
  app.post('/api/rooms', (req: Request, res: Response) => {
    const hostUserId = sanitizeId(req.body?.hostUserId);
    const hostUsername = sanitizeId(req.body?.hostUsername, 24) || 'explorer';
    const hostDisplayName = sanitizeDisplayText(req.body?.hostDisplayName, 40) || 'Explorer';
    const hostAvatarId = sanitizeId(req.body?.hostAvatarId, 24) || 'character-a';

    if (!hostUserId) {
      res.status(401).json({ error: 'Please sign in or complete onboarding to create a room.' });
      return;
    }

    upsertPlayerDirectory({
      userId: hostUserId,
      username: hostUsername,
      displayName: hostDisplayName,
      avatarId: hostAvatarId,
    });

    const rawRoomName = sanitizeDisplayText(req.body?.roomName, 42);
    const roomName = rawRoomName || `${hostDisplayName}'s Java Room`;
    const maxPlayers = Math.min(6, Math.max(2, Math.round(Number(req.body?.maxPlayers) || 4)));
    const selectedLevel = Math.min(100, Math.max(1, Math.round(Number(req.body?.selectedLevel) || 1)));
    const allowedModes: RoomGameMode[] = ['coding_race', 'coop_adventure', 'challenge_mode'];
    const gameMode: RoomGameMode = allowedModes.includes(req.body?.gameMode)
      ? req.body.gameMode
      : 'coding_race';
    const allowedDiffs: JavaDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
    const javaDifficulty: JavaDifficulty = allowedDiffs.includes(req.body?.javaDifficulty)
      ? req.body.javaDifficulty
      : 'Beginner';
    const allowFriendsToInvite = Boolean(req.body?.allowFriendsToInvite);

    const roomCode = generateUniqueRoomCode();
    const roomId = `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const room: ServerGameRoom = {
      id: roomId,
      roomCode,
      roomName,
      hostUserId,
      hostUsername,
      hostDisplayName,
      maxPlayers,
      gameMode,
      selectedLevel,
      javaDifficulty,
      allowFriendsToInvite,
      roomStatus: 'waiting',
      createdAt: nowIso,
      expiresAt: new Date(now + ROOM_TTL_MS).toISOString(),
      lastActiveAt: nowIso,
    };

    const memberKey = `${roomId}__${hostUserId}`;
    const hostMember: ServerRoomMember = {
      id: memberKey,
      roomId,
      userId: hostUserId,
      username: hostUsername,
      displayName: hostDisplayName,
      avatarId: hostAvatarId,
      isHost: true,
      isReady: true,
      joinedAt: nowIso,
      score: 0,
      solvedNodeIds: [],
      wrongAttempts: 0,
      routeEfficiencyBonus: 0,
      yawDeg: 0,
      pitchDeg: 0,
    };

    db.gameRooms[roomId] = room;
    db.roomMembers[memberKey] = hostMember;
    scheduleSaveDatabase();

    res.status(201).json({ room: serializeRoomForClient(room) });
  });

  // 5. Lookup Room Preview by Short Code (Feature 2C & 2H)
  app.get('/api/rooms/by-code/:code', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    if (!room) {
      res.status(404).json({ error: 'Room code not found. Double-check the 6-character code and try again.' });
      return;
    }
    res.json({ room: serializeRoomForClient(room) });
  });

  // Get active room for a user (reconnection recovery)
  app.get('/api/rooms/active-for-user/:userId', (req: Request, res: Response) => {
    const userId = sanitizeId(req.params.userId);
    if (!userId) {
      res.json({ room: null });
      return;
    }
    const memberships = Object.values(db.roomMembers)
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

    for (const m of memberships) {
      const room = db.gameRooms[m.roomId];
      if (
        room &&
        (room.roomStatus === 'waiting' ||
          room.roomStatus === 'starting' ||
          room.roomStatus === 'in_progress')
      ) {
        if (
          room.roomStatus === 'waiting' &&
          new Date(room.expiresAt).getTime() <= Date.now()
        ) {
          room.roomStatus = 'expired';
          scheduleSaveDatabase();
          continue;
        }
        res.json({ room: serializeRoomForClient(room) });
        return;
      }
    }
    res.json({ room: null });
  });

  // 6. Join Room by Code (Feature 2H)
  app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    if (!room) {
      res.status(404).json({ error: 'Invalid room code. No private room matches that code.' });
      return;
    }

    const userId = sanitizeId(req.body?.userId);
    const username = sanitizeId(req.body?.username, 24) || 'explorer';
    const displayName = sanitizeDisplayText(req.body?.displayName, 40) || 'Explorer';
    const avatarId = sanitizeId(req.body?.avatarId, 24) || 'character-a';

    if (!userId) {
      res.status(401).json({ error: 'Please sign in before joining a private room.' });
      return;
    }

    upsertPlayerDirectory({ userId, username, displayName, avatarId });

    const memberKey = `${room.id}__${userId}`;
    const existingMember = db.roomMembers[memberKey];

    if (room.roomStatus === 'expired') {
      res.status(410).json({ error: 'This private room has expired due to inactivity.' });
      return;
    }
    if (room.roomStatus === 'cancelled') {
      res.status(410).json({ error: 'This private room was closed by the host.' });
      return;
    }
    if (room.roomStatus === 'completed') {
      res.status(409).json({ error: 'This game session has already finished.' });
      return;
    }

    // Allow existing member to reconnect if match already started, otherwise block late joiners
    if (existingMember) {
      existingMember.username = username;
      existingMember.displayName = displayName;
      existingMember.avatarId = avatarId;
      touchRoomActivity(room);
      scheduleSaveDatabase();
      broadcastRoomUpdate(room);
      res.json({ room: serializeRoomForClient(room), rejoined: true });
      return;
    }

    if (room.roomStatus !== 'waiting') {
      res.status(409).json({
        error: 'Match is already in progress. Late joining is locked once the countdown starts.',
      });
      return;
    }

    const currentMembers = Object.values(db.roomMembers).filter((m) => m.roomId === room.id);
    if (currentMembers.length >= room.maxPlayers) {
      res.status(409).json({
        error: `Room ${room.roomCode} is full (${currentMembers.length}/${room.maxPlayers} players).`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    db.roomMembers[memberKey] = {
      id: memberKey,
      roomId: room.id,
      userId,
      username,
      displayName,
      avatarId,
      isHost: false,
      isReady: false,
      joinedAt: nowIso,
      score: 0,
      solvedNodeIds: [],
      wrongAttempts: 0,
      routeEfficiencyBonus: 0,
      yawDeg: (currentMembers.length * 60) % 360,
      pitchDeg: 0,
    };

    // Mark any pending invitation for this user & room as accepted
    for (const inv of Object.values(db.roomInvitations)) {
      if (
        inv.roomId === room.id &&
        inv.recipientUserId === userId &&
        inv.invitationStatus === 'pending'
      ) {
        inv.invitationStatus = 'accepted';
        broadcastToUser(inv.senderUserId, { type: 'invite:updated', invitation: inv });
      }
    }

    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    res.json({ room: serializeRoomForClient(room), rejoined: false });
  });

  // 7. Toggle Ready State (Guest or Host)
  app.post('/api/rooms/:code/ready', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    if (!room || !userId) {
      res.status(404).json({ error: 'Room or player not found.' });
      return;
    }
    if (room.roomStatus !== 'waiting') {
      res.status(409).json({ error: 'Ready status can only be changed while waiting in lobby.' });
      return;
    }
    const member = db.roomMembers[`${room.id}__${userId}`];
    if (!member) {
      res.status(403).json({ error: 'You are not a member of this room.' });
      return;
    }
    member.isReady = typeof req.body?.isReady === 'boolean' ? req.body.isReady : !member.isReady;
    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    res.json({ room: serializeRoomForClient(room) });
  });

  // 8. Host Settings Update (Feature 2I - Host Privilege Verified)
  app.post('/api/rooms/:code/settings', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.hostUserId !== userId) {
      res.status(403).json({ error: 'Only the room host can update room settings.' });
      return;
    }
    if (room.roomStatus !== 'waiting') {
      res.status(409).json({ error: 'Settings cannot be changed after the game starts.' });
      return;
    }

    const currentMemberCount = Object.values(db.roomMembers).filter(
      (m) => m.roomId === room.id
    ).length;

    if (typeof req.body?.roomName === 'string' && req.body.roomName.trim()) {
      room.roomName = sanitizeDisplayText(req.body.roomName, 42);
    }
    if (req.body?.maxPlayers !== undefined) {
      const requestedMax = Math.min(6, Math.max(2, Math.round(Number(req.body.maxPlayers) || 4)));
      room.maxPlayers = Math.max(currentMemberCount, requestedMax);
    }
    if (req.body?.selectedLevel !== undefined) {
      room.selectedLevel = Math.min(100, Math.max(1, Math.round(Number(req.body.selectedLevel) || 1)));
    }
    const allowedModes: RoomGameMode[] = ['coding_race', 'coop_adventure', 'challenge_mode'];
    if (allowedModes.includes(req.body?.gameMode)) {
      room.gameMode = req.body.gameMode;
    }
    const allowedDiffs: JavaDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
    if (allowedDiffs.includes(req.body?.javaDifficulty)) {
      room.javaDifficulty = req.body.javaDifficulty;
    }
    if (typeof req.body?.allowFriendsToInvite === 'boolean') {
      room.allowFriendsToInvite = req.body.allowFriendsToInvite;
    }

    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    res.json({ room: serializeRoomForClient(room) });
  });

  // 9. Host Kick Player (Feature 2I)
  app.post('/api/rooms/:code/kick', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const hostUserId = sanitizeId(req.body?.hostUserId);
    const targetUserId = sanitizeId(req.body?.targetUserId);

    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.hostUserId !== hostUserId) {
      res.status(403).json({ error: 'Only the room host can remove players.' });
      return;
    }
    if (!targetUserId || targetUserId === hostUserId) {
      res.status(400).json({ error: 'Invalid player selection.' });
      return;
    }

    const memberKey = `${room.id}__${targetUserId}`;
    if (!db.roomMembers[memberKey]) {
      res.status(404).json({ error: 'Player is no longer in this room.' });
      return;
    }

    delete db.roomMembers[memberKey];
    touchRoomActivity(room);
    scheduleSaveDatabase();

    broadcastToUser(targetUserId, {
      type: 'room:kicked',
      roomCode: room.roomCode,
      roomName: room.roomName,
    });
    broadcastRoomUpdate(room);
    res.json({ room: serializeRoomForClient(room) });
  });

  // 10. Leave Room & Automatic Host Transfer / Cancellation (Feature 2I & 2J)
  app.post('/api/rooms/:code/leave', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    if (!room || !userId) {
      res.json({ ok: true });
      return;
    }

    const memberKey = `${room.id}__${userId}`;
    const leavingMember = db.roomMembers[memberKey];
    if (!leavingMember) {
      res.json({ ok: true });
      return;
    }

    delete db.roomMembers[memberKey];
    const remaining = Object.values(db.roomMembers)
      .filter((m) => m.roomId === room.id)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

    if (remaining.length === 0) {
      if (room.roomStatus !== 'completed') {
        room.roomStatus = 'cancelled';
      }
    } else if (room.hostUserId === userId) {
      const nextHost = remaining[0];
      nextHost.isHost = true;
      nextHost.isReady = true;
      room.hostUserId = nextHost.userId;
      room.hostUsername = nextHost.username;
      room.hostDisplayName = nextHost.displayName;
    }

    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    res.json({ ok: true });
  });

  // 11. Host Close Room (Feature 2I & 2J)
  app.post('/api/rooms/:code/close', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.hostUserId !== userId) {
      res.status(403).json({ error: 'Only the room host can close the room.' });
      return;
    }
    room.roomStatus = 'cancelled';
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    // Clean memberships so members are freed
    for (const key of Object.keys(db.roomMembers)) {
      if (db.roomMembers[key].roomId === room.id) {
        delete db.roomMembers[key];
      }
    }
    scheduleSaveDatabase();
    res.json({ ok: true });
  });

  // 12. Start Multiplayer Match OR Rematch Reset (Feature 2I, 2J, 2K)
  app.post('/api/rooms/:code/start', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.hostUserId !== userId) {
      res.status(403).json({ error: 'Only the room host can start the match.' });
      return;
    }
    if (room.roomStatus !== 'waiting' && room.roomStatus !== 'completed') {
      res.status(409).json({ error: 'Room is not in a startable state.' });
      return;
    }

    const members = Object.values(db.roomMembers).filter((m) => m.roomId === room.id);
    for (const m of members) {
      m.score = 0;
      m.solvedNodeIds = [];
      m.wrongAttempts = 0;
      m.routeEfficiencyBonus = 0;
      m.completedAtIso = undefined;
      m.isReady = true;
    }

    const nodes = buildMatchNodes(room.selectedLevel, room.javaDifficulty);
    const now = Date.now();
    const targetCoreEnergy =
      room.gameMode === 'coop_adventure' ? Math.max(100, members.length * 60) : 100;

    room.roomStatus = 'starting';
    room.matchState = {
      startedAtIso: new Date(now).toISOString(),
      countdownEndsAtMs: now + COUNTDOWN_DURATION_MS,
      sharedCoreEnergy: 0,
      targetCoreEnergy,
      nodes,
    };

    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);
    res.json({ room: serializeRoomForClient(room) });
  });

  // 13. Solve a 360° Java Relay Node (Server-Authoritative Match Scoring)
  app.post('/api/rooms/:code/solve-node', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const userId = sanitizeId(req.body?.userId);
    const nodeId = sanitizeId(req.body?.nodeId, 32);
    const selectedOptionIndex = Number(req.body?.selectedOptionIndex);
    const scanStepsTaken = Math.max(1, Math.round(Number(req.body?.scanStepsTaken) || 4));

    if (!room || !room.matchState) {
      res.status(404).json({ error: 'Active match not found.' });
      return;
    }

    if (room.roomStatus === 'starting' && room.matchState.countdownEndsAtMs <= Date.now()) {
      room.roomStatus = 'in_progress';
    }

    if (room.roomStatus !== 'in_progress') {
      res.status(409).json({ error: 'Match is not currently in progress.' });
      return;
    }

    const member = db.roomMembers[`${room.id}__${userId}`];
    if (!member) {
      res.status(403).json({ error: 'You are not a participant in this room.' });
      return;
    }

    const node = room.matchState.nodes.find((n) => n.id === nodeId);
    if (!node) {
      res.status(404).json({ error: 'Relay node not found.' });
      return;
    }

    if (member.solvedNodeIds.includes(node.id)) {
      res.json({
        correct: true,
        alreadySolved: true,
        explanation: node.explanation,
        room: serializeRoomForClient(room),
      });
      return;
    }

    const isCorrect = selectedOptionIndex === node.correctOptionIndex;
    if (!isCorrect) {
      member.wrongAttempts += 1;
      if (room.gameMode === 'challenge_mode') {
        member.score = Math.max(0, member.score - 15);
      }
      touchRoomActivity(room);
      scheduleSaveDatabase();
      broadcastRoomUpdate(room);
      res.json({
        correct: false,
        explanation: 'Not quite! Re-check the Java syntax or operator evaluation and try again.',
        room: serializeRoomForClient(room),
      });
      return;
    }

    // Record validated node solve
    member.solvedNodeIds.push(node.id);
    if (!node.solvedByUserIds.includes(userId)) {
      node.solvedByUserIds.push(userId);
    }

    const efficiencyDelta = Math.max(
      10,
      45 - Math.abs(scanStepsTaken - node.gridRouteTargetSteps) * 8
    );
    const firstResponderBonus = node.solvedByUserIds[0] === userId ? 25 : 10;
    const accuracyBonus = member.wrongAttempts === 0 ? 20 : 5;

    let pointsEarned = 100 + firstResponderBonus;
    if (room.gameMode === 'challenge_mode') {
      pointsEarned = 100 + efficiencyDelta + accuracyBonus;
      member.routeEfficiencyBonus += efficiencyDelta;
    } else if (room.gameMode === 'coop_adventure') {
      pointsEarned = 90 + efficiencyDelta;
      room.matchState.sharedCoreEnergy = Math.min(
        room.matchState.targetCoreEnergy,
        room.matchState.sharedCoreEnergy + 35
      );
    }

    member.score += pointsEarned;

    const allMembers = Object.values(db.roomMembers).filter((m) => m.roomId === room.id);
    const totalNodesCount = room.matchState.nodes.length;

    if (member.solvedNodeIds.length >= totalNodesCount && !member.completedAtIso) {
      member.completedAtIso = new Date().toISOString();
    }

    // Check match completion condition by mode
    let shouldCompleteMatch = false;
    if (room.gameMode === 'coding_race') {
      // First player to solve all 5 Java beacons wins the race!
      if (member.solvedNodeIds.length >= totalNodesCount) {
        shouldCompleteMatch = true;
        room.matchState.winnerUserId = member.userId;
        room.matchState.winnerDisplayName = member.displayName;
      }
    } else if (room.gameMode === 'coop_adventure') {
      const allNodesTouched = room.matchState.nodes.every((n) => n.solvedByUserIds.length > 0);
      if (
        room.matchState.sharedCoreEnergy >= room.matchState.targetCoreEnergy ||
        allNodesTouched
      ) {
        room.matchState.sharedCoreEnergy = room.matchState.targetCoreEnergy;
        shouldCompleteMatch = true;
        room.matchState.winnerDisplayName = 'Team CODELAND';
      }
    } else if (room.gameMode === 'challenge_mode') {
      const everyoneDone = allMembers.every((m) => m.solvedNodeIds.length >= totalNodesCount);
      if (everyoneDone) {
        shouldCompleteMatch = true;
        const top = [...allMembers].sort((a, b) => b.score - a.score)[0];
        if (top) {
          room.matchState.winnerUserId = top.userId;
          room.matchState.winnerDisplayName = top.displayName;
        }
      }
    }

    if (shouldCompleteMatch) {
      room.roomStatus = 'completed';
      room.matchState.completedAtIso = new Date().toISOString();
    }

    touchRoomActivity(room);
    scheduleSaveDatabase();
    broadcastRoomUpdate(room);

    res.json({
      correct: true,
      pointsEarned,
      explanation: node.explanation,
      room: serializeRoomForClient(room),
    });
  });

  // 14. Direct Friend Invitations (Feature 2G & Feature 3)
  app.get('/api/invitations', (req: Request, res: Response) => {
    const userId = sanitizeId(req.query.userId);
    const roomId = sanitizeId(req.query.roomId);
    const now = Date.now();

    const list = Object.values(db.roomInvitations).filter((inv) => {
      if (inv.invitationStatus === 'pending' && new Date(inv.expiresAt).getTime() <= now) {
        inv.invitationStatus = 'expired';
      }
      if (roomId && inv.roomId === roomId) return true;
      if (userId && (inv.recipientUserId === userId || inv.senderUserId === userId)) return true;
      return false;
    });

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ invitations: list.slice(0, 40) });
  });

  app.post('/api/rooms/:code/invite', (req: Request, res: Response) => {
    const room = findRoomByCode(String(req.params.code || ''));
    const senderUserId = sanitizeId(req.body?.senderUserId);
    const recipientUserId = sanitizeId(req.body?.recipientUserId);

    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.roomStatus !== 'waiting') {
      res.status(409).json({ error: 'Invitations can only be sent while the room is waiting.' });
      return;
    }

    const senderMember = db.roomMembers[`${room.id}__${senderUserId}`];
    if (!senderMember) {
      res.status(403).json({ error: 'Only current room members can send invitations.' });
      return;
    }
    if (!senderMember.isHost && !room.allowFriendsToInvite) {
      res.status(403).json({ error: 'Only the host can invite friends in this room.' });
      return;
    }

    const recipient = db.playersDirectory[recipientUserId];
    if (!recipient || recipientUserId === senderUserId) {
      res.status(404).json({ error: 'Recipient explorer not found.' });
      return;
    }

    if (db.roomMembers[`${room.id}__${recipientUserId}`]) {
      res.status(409).json({ error: `${recipient.displayName} is already in this room.` });
      return;
    }

    // Prevent duplicate pending invitations to the same user for the same room
    const now = Date.now();
    const existingPending = Object.values(db.roomInvitations).find(
      (inv) =>
        inv.roomId === room.id &&
        inv.recipientUserId === recipientUserId &&
        inv.invitationStatus === 'pending' &&
        new Date(inv.expiresAt).getTime() > now
    );
    if (existingPending) {
      res.status(409).json({
        error: `An active invitation is already pending for @${recipient.username}.`,
        invitation: existingPending,
      });
      return;
    }

    const invId = `inv_${now}_${crypto.randomBytes(3).toString('hex')}`;
    const invitation: ServerRoomInvitation = {
      id: invId,
      roomId: room.id,
      roomCode: room.roomCode,
      roomName: room.roomName,
      gameMode: room.gameMode,
      selectedLevel: room.selectedLevel,
      senderUserId,
      senderUsername: senderMember.username,
      senderDisplayName: senderMember.displayName,
      senderAvatarId: senderMember.avatarId,
      recipientUserId,
      recipientUsername: recipient.username,
      invitationStatus: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + INVITE_TTL_MS).toISOString(),
    };

    db.roomInvitations[invId] = invitation;
    scheduleSaveDatabase();

    broadcastToUser(recipientUserId, {
      type: 'invite:received',
      invitation,
    });
    broadcastToUser(senderUserId, {
      type: 'invite:updated',
      invitation,
    });

    res.status(201).json({ invitation });
  });

  app.post('/api/invitations/:id/respond', (req: Request, res: Response) => {
    const invId = sanitizeId(req.params.id);
    const userId = sanitizeId(req.body?.userId);
    const decision = req.body?.decision === 'accepted' ? 'accepted' : 'declined';

    const inv = db.roomInvitations[invId];
    if (!inv) {
      res.status(404).json({ error: 'Invitation not found.' });
      return;
    }
    if (inv.recipientUserId !== userId) {
      res.status(403).json({ error: 'Only the invited player can respond to this invitation.' });
      return;
    }
    if (inv.invitationStatus !== 'pending') {
      res.status(409).json({ error: `Invitation is already ${inv.invitationStatus}.` });
      return;
    }
    if (new Date(inv.expiresAt).getTime() <= Date.now()) {
      inv.invitationStatus = 'expired';
      scheduleSaveDatabase();
      res.status(410).json({ error: 'This room invitation has expired.' });
      return;
    }

    inv.invitationStatus = decision;
    scheduleSaveDatabase();

    broadcastToUser(inv.senderUserId, { type: 'invite:updated', invitation: inv });
    broadcastToUser(inv.recipientUserId, { type: 'invite:updated', invitation: inv });

    res.json({ invitation: inv });
  });

  // ================= HTTP + WEBSOCKET SERVER ON PORT 3000 =================
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // ================= VITE MIDDLEWARE / STATIC SPA FALLBACK =================
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    let viteMiddlewares: express.RequestHandler | null = null;
    const hmrEnabled = process.env.DISABLE_HMR !== 'true';

    // Initialize Vite asynchronously AFTER binding port 3000 so cold-start healthchecks pass immediately
    const viteReady = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            hmr: hmrEnabled ? { server: httpServer } : false,
            watch: hmrEnabled ? {} : null,
          },
          appType: 'spa',
        })
      )
      .then((vite) => {
        viteMiddlewares = vite.middlewares;
      })
      .catch((err) => {
        console.error('Vite middleware initialization failed:', err);
      });

    app.use(async (req: Request, res: Response, next) => {
      if (!viteMiddlewares) {
        await viteReady;
      }
      if (viteMiddlewares) {
        viteMiddlewares(req, res, next);
        return;
      }
      next();
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    // Express 5-safe SPA fallback (avoids legacy '*' PathError in path-to-regexp v8)
    app.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost:3000';
      const parsedUrl = new URL(request.url || '/', `http://${host}`);
      if (parsedUrl.pathname === '/api/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const client: ConnectedClient = {
      ws,
      userId: '',
      username: '',
      displayName: '',
      avatarId: 'character-a',
      watchedRoomCode: null,
    };
    clients.add(client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'ping') {
          sendJson(ws, { type: 'pong' });
          return;
        }

        if (msg.type === 'auth:identify') {
          const uid = sanitizeId(msg.userId);
          if (!uid) return;
          client.userId = uid;
          client.username = sanitizeId(msg.username, 24) || 'explorer';
          client.displayName = sanitizeDisplayText(msg.displayName, 40) || 'Explorer';
          client.avatarId = sanitizeId(msg.avatarId, 24) || 'character-a';

          upsertPlayerDirectory({
            userId: client.userId,
            username: client.username,
            displayName: client.displayName,
            avatarId: client.avatarId,
            totalXp: msg.totalXp,
            currentStreak: msg.currentStreak,
          });

          broadcastPresenceUpdate();

          // Push any active pending invitations immediately on connect
          const now = Date.now();
          const pendingInvites = Object.values(db.roomInvitations).filter(
            (inv) =>
              inv.recipientUserId === uid &&
              inv.invitationStatus === 'pending' &&
              new Date(inv.expiresAt).getTime() > now
          );
          if (pendingInvites.length > 0) {
            sendJson(ws, {
              type: 'invite:init',
              invitations: pendingInvites,
            });
          }

          // Also refresh any room this player belongs to so online dot updates
          for (const m of Object.values(db.roomMembers)) {
            if (m.userId === uid) {
              const r = db.gameRooms[m.roomId];
              if (r && (r.roomStatus === 'waiting' || r.roomStatus === 'in_progress')) {
                broadcastRoomUpdate(r);
              }
            }
          }
          return;
        }

        if (msg.type === 'room:watch') {
          const code = String(msg.roomCode || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
          client.watchedRoomCode = code || null;
          if (code) {
            const room = findRoomByCode(code);
            if (room) {
              sendJson(ws, {
                type: 'room:updated',
                room: serializeRoomForClient(room),
              });
            }
          }
          return;
        }

        if (msg.type === 'player:pose' && client.userId) {
          const code = String(msg.roomCode || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
          const room = findRoomByCode(code);
          if (!room) return;
          const member = db.roomMembers[`${room.id}__${client.userId}`];
          if (!member) return;

          const yawDeg = Number(msg.yawDeg);
          const pitchDeg = Number(msg.pitchDeg);
          if (Number.isFinite(yawDeg)) member.yawDeg = ((yawDeg % 360) + 360) % 360;
          if (Number.isFinite(pitchDeg)) member.pitchDeg = Math.max(-75, Math.min(75, pitchDeg));

          // Broadcast lightweight delta pose to peers in the same room
          for (const peer of clients) {
            if (
              peer !== client &&
              (peer.watchedRoomCode === room.roomCode ||
                Boolean(db.roomMembers[`${room.id}__${peer.userId}`]))
            ) {
              sendJson(peer.ws, {
                type: 'player:pose',
                roomCode: room.roomCode,
                userId: client.userId,
                yawDeg: member.yawDeg,
                pitchDeg: member.pitchDeg,
              });
            }
          }
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      const uid = client.userId;
      clients.delete(client);
      if (uid) {
        broadcastPresenceUpdate();
        for (const m of Object.values(db.roomMembers)) {
          if (m.userId === uid) {
            const r = db.gameRooms[m.roomId];
            if (r && (r.roomStatus === 'waiting' || r.roomStatus === 'in_progress')) {
              broadcastRoomUpdate(r);
            }
          }
        }
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CODELAND server + WebSocket hub listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
