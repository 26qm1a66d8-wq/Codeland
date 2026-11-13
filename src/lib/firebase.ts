import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ActivityLogItem,
  ActivityType,
  ExperienceLevel,
  GraphicsQuality,
  LeaderboardPlayer,
  MissionRecordData,
  PlayerProfile,
  ThemeMode,
  World1PersistentState,
  World1SiteId,
} from '../types/codeland';
import { computeEffectiveStreak } from './dateUtils';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Lazy Firestore singleton initialized ONLY after auth token health is verified on boot
let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  return dbInstance;
}

export class TokenServiceDisabledError extends Error {
  public readonly activationUrl: string;

  constructor(activationUrl: string) {
    super(
      `Token Service API (securetoken.googleapis.com) is currently disabled in Google Cloud project ${firebaseConfig.projectId}.`
    );
    this.name = 'TokenServiceDisabledError';
    this.activationUrl = activationUrl;
  }
}

export async function checkTokenServiceStatus(): Promise<{
  enabled: boolean;
  activationUrl: string | null;
}> {
  const fallbackUrl = `https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=${firebaseConfig.messagingSenderId}`;
  try {
    const resp = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'codeland_preflight_probe',
        }),
      }
    );

    if (resp.status === 403) {
      const payload = (await resp.json().catch(() => null)) as {
        error?: { message?: string; status?: string };
      } | null;
      const msg = payload?.error?.message || '';
      if (
        msg.includes('Token Service API') ||
        msg.includes('securetoken.googleapis.com') ||
        payload?.error?.status === 'PERMISSION_DENIED'
      ) {
        return { enabled: false, activationUrl: fallbackUrl };
      }
    }
    return { enabled: true, activationUrl: null };
  } catch {
    // If offline or blocked by network policy, do not assume SERVICE_DISABLED
    return { enabled: true, activationUrl: null };
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory startup connection probe from firebase-integration-rpc
async function testConnection() {
  try {
    const db = getDb();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

let bootPromise: Promise<{
  tokenServiceEnabled: boolean;
  activationUrl: string | null;
  clearedStaleUser: { displayName: string; email: string } | null;
}> | null = null;

/**
 * Ensures any cached Firebase Auth session has a working Token Service API BEFORE
 * instantiating Firestore, preventing @firebase/firestore stream crashes when
 * securetoken.googleapis.com is disabled in the user's GCP project.
 */
export function initializeFirebaseBoot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const [, tokenStatus] = await Promise.all([
        auth.authStateReady(),
        checkTokenServiceStatus(),
      ]);

      let clearedStaleUser: { displayName: string; email: string } | null = null;

      if (auth.currentUser) {
        if (!tokenStatus.enabled) {
          clearedStaleUser = {
            displayName: auth.currentUser.displayName || 'Java Explorer',
            email: auth.currentUser.email || '',
          };
          await firebaseSignOut(auth);
        } else {
          try {
            await auth.currentUser.getIdToken();
          } catch {
            clearedStaleUser = {
              displayName: auth.currentUser.displayName || 'Java Explorer',
              email: auth.currentUser.email || '',
            };
            await firebaseSignOut(auth);
          }
        }
      }

      // Now safe to initialize Firestore and probe server connectivity
      await testConnection();

      return {
        tokenServiceEnabled: tokenStatus.enabled,
        activationUrl: tokenStatus.activationUrl,
        clearedStaleUser,
      };
    })();
  }
  return bootPromise;
}

// Sanitization helpers matching firebase-blueprint.json & firestore.rules verbatim
export function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  return cleaned.length >= 2 ? cleaned : `explorer_${Math.floor(100 + Math.random() * 899)}`;
}

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim().slice(0, 40);
  return trimmed.length >= 1 ? trimmed : 'Explorer';
}

export function sanitizeId(raw: string, maxLen = 64): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned.length >= 1 ? cleaned : 'item_1';
}

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.trunc(val)));
}

function clampStrArray(arr: string[], maxLen: number, maxItemLen: number): string[] {
  return arr
    .filter((item) => typeof item === 'string' && item.length > 0)
    .map((item) => item.slice(0, maxItemLen))
    .slice(0, maxLen);
}

export async function signInWithGooglePopup() {
  const tokenStatus = await checkTokenServiceStatus();
  if (!tokenStatus.enabled && tokenStatus.activationUrl) {
    throw new TokenServiceDisabledError(tokenStatus.activationUrl);
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFirebase() {
  await firebaseSignOut(auth);
}

export async function fetchCloudPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  const path = `users/${uid}`;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid: String(d.uid),
      username: String(d.username),
      displayName: String(d.displayName),
      avatarId: String(d.avatarId || 'character-a'),
      experienceLevel: (d.experienceLevel as ExperienceLevel) || 'beginner',
      onboardingCompleted: Boolean(d.onboardingCompleted),
      totalXp: Number(d.totalXp || 0),
      dailyXp: Number(d.dailyXp || 0),
      weeklyXp: Number(d.weeklyXp || 0),
      lastDailyKey: String(d.lastDailyKey || ''),
      lastWeeklyKey: String(d.lastWeeklyKey || ''),
      coins: Number(d.coins || 0),
      currentStreak: Number(d.currentStreak || 0),
      longestStreak: Number(d.longestStreak || 0),
      lastActivityDate: String(d.lastActivityDate || ''),
      completedLessons: Array.isArray(d.completedLessons) ? d.completedLessons.map(String) : [],
      completedExercises: Array.isArray(d.completedExercises) ? d.completedExercises.map(String) : [],
      passedAssessments: Array.isArray(d.passedAssessments) ? d.passedAssessments.map(String) : [],
      completedMissions: Array.isArray(d.completedMissions) ? d.completedMissions.map(String) : [],
      unlockedAchievements: Array.isArray(d.unlockedAchievements) ? d.unlockedAchievements.map(String) : [],
      claimedDailyGoals: Array.isArray(d.claimedDailyGoals) ? d.claimedDailyGoals.map(String) : [],
      activityDates: Array.isArray(d.activityDates) ? d.activityDates.map(String) : [],
      graphicsQuality: (d.graphicsQuality as GraphicsQuality) === 'low' ? 'low' : 'high',
      soundMuted: Boolean(d.soundMuted),
      theme: (d.theme as ThemeMode) === 'light' ? 'light' : 'dark',
      isDemo: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createCloudPlayerOnboardingBatch(
  profile: PlayerProfile,
  email: string
): Promise<void> {
  const uid = sanitizeId(profile.uid, 128);
  const path = `users/${uid}`;
  try {
    const db = getDb();
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    const leaderboardRef = doc(db, 'leaderboard', uid);

    const safeUsername = sanitizeUsername(profile.username);
    const safeDisplayName = sanitizeDisplayName(profile.displayName);
    const safeAvatar = sanitizeId(profile.avatarId, 24);
    const totalXp = clampInt(profile.totalXp, 0, 1000000);
    const dailyXp = clampInt(profile.dailyXp, 0, 100000);
    const weeklyXp = clampInt(profile.weeklyXp, 0, 500000);

    batch.set(userRef, {
      uid,
      username: safeUsername,
      displayName: safeDisplayName,
      avatarId: safeAvatar,
      experienceLevel: profile.experienceLevel,
      onboardingCompleted: true,
      totalXp,
      dailyXp,
      weeklyXp,
      lastDailyKey: profile.lastDailyKey.slice(0, 16),
      lastWeeklyKey: profile.lastWeeklyKey.slice(0, 16),
      coins: clampInt(profile.coins, 0, 1000000),
      currentStreak: clampInt(profile.currentStreak, 0, 10000),
      longestStreak: clampInt(profile.longestStreak, 0, 10000),
      lastActivityDate: profile.lastActivityDate.slice(0, 16),
      completedLessons: clampStrArray(profile.completedLessons, 150, 64),
      completedExercises: clampStrArray(profile.completedExercises, 250, 64),
      passedAssessments: clampStrArray(profile.passedAssessments, 150, 64),
      completedMissions: clampStrArray(profile.completedMissions, 150, 64),
      unlockedAchievements: clampStrArray(profile.unlockedAchievements, 80, 64),
      claimedDailyGoals: clampStrArray(profile.claimedDailyGoals, 60, 64),
      activityDates: clampStrArray(profile.activityDates, 90, 16),
      graphicsQuality: profile.graphicsQuality,
      soundMuted: Boolean(profile.soundMuted),
      theme: profile.theme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(privateRef, {
      uid,
      email: (email || '').slice(0, 254),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(leaderboardRef, {
      uid,
      username: safeUsername,
      displayName: safeDisplayName,
      avatarId: safeAvatar,
      visibility: 'public',
      totalXp,
      dailyXp,
      weeklyXp,
      lastDailyKey: profile.lastDailyKey.slice(0, 16),
      lastWeeklyKey: profile.lastWeeklyKey.slice(0, 16),
      currentStreak: clampInt(computeEffectiveStreak(profile.currentStreak, profile.lastActivityDate), 0, 10000),
      achievementsCount: clampInt(profile.unlockedAchievements.length, 0, 80),
      lessonsCompletedCount: clampInt(profile.completedLessons.length, 0, 150),
      missionsCompletedCount: clampInt(profile.completedMissions.length, 0, 150),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudProfileIdentityBatch(
  uid: string,
  updates: {
    username: string;
    displayName: string;
    avatarId: string;
    experienceLevel: ExperienceLevel;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const db = getDb();
    const batch = writeBatch(db);
    const safeUsername = sanitizeUsername(updates.username);
    const safeDisplayName = sanitizeDisplayName(updates.displayName);
    const safeAvatar = sanitizeId(updates.avatarId, 24);

    batch.update(doc(db, 'users', uid), {
      username: safeUsername,
      displayName: safeDisplayName,
      avatarId: safeAvatar,
      experienceLevel: updates.experienceLevel,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'leaderboard', uid), {
      username: safeUsername,
      displayName: safeDisplayName,
      avatarId: safeAvatar,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCloudPlayerSettings(
  uid: string,
  settings: {
    graphicsQuality: GraphicsQuality;
    soundMuted: boolean;
    theme: ThemeMode;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      graphicsQuality: settings.graphicsQuality,
      soundMuted: Boolean(settings.soundMuted),
      theme: settings.theme,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordCloudProgressBatch(
  nextProfile: PlayerProfile,
  logsToCreate: {
    id: string;
    activityId: string;
    activityType: ActivityType;
    title: string;
    xpAmount: number;
    coinsAmount: number;
  }[],
  missionUpdate?: {
    worldId: string;
    bestScore: number;
    bestTimeSeconds: number;
    xpEarned: number;
    completionsCount: number;
    isNewRecordDoc: boolean;
  }
): Promise<void> {
  const uid = sanitizeId(nextProfile.uid, 128);
  const path = `users/${uid}`;
  try {
    const db = getDb();
    const batch = writeBatch(db);
    const totalXp = clampInt(nextProfile.totalXp, 0, 1000000);
    const dailyXp = clampInt(nextProfile.dailyXp, 0, 100000);
    const weeklyXp = clampInt(nextProfile.weeklyXp, 0, 500000);
    const effectiveStreak = clampInt(
      computeEffectiveStreak(nextProfile.currentStreak, nextProfile.lastActivityDate),
      0,
      10000
    );

    const completedLessons = clampStrArray(nextProfile.completedLessons, 150, 64);
    const completedExercises = clampStrArray(nextProfile.completedExercises, 250, 64);
    const passedAssessments = clampStrArray(nextProfile.passedAssessments, 150, 64);
    const completedMissions = clampStrArray(nextProfile.completedMissions, 150, 64);
    const unlockedAchievements = clampStrArray(nextProfile.unlockedAchievements, 80, 64);
    const claimedDailyGoals = clampStrArray(nextProfile.claimedDailyGoals, 60, 64);
    const activityDates = clampStrArray(nextProfile.activityDates, 90, 16);

    batch.update(doc(db, 'users', uid), {
      totalXp,
      dailyXp,
      weeklyXp,
      lastDailyKey: nextProfile.lastDailyKey.slice(0, 16),
      lastWeeklyKey: nextProfile.lastWeeklyKey.slice(0, 16),
      coins: clampInt(nextProfile.coins, 0, 1000000),
      currentStreak: clampInt(nextProfile.currentStreak, 0, 10000),
      longestStreak: clampInt(nextProfile.longestStreak, 0, 10000),
      lastActivityDate: nextProfile.lastActivityDate.slice(0, 16),
      completedLessons,
      completedExercises,
      passedAssessments,
      completedMissions,
      unlockedAchievements,
      claimedDailyGoals,
      activityDates,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'leaderboard', uid), {
      totalXp,
      dailyXp,
      weeklyXp,
      lastDailyKey: nextProfile.lastDailyKey.slice(0, 16),
      lastWeeklyKey: nextProfile.lastWeeklyKey.slice(0, 16),
      currentStreak: effectiveStreak,
      achievementsCount: clampInt(unlockedAchievements.length, 0, 80),
      lessonsCompletedCount: clampInt(completedLessons.length, 0, 150),
      missionsCompletedCount: clampInt(completedMissions.length, 0, 150),
      updatedAt: serverTimestamp(),
    });

    for (const log of logsToCreate) {
      const safeLogId = sanitizeId(log.id, 120);
      const logRef = doc(db, 'users', uid, 'activityLogs', safeLogId);
      batch.set(logRef, {
        userId: uid,
        activityId: sanitizeId(log.activityId, 64),
        activityType: log.activityType,
        title: log.title.trim().slice(0, 120) || 'Learning Activity',
        xpAmount: clampInt(log.xpAmount, 0, 5000),
        coinsAmount: clampInt(log.coinsAmount, 0, 5000),
        createdAt: serverTimestamp(),
      });
    }

    if (missionUpdate) {
      const safeWorldId = sanitizeId(missionUpdate.worldId, 32);
      const missionRef = doc(db, 'users', uid, 'missionRecords', safeWorldId);
      if (missionUpdate.isNewRecordDoc) {
        batch.set(missionRef, {
          userId: uid,
          worldId: safeWorldId,
          bestScore: clampInt(missionUpdate.bestScore, 0, 10000),
          bestTimeSeconds: clampInt(missionUpdate.bestTimeSeconds, 1, 86400),
          xpEarned: clampInt(missionUpdate.xpEarned, 0, 10000),
          completionsCount: clampInt(missionUpdate.completionsCount, 1, 10000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(missionRef, {
          bestScore: clampInt(missionUpdate.bestScore, 0, 10000),
          bestTimeSeconds: clampInt(missionUpdate.bestTimeSeconds, 1, 86400),
          xpEarned: clampInt(missionUpdate.xpEarned, 0, 10000),
          completionsCount: clampInt(missionUpdate.completionsCount, 1, 10000),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCloudUserSubcollections(uid: string): Promise<{
  missionRecords: Record<string, MissionRecordData>;
  activityLogs: ActivityLogItem[];
}> {
  const missionsPath = `users/${uid}/missionRecords`;
  const logsPath = `users/${uid}/activityLogs`;
  const missionRecords: Record<string, MissionRecordData> = {};
  const activityLogs: ActivityLogItem[] = [];
  const db = getDb();

  try {
    const missionsQ = query(collection(db, 'users', uid, 'missionRecords'), where('userId', '==', uid));
    const missionsSnap = await getDocs(missionsQ);
    missionsSnap.forEach((d) => {
      const data = d.data();
      missionRecords[String(data.worldId)] = {
        userId: String(data.userId),
        worldId: String(data.worldId),
        bestScore: Number(data.bestScore || 0),
        bestTimeSeconds: Number(data.bestTimeSeconds || 60),
        xpEarned: Number(data.xpEarned || 0),
        completionsCount: Number(data.completionsCount || 1),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, missionsPath);
  }

  try {
    const logsQ = query(collection(db, 'users', uid, 'activityLogs'), where('userId', '==', uid));
    const logsSnap = await getDocs(logsQ);
    logsSnap.forEach((d) => {
      const data = d.data();
      const createdAtVal = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      activityLogs.push({
        id: d.id,
        userId: String(data.userId),
        activityId: String(data.activityId),
        activityType: data.activityType as ActivityType,
        title: String(data.title),
        xpAmount: Number(data.xpAmount || 0),
        coinsAmount: Number(data.coinsAmount || 0),
        timestampIso: createdAtVal,
      });
    });
    activityLogs.sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, logsPath);
  }

  return { missionRecords, activityLogs };
}

export function subscribePublicLeaderboard(
  onUpdate: (players: LeaderboardPlayer[]) => void
): () => void {
  const path = 'leaderboard';
  const db = getDb();
  const q = query(collection(db, 'leaderboard'), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snap) => {
      const players: LeaderboardPlayer[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        players.push({
          uid: String(d.uid),
          username: String(d.username),
          displayName: String(d.displayName),
          avatarId: String(d.avatarId || 'character-a'),
          totalXp: Number(d.totalXp || 0),
          dailyXp: Number(d.dailyXp || 0),
          weeklyXp: Number(d.weeklyXp || 0),
          lastDailyKey: String(d.lastDailyKey || ''),
          lastWeeklyKey: String(d.lastWeeklyKey || ''),
          currentStreak: Number(d.currentStreak || 0),
          achievementsCount: Number(d.achievementsCount || 0),
          lessonsCompletedCount: Number(d.lessonsCompletedCount || 0),
          missionsCompletedCount: Number(d.missionsCompletedCount || 0),
          isDemoNpc: false,
        });
      });
      onUpdate(players);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export const WORLD1_SITE_KEYS: World1SiteId[] = [
  'beacon',
  'workshop',
  'gatehouse',
  'bridge',
  'staircase',
  'lantern_grove',
  'map_station',
  'repair_district',
  'registration_centre',
  'grand_settlement',
];

export function makeDefaultWorld1State(uid: string, defaultVillagerName = 'Explorer'): World1PersistentState {
  return {
    userId: uid,
    worldId: 'world-1',
    completedLevels: [],
    completedTaskIds: [],
    purchasedSupplyIds: [],
    collectedSupplyIds: [],
    structureStages: {
      beacon: 0,
      workshop: 0,
      gatehouse: 0,
      bridge: 0,
      staircase: 0,
      lantern_grove: 0,
      map_station: 0,
      repair_district: 0,
      registration_centre: 0,
      grand_settlement: 0,
    },
    playerX: -26,
    playerY: 0,
    playerZ: 34,
    unlockedForestOutfit: false,
    equippedForestOutfit: false,
    unlockedCompanionAccessory: false,
    equippedCompanionAccessory: false,
    registeredVillagerName: defaultVillagerName.trim().slice(0, 32) || 'Explorer',
    registeredCrystalCount: 12,
    cinematicTourCompleted: false,
    freeRoamUnlocked: false,
    updatedAtIso: new Date().toISOString(),
  };
}

export async function fetchCloudWorld1State(uid: string): Promise<{
  state: World1PersistentState | null;
  exists: boolean;
}> {
  const safeUid = sanitizeId(uid, 128);
  const path = `users/${safeUid}/worldState/world-1`;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'users', safeUid, 'worldState', 'world-1'));
    if (!snap.exists()) {
      return { state: null, exists: false };
    }
    const d = snap.data();
    const rawStages = (d.structureStages || {}) as Record<string, unknown>;
    const stages = {
      beacon: clampInt(Number(rawStages.beacon || 0), 0, 4),
      workshop: clampInt(Number(rawStages.workshop || 0), 0, 4),
      gatehouse: clampInt(Number(rawStages.gatehouse || 0), 0, 4),
      bridge: clampInt(Number(rawStages.bridge || 0), 0, 4),
      staircase: clampInt(Number(rawStages.staircase || 0), 0, 4),
      lantern_grove: clampInt(Number(rawStages.lantern_grove || 0), 0, 4),
      map_station: clampInt(Number(rawStages.map_station || 0), 0, 4),
      repair_district: clampInt(Number(rawStages.repair_district || 0), 0, 4),
      registration_centre: clampInt(Number(rawStages.registration_centre || 0), 0, 4),
      grand_settlement: clampInt(Number(rawStages.grand_settlement || 0), 0, 4),
    };
    const levelKeys: string[] = Array.isArray(d.completedLevelKeys)
      ? d.completedLevelKeys.map(String)
      : [];
    const completedLevels = levelKeys
      .map((k) => Number(k.replace(/^W1_L/, '')))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 10);

    const updatedAtIso = d.updatedAt?.toDate
      ? d.updatedAt.toDate().toISOString()
      : new Date().toISOString();

    return {
      exists: true,
      state: {
        userId: safeUid,
        worldId: 'world-1',
        completedLevels,
        completedTaskIds: Array.isArray(d.completedTaskIds) ? d.completedTaskIds.map(String) : [],
        purchasedSupplyIds: Array.isArray(d.purchasedSupplyIds)
          ? d.purchasedSupplyIds.map(String)
          : [],
        collectedSupplyIds: Array.isArray(d.collectedSupplyIds)
          ? d.collectedSupplyIds.map(String)
          : [],
        structureStages: stages,
        playerX: Number.isFinite(Number(d.playerX)) ? Number(d.playerX) : -26,
        playerY: Number.isFinite(Number(d.playerY)) ? Number(d.playerY) : 0,
        playerZ: Number.isFinite(Number(d.playerZ)) ? Number(d.playerZ) : 34,
        unlockedForestOutfit: Boolean(d.unlockedForestOutfit),
        equippedForestOutfit: Boolean(d.equippedForestOutfit),
        unlockedCompanionAccessory: Boolean(d.unlockedCompanionAccessory),
        equippedCompanionAccessory: Boolean(d.equippedCompanionAccessory),
        registeredVillagerName: String(d.registeredVillagerName || 'Explorer').slice(0, 32) || 'Explorer',
        registeredCrystalCount: clampInt(Number(d.registeredCrystalCount ?? 12), 0, 100000),
        cinematicTourCompleted: Boolean(d.cinematicTourCompleted),
        freeRoamUnlocked: Boolean(d.freeRoamUnlocked),
        updatedAtIso,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCloudWorld1State(
  uid: string,
  state: World1PersistentState,
  isNewDoc: boolean
): Promise<void> {
  const safeUid = sanitizeId(uid, 128);
  const path = `users/${safeUid}/worldState/world-1`;
  const completedLevelKeys = clampStrArray(
    Array.from(new Set(state.completedLevels))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 10)
      .sort((a, b) => a - b)
      .map((n) => `W1_L${Math.trunc(n)}`),
    12,
    16
  );
  const completedTaskIds = clampStrArray(Array.from(new Set(state.completedTaskIds)), 50, 32);
  const purchasedSupplyIds = clampStrArray(Array.from(new Set(state.purchasedSupplyIds || [])), 20, 32);
  const collectedSupplyIds = clampStrArray(Array.from(new Set(state.collectedSupplyIds || [])), 20, 32);
  const structureStages = {
    beacon: clampInt(state.structureStages.beacon, 0, 4),
    workshop: clampInt(state.structureStages.workshop, 0, 4),
    gatehouse: clampInt(state.structureStages.gatehouse, 0, 4),
    bridge: clampInt(state.structureStages.bridge, 0, 4),
    staircase: clampInt(state.structureStages.staircase, 0, 4),
    lantern_grove: clampInt(state.structureStages.lantern_grove, 0, 4),
    map_station: clampInt(state.structureStages.map_station, 0, 4),
    repair_district: clampInt(state.structureStages.repair_district, 0, 4),
    registration_centre: clampInt(state.structureStages.registration_centre, 0, 4),
    grand_settlement: clampInt(state.structureStages.grand_settlement, 0, 4),
  };
  const playerX = Math.max(-200, Math.min(200, Math.round((state.playerX || 0) * 100) / 100));
  const playerY = Math.max(-20, Math.min(100, Math.round((state.playerY || 0) * 100) / 100));
  const playerZ = Math.max(-200, Math.min(200, Math.round((state.playerZ || 0) * 100) / 100));
  const registeredVillagerName =
    (state.registeredVillagerName || 'Explorer').trim().slice(0, 32) || 'Explorer';
  const registeredCrystalCount = clampInt(state.registeredCrystalCount, 0, 100000);

  const mutableFields = {
    completedLevelKeys,
    completedTaskIds,
    purchasedSupplyIds,
    collectedSupplyIds,
    structureStages,
    playerX,
    playerY,
    playerZ,
    unlockedForestOutfit: Boolean(state.unlockedForestOutfit),
    equippedForestOutfit: Boolean(state.equippedForestOutfit),
    unlockedCompanionAccessory: Boolean(state.unlockedCompanionAccessory),
    equippedCompanionAccessory: Boolean(state.equippedCompanionAccessory),
    registeredVillagerName,
    registeredCrystalCount,
    cinematicTourCompleted: Boolean(state.cinematicTourCompleted),
    freeRoamUnlocked: Boolean(state.freeRoamUnlocked),
    updatedAt: serverTimestamp(),
  };

  try {
    const db = getDb();
    const ref = doc(db, 'users', safeUid, 'worldState', 'world-1');
    if (isNewDoc) {
      await setDoc(ref, {
        userId: safeUid,
        worldId: 'world-1',
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, mutableFields);
    }
  } catch (error) {
    handleFirestoreError(error, isNewDoc ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

