import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  ActivityLogItem,
  ActivityType,
  AppSection,
  ExperienceLevel,
  GameRoom,
  GraphicsQuality,
  LeaderboardPlayer,
  LevelStageNumber,
  MissionRecordData,
  PlayerProfile,
  RewardNotification,
  RoomGameMode,
  RoomInvitation,
  ThemeMode,
  World1PersistentState,
  World1SiteId,
} from '../types/codeland';
import {
  auth,
  createCloudPlayerOnboardingBatch,
  fetchCloudPlayerProfile,
  fetchCloudUserSubcollections,
  fetchCloudWorld1State,
  initializeFirebaseBoot,
  makeDefaultWorld1State,
  recordCloudProgressBatch,
  saveCloudWorld1State,
  signInWithGooglePopup,
  signOutFirebase,
  subscribePublicLeaderboard,
  TokenServiceDisabledError,
  updateCloudPlayerSettings,
  updateCloudProfileIdentityBatch,
  WORLD1_SITE_KEYS,
} from '../lib/firebase';
import {
  computeEffectiveStreak,
  computeStreakAfterQualifyingActivity,
  formatLocalDateKey,
  getIsoWeekKey,
} from '../lib/dateUtils';
import { ACHIEVEMENTS_CATALOG, getDemoChallengerLeaderboard } from '../data/charactersAndBadges';
import { MARKETPLACE_ITEMS } from '../data/marketplaceData';
import { WINTER_CHALLENGES } from '../data/winterEventData';
import { JAVA_CURRICULUM } from '../data/curriculum';
import {
  CAMPAIGN_LEVELS_100,
  getCampaignLevel,
  getCampaignWorldMeta,
  getLevelsForWorld,
} from '../data/campaign100';
import { soundFX } from '../lib/audio';
import {
  CodelandSocketConnection,
  extractRoomCodeFromLocation,
  fetchActiveRoomForUser,
  joinPrivateRoom,
  loadPendingInviteRoomCode,
  normalizeRoomCode,
  resolveCanonicalAppOrigin,
  respondToRoomInvite,
  savePendingInviteRoomCode,
  syncServerDailyStreak,
} from '../lib/multiplayerClient';

const DEMO_STORAGE_KEY = 'codeland_demo_account_v1';
const DEMO_ACTIVE_FLAG = 'codeland_demo_session_active';

interface DemoStoredBundle {
  profile: PlayerProfile;
  missionRecords: Record<string, MissionRecordData>;
  activityLogs: ActivityLogItem[];
  todayExercisesSolvedMap: Record<string, number>;
  world1State?: World1PersistentState;
}

interface PlayerContextValue {
  section: AppSection;
  setSection: (sec: AppSection) => void;
  activeLessonId: string;
  setActiveLessonId: (id: string) => void;
  activeWorldId: string;
  setActiveWorldId: (id: string) => void;
  activeCampaignLevel: number;
  setActiveCampaignLevel: (lvl: number) => void;
  activeStage: LevelStageNumber;
  setActiveStage: (stage: LevelStageNumber) => void;
  certificateOpen: boolean;
  setCertificateOpen: (open: boolean) => void;
  glossaryOpen: boolean;
  setGlossaryOpen: (open: boolean) => void;
  authLoading: boolean;
  authError: string | null;
  tokenServiceActivationUrl: string | null;
  clearAuthError: () => void;
  firebaseUser: User | null;
  profile: PlayerProfile | null;
  effectiveStreak: number;
  totalActiveDays: number;
  missionRecords: Record<string, MissionRecordData>;
  activityLogs: ActivityLogItem[];
  cloudLeaderboard: LeaderboardPlayer[];
  demoChallengers: LeaderboardPlayer[];
  notifications: RewardNotification[];
  dismissNotification: (id: string) => void;
  pushToast: (notif: Omit<RewardNotification, 'id'>) => void;
  theme: ThemeMode;
  toggleThemeQuick: () => void;

  // Multiplayer & Direct Invites state
  canonicalAppOrigin: string;
  activeRoom: GameRoom | null;
  setActiveRoom: React.Dispatch<React.SetStateAction<GameRoom | null>>;
  pendingInviteRoomCode: string | null;
  previewRoomCode: string | null;
  setPreviewRoomCode: (code: string | null) => void;
  createModalRequested: boolean;
  setCreateModalRequested: (open: boolean) => void;
  openCreatePrivateRoomFlow: () => void;
  openJoinRoomPreviewFlow: (code: string) => void;
  joinRoomByCodeAction: (code: string) => Promise<GameRoom>;
  incomingInvitations: RoomInvitation[];
  acceptDirectInviteAndJoin: (inv: RoomInvitation) => Promise<void>;
  declineDirectInvite: (inv: RoomInvitation) => Promise<void>;
  friendsRevision: number;
  bumpFriendsRevision: () => void;
  remotePlayerPoses: Record<string, { yawDeg: number; pitchDeg: number }>;
  emitArenaPose: (yawDeg: number, pitchDeg: number) => void;
  completeMultiplayerMatchReward: (
    roomId: string,
    roomCode: string,
    mode: RoomGameMode,
    wonOrCoopSuccess: boolean,
    score: number
  ) => Promise<void>;

  // Auth & Onboarding actions
  loginWithGoogle: () => Promise<void>;
  enterDemoMode: () => void;
  completeOnboarding: (input: {
    username: string;
    displayName: string;
    experienceLevel: ExperienceLevel;
    avatarId: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetDemoAccount: () => void;

  // Progression helpers
  isLevelAcademyUnlocked: (levelNumber: number) => boolean;
  isLessonUnlocked: (lessonId: string) => boolean;
  isWorldUnlocked: (levelNumber: number) => boolean;
  isCampaignLevelUnlocked: (levelNumber: number) => boolean;
  getCampaignLevelProgress: (levelNumber: number) => {
    unlocked: boolean;
    lessonDone: boolean;
    practiceDone: boolean;
    missionDone: boolean;
  };
  nextIncompleteCampaignLevel: number;
  completedCampaignLevelsCount: number;
  completedCampaignLessonsCount: number;
  openLesson: (lessonId: string) => void;
  openWorld: (worldId: string, explicitLevelNumber?: number) => void;
  openCampaignLevel: (levelNumber: number, stage?: LevelStageNumber) => void;

  // Reward & Progression mutations
  completeLesson: (lessonId: string, lessonTitle: string) => Promise<{ firstTime: boolean }>;
  completePracticeExercise: (exerciseId: string, exerciseTitle: string) => Promise<{ firstTime: boolean }>;
  passLevelAssessment: (levelNumber: number, scorePercent: number) => Promise<{ firstTime: boolean }>;
  completeWorldMission: (
    worldId: string,
    missionTitle: string,
    score: number,
    timeSeconds: number,
    collectedCoinsCount: number
  ) => Promise<{ firstTime: boolean; totalCoinsAwarded: number; xpAwarded: number }>;
  completeCampaignLesson: (levelNumber: number) => Promise<{ firstTime: boolean }>;
  completeCampaignGuidedPractice: (levelNumber: number) => Promise<{ firstTime: boolean }>;
  completeCampaignMission3D: (
    levelNumber: number,
    score: number,
    timeSeconds: number,
    collectedCoinsCount: number
  ) => Promise<{
    firstTime: boolean;
    totalCoinsAwarded: number;
    xpAwarded: number;
    unlockedWorldBadgeTitle?: string;
    unlockedCertificate?: boolean;
  }>;

  // Profile & Settings customization
  saveProfileCustomization: (updates: {
    username: string;
    displayName: string;
    avatarId: string;
    experienceLevel: ExperienceLevel;
  }) => Promise<void>;
  saveSettings: (updates: {
    graphicsQuality: GraphicsQuality;
    soundMuted: boolean;
    theme: ThemeMode;
  }) => Promise<void>;

  // Daily goal counters & Daily Reward Chest
  dailyGoalStatus: {
    lessonDone: boolean;
    exercisesCount: number;
    missionDone: boolean;
  };
  dailyRewardClaimedToday: boolean;
  claimDailyRewardChest: () => Promise<{
    claimed: boolean;
    xpAwarded: number;
    coinsAwarded: number;
    streakBonusCoins: number;
  }>;

  // Marketplace & Inventory
  ownedItemIds: string[];
  equippedSkinId: string;
  equippedPetId: string;
  equippedAccessoryId: string;
  equippedThemeId: string;
  buyMarketplaceItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  equipMarketplaceItem: (itemId: string) => Promise<void>;
  unequipMarketplaceItem: (category: 'skins' | 'pets' | 'accessories' | 'themes') => Promise<void>;

  // Winter Event
  completedWinterChallengeIds: string[];
  completeWinterChallenge: (challengeId: string) => Promise<{ success: boolean; xpAwarded: number; coinsAwarded: number }>;

  // World 1 — The Beginner's Forest Persistent Settlement State & Actions
  world1State: World1PersistentState;
  recordWorld1TaskSolved: (params: {
    levelNumber: number;
    siteId: World1SiteId;
    taskId: string;
    newStage: number;
    xpBonus: number;
    coinBonus: number;
    playerPos?: [number, number, number];
    scannerRegistration?: { name: string; crystals: number };
    purchasedSupplyId?: string;
  }) => Promise<{ firstTimeTask: boolean }>;
  collectWorld1Supply: (
    supplyId: string,
    playerPos?: [number, number, number]
  ) => Promise<{ firstTimeCollect: boolean }>;
  completeWorld1Level: (params: {
    levelNumber: number;
    siteId: World1SiteId;
    score: number;
    timeSeconds: number;
    collectedCoinsCount: number;
    playerPos?: [number, number, number];
  }) => Promise<{
    firstTime: boolean;
    xpAwarded: number;
    totalCoinsAwarded: number;
    world1RestoredNow: boolean;
  }>;
  saveWorld1Checkpoint: (pos: [number, number, number]) => Promise<void>;
  toggleWorld1Cosmetics: (updates: {
    equippedForestOutfit?: boolean;
    equippedCompanionAccessory?: boolean;
  }) => Promise<void>;
  updateWorld1ScannerRegistration: (name: string, crystals: number) => Promise<void>;
  markWorld1CinematicTourDone: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function makeDefaultProfile(uid: string, isDemo: boolean, displayName = 'Explorer', username = 'explorer_01'): PlayerProfile {
  const today = formatLocalDateKey();
  const week = getIsoWeekKey();
  return {
    uid,
    username,
    displayName,
    avatarId: 'character-a',
    experienceLevel: 'beginner',
    onboardingCompleted: false,
    totalXp: 0,
    dailyXp: 0,
    weeklyXp: 0,
    lastDailyKey: today,
    lastWeeklyKey: week,
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: '',
    completedLessons: [],
    completedExercises: [],
    passedAssessments: [],
    completedMissions: [],
    unlockedAchievements: [],
    claimedDailyGoals: [],
    activityDates: [],
    graphicsQuality: 'high',
    soundMuted: false,
    theme: 'dark',
    isDemo,
  };
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [section, setSection] = useState<AppSection>(AppSection.LANDING);
  const [activeLessonId, setActiveLessonId] = useState<string>('1-1');
  const [activeWorldId, setActiveWorldId] = useState<string>('world-1');
  const [activeCampaignLevel, setActiveCampaignLevel] = useState<number>(1);
  const [activeStage, setActiveStage] = useState<LevelStageNumber>(1);
  const [certificateOpen, setCertificateOpen] = useState<boolean>(false);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);

  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenServiceActivationUrl, setTokenServiceActivationUrl] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [missionRecords, setMissionRecords] = useState<Record<string, MissionRecordData>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [todayExercisesMap, setTodayExercisesMap] = useState<Record<string, number>>({});
  const [cloudLeaderboard, setCloudLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [notifications, setNotifications] = useState<RewardNotification[]>([]);
  const [guestTheme, setGuestTheme] = useState<ThemeMode>('dark');
  const [totalActiveDays, setTotalActiveDays] = useState<number>(0);
  const [world1State, setWorld1State] = useState<World1PersistentState>(() =>
    makeDefaultWorld1State('guest', 'Explorer')
  );
  const world1StateRef = React.useRef<World1PersistentState>(world1State);
  world1StateRef.current = world1State;
  const world1CloudDocExistsRef = React.useRef<boolean>(false);

  // Multiplayer & Deep-Link Invite state
  const [canonicalAppOrigin, setCanonicalAppOrigin] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [pendingInviteRoomCode, setPendingInviteRoomCode] = useState<string | null>(() => {
    const fromUrl = extractRoomCodeFromLocation();
    if (fromUrl) {
      savePendingInviteRoomCode(fromUrl);
      return fromUrl;
    }
    return loadPendingInviteRoomCode();
  });
  const [previewRoomCode, setPreviewRoomCode] = useState<string | null>(null);
  const [createModalRequested, setCreateModalRequested] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [incomingInvitations, setIncomingInvitations] = useState<RoomInvitation[]>([]);
  const [friendsRevision, setFriendsRevision] = useState<number>(0);
  const [remotePlayerPoses, setRemotePlayerPoses] = useState<
    Record<string, { yawDeg: number; pitchDeg: number }>
  >({});
  const socketRef = React.useRef<CodelandSocketConnection | null>(null);
  const syncedLoginDateRef = React.useRef<string>('');
  const rewardedMatchIdsRef = React.useRef<Set<string>>(new Set());

  const reconcileWorld1StateWithProfile = useCallback(
    (rawState: World1PersistentState | null | undefined, p: PlayerProfile): World1PersistentState => {
      const base = rawState
        ? {
            ...rawState,
            userId: p.uid,
            structureStages: { ...rawState.structureStages },
            completedLevels: [...rawState.completedLevels],
            completedTaskIds: [...rawState.completedTaskIds],
            purchasedSupplyIds: Array.isArray(rawState.purchasedSupplyIds)
              ? [...rawState.purchasedSupplyIds]
              : [],
            collectedSupplyIds: Array.isArray(rawState.collectedSupplyIds)
              ? [...rawState.collectedSupplyIds]
              : [],
          }
        : makeDefaultWorld1State(p.uid, p.displayName);

      for (let i = 0; i < WORLD1_SITE_KEYS.length; i++) {
        const lvlNum = i + 1;
        const siteKey = WORLD1_SITE_KEYS[i];
        if (p.completedMissions.includes(`M${lvlNum}`)) {
          base.structureStages[siteKey] = Math.max(base.structureStages[siteKey] || 0, 4);
          if (!base.completedLevels.includes(lvlNum)) {
            base.completedLevels.push(lvlNum);
          }
        }
      }
      if ((base.structureStages.workshop || 0) >= 3 && !base.purchasedSupplyIds.includes('workshop_supplies')) {
        base.purchasedSupplyIds.push('workshop_supplies');
      }
      if ((base.structureStages.workshop || 0) >= 4 && !base.collectedSupplyIds.includes('workshop_supplies')) {
        base.collectedSupplyIds.push('workshop_supplies');
      }
      const allTenDone = WORLD1_SITE_KEYS.every((k) => (base.structureStages[k] || 0) >= 4);
      if (allTenDone || p.completedMissions.includes('M10')) {
        base.unlockedForestOutfit = true;
        base.unlockedCompanionAccessory = true;
        base.freeRoamUnlocked = true;
      }
      if (!base.registeredVillagerName || base.registeredVillagerName === 'Explorer') {
        base.registeredVillagerName = (p.displayName || 'Explorer').slice(0, 32) || 'Explorer';
      }
      return base;
    },
    []
  );

  const demoChallengers = useMemo(() => getDemoChallengerLeaderboard(), []);

  const pushNotification = useCallback((notif: Omit<RewardNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) => [...prev.slice(-3), { ...notif, id }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5200);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Sync HTML .dark class and audio mute state
  const activeTheme: ThemeMode = profile ? profile.theme : guestTheme;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');
  }, [activeTheme]);

  useEffect(() => {
    soundFX.setMuted(profile ? profile.soundMuted : false);
  }, [profile]);

  // Persist demo state helper
  const saveDemoBundle = useCallback(
    (
      nextProfile: PlayerProfile,
      nextMissions: Record<string, MissionRecordData>,
      nextLogs: ActivityLogItem[],
      nextExMap: Record<string, number>,
      explicitWorld1?: World1PersistentState
    ) => {
      if (!nextProfile.isDemo) return;
      const bundle: DemoStoredBundle = {
        profile: nextProfile,
        missionRecords: nextMissions,
        activityLogs: nextLogs,
        todayExercisesSolvedMap: nextExMap,
        world1State: explicitWorld1 || world1StateRef.current,
      };
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(bundle));
        localStorage.setItem(DEMO_ACTIVE_FLAG, 'true');
      } catch {
        // Ignore storage quota issues
      }
    },
    []
  );

  // Boot Firebase safely (clearing any stale token if Token Service API is disabled) before listening
  useEffect(() => {
    let isCancelled = false;
    let unsubscribeAuth: (() => void) | null = null;

    void (async () => {
      const boot = await initializeFirebaseBoot();
      if (isCancelled) return;

      if (!boot.tokenServiceEnabled && boot.activationUrl) {
        setTokenServiceActivationUrl(boot.activationUrl);
      }

      if (boot.clearedStaleUser && !boot.tokenServiceEnabled) {
        // Ensure user is not stranded if a previous Google login cached an un-refreshable token
        const hasExistingDemo = Boolean(localStorage.getItem(DEMO_STORAGE_KEY));
        if (!hasExistingDemo) {
          const baseName = boot.clearedStaleUser.displayName || 'Java Explorer';
          const cleanHandle =
            baseName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'explorer_01';
          const fallbackDemo = makeDefaultProfile(
            'demo-local-explorer',
            true,
            baseName,
            cleanHandle
          );
          try {
            localStorage.setItem(
              DEMO_STORAGE_KEY,
              JSON.stringify({
                profile: fallbackDemo,
                missionRecords: {},
                activityLogs: [],
                todayExercisesSolvedMap: {},
              } satisfies DemoStoredBundle)
            );
            localStorage.setItem(DEMO_ACTIVE_FLAG, 'true');
          } catch {
            // Ignore storage quota errors
          }
        } else {
          try {
            localStorage.setItem(DEMO_ACTIVE_FLAG, 'true');
          } catch {
            // Ignore storage quota errors
          }
        }
        setAuthError(
          'Google Cloud Token Service API (securetoken.googleapis.com) is currently disabled in your Firebase project, so Cloud Firestore cannot refresh auth tokens yet. Switched safely to Local Explorer Mode until the API is enabled.'
        );
      }

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (isCancelled) return;
        setFirebaseUser(user);
        if (user) {
          try {
            localStorage.removeItem(DEMO_ACTIVE_FLAG);
            const existingProfile = await fetchCloudPlayerProfile(user.uid);
            if (isCancelled) return;
            if (existingProfile && existingProfile.onboardingCompleted) {
              const [subs, w1Res] = await Promise.all([
                fetchCloudUserSubcollections(user.uid),
                fetchCloudWorld1State(user.uid),
              ]);
              if (isCancelled) return;
              world1CloudDocExistsRef.current = w1Res.exists;
              const reconciledW1 = reconcileWorld1StateWithProfile(w1Res.state, existingProfile);
              setWorld1State(reconciledW1);
              setProfile(existingProfile);
              setMissionRecords(subs.missionRecords);
              setActivityLogs(subs.activityLogs);
              const savedInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode();
              if (savedInvite) {
                setPreviewRoomCode(savedInvite);
                setPendingInviteRoomCode(null);
                savePendingInviteRoomCode(null);
                setSection(AppSection.MULTIPLAYER);
              } else {
                setSection((prev) =>
                  prev === AppSection.LANDING || prev === AppSection.AUTH || prev === AppSection.ONBOARDING
                    ? AppSection.DASHBOARD
                    : prev
                );
              }
            } else {
              const baseName = user.displayName || 'Java Explorer';
              const cleanHandle =
                baseName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'explorer';
              const freshProf = makeDefaultProfile(user.uid, false, baseName, cleanHandle);
              world1CloudDocExistsRef.current = false;
              setWorld1State(makeDefaultWorld1State(user.uid, baseName));
              setProfile(freshProf);
              setSection(AppSection.ONBOARDING);
            }
          } catch (err) {
            console.error('Failed to load cloud profile:', err);
            setAuthError('Could not load cloud profile. Check connection or try Demo Mode.');
          } finally {
            if (!isCancelled) setAuthLoading(false);
          }
        } else {
          // Check if user had an active Demo session before refresh
          try {
            const isDemoActive = localStorage.getItem(DEMO_ACTIVE_FLAG) === 'true';
            const rawBundle = localStorage.getItem(DEMO_STORAGE_KEY);
            if (isDemoActive && rawBundle) {
              const parsed = JSON.parse(rawBundle) as DemoStoredBundle;
              if (parsed?.profile) {
                const reconciledW1 = reconcileWorld1StateWithProfile(
                  parsed.world1State,
                  parsed.profile
                );
                setWorld1State(reconciledW1);
                setProfile(parsed.profile);
                setMissionRecords(parsed.missionRecords || {});
                setActivityLogs(parsed.activityLogs || []);
                setTodayExercisesMap(parsed.todayExercisesSolvedMap || {});
                const savedInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode();
                if (savedInvite && parsed.profile.onboardingCompleted) {
                  setPreviewRoomCode(savedInvite);
                  setPendingInviteRoomCode(null);
                  savePendingInviteRoomCode(null);
                  setSection(AppSection.MULTIPLAYER);
                } else {
                  setSection((prev) =>
                    prev === AppSection.LANDING || prev === AppSection.AUTH
                      ? parsed.profile.onboardingCompleted
                        ? AppSection.DASHBOARD
                        : AppSection.ONBOARDING
                      : prev
                  );
                }
              } else {
                const urlInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode();
                if (urlInvite) {
                  setSection(AppSection.AUTH);
                }
              }
            } else {
              const urlInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode();
              if (urlInvite) {
                setSection(AppSection.AUTH);
              }
            }
          } catch {
            // Ignore malformed local storage
          }
          if (!isCancelled) setAuthLoading(false);
        }
      });
    })();

    return () => {
      isCancelled = true;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Subscribe to live Firestore Leaderboard ONLY when authenticated with Firebase
  useEffect(() => {
    if (!firebaseUser || !profile || profile.isDemo || !profile.onboardingCompleted) {
      setCloudLeaderboard([]);
      return;
    }
    const unsub = subscribePublicLeaderboard((players) => {
      setCloudLeaderboard(players);
    });
    return () => unsub();
  }, [firebaseUser, profile]);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGooglePopup();
      setTokenServiceActivationUrl(null);
    } catch (err) {
      if (err instanceof TokenServiceDisabledError) {
        setTokenServiceActivationUrl(err.activationUrl);
        setAuthError(
          'Google Cloud Token Service API (securetoken.googleapis.com) is disabled in your Firebase project (695309526294). Enable it in Google Cloud Console using the link below, wait 1–2 minutes, and retry—or launch Local Demo Explorer immediately.'
        );
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(
          'Google Sign-In popup could not complete in this browser frame. You can retry or launch the local Demo Explorer account below.'
        );
      }
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    setAuthError(null);
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoStoredBundle;
        if (parsed?.profile) {
          localStorage.setItem(DEMO_ACTIVE_FLAG, 'true');
          setWorld1State(reconcileWorld1StateWithProfile(parsed.world1State, parsed.profile));
          setProfile(parsed.profile);
          setMissionRecords(parsed.missionRecords || {});
          setActivityLogs(parsed.activityLogs || []);
          setTodayExercisesMap(parsed.todayExercisesSolvedMap || {});
          if (parsed.profile.onboardingCompleted) {
            const savedInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode();
            if (savedInvite) {
              setPreviewRoomCode(savedInvite);
              setPendingInviteRoomCode(null);
              savePendingInviteRoomCode(null);
              setSection(AppSection.MULTIPLAYER);
            } else {
              setSection(AppSection.DASHBOARD);
            }
          } else {
            setSection(AppSection.ONBOARDING);
          }
          return;
        }
      }
    } catch {
      // Create fresh demo account
    }
    const fresh = makeDefaultProfile('demo-local-explorer', true, 'Alex Explorer', 'alex_voxel');
    setWorld1State(makeDefaultWorld1State('demo-local-explorer', 'Alex Explorer'));
    setProfile(fresh);
    setMissionRecords({});
    setActivityLogs([]);
    setTodayExercisesMap({});
    localStorage.setItem(DEMO_ACTIVE_FLAG, 'true');
    setSection(AppSection.ONBOARDING);
  }, [reconcileWorld1StateWithProfile]);

  const completeOnboarding = useCallback(
    async (input: {
      username: string;
      displayName: string;
      experienceLevel: ExperienceLevel;
      avatarId: string;
    }) => {
      if (!profile) return;
      const today = formatLocalDateKey();
      const week = getIsoWeekKey();
      const nextProfile: PlayerProfile = {
        ...profile,
        username: input.username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'explorer_01',
        displayName: input.displayName.trim().slice(0, 40) || 'Explorer',
        experienceLevel: input.experienceLevel,
        avatarId: input.avatarId || 'character-a',
        onboardingCompleted: true,
        lastDailyKey: today,
        lastWeeklyKey: week,
      };
      const initialW1 = makeDefaultWorld1State(nextProfile.uid, nextProfile.displayName);
      setWorld1State(initialW1);

      if (nextProfile.isDemo) {
        setProfile(nextProfile);
        saveDemoBundle(nextProfile, missionRecords, activityLogs, todayExercisesMap, initialW1);
      } else if (firebaseUser) {
        await createCloudPlayerOnboardingBatch(nextProfile, firebaseUser.email || '');
        world1CloudDocExistsRef.current = false;
        setProfile(nextProfile);
      }
      soundFX.playAchievementUnlock();
      const savedInvite = extractRoomCodeFromLocation() || loadPendingInviteRoomCode() || pendingInviteRoomCode;
      if (savedInvite) {
        setPreviewRoomCode(savedInvite);
        setPendingInviteRoomCode(null);
        savePendingInviteRoomCode(null);
        pushNotification({
          title: `Welcome, ${nextProfile.displayName}!`,
          subtitle: `Opening Room ${savedInvite} invitation preview now.`,
        });
        setSection(AppSection.MULTIPLAYER);
      } else {
        pushNotification({
          title: `Welcome to CODELAND, ${nextProfile.displayName}!`,
          subtitle: 'Open World 1: The Beginner’s Forest to meet Sprout and begin building!',
        });
        setSection(AppSection.DASHBOARD);
      }
    },
    [
      profile,
      firebaseUser,
      missionRecords,
      activityLogs,
      todayExercisesMap,
      saveDemoBundle,
      pushNotification,
      pendingInviteRoomCode,
    ]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(DEMO_ACTIVE_FLAG);
    if (firebaseUser) {
      await signOutFirebase();
    }
    setActiveRoom(null);
    setIncomingInvitations([]);
    setProfile(null);
    setMissionRecords({});
    setActivityLogs([]);
    world1CloudDocExistsRef.current = false;
    setWorld1State(makeDefaultWorld1State('guest', 'Explorer'));
    syncedLoginDateRef.current = '';
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/room/')) {
      window.history.replaceState({}, '', '/');
    }
    setSection(AppSection.LANDING);
  }, [firebaseUser]);

  const resetDemoAccount = useCallback(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem(DEMO_ACTIVE_FLAG);
    const fresh = makeDefaultProfile('demo-local-explorer', true, 'Alex Explorer', 'alex_voxel');
    setWorld1State(makeDefaultWorld1State('demo-local-explorer', 'Alex Explorer'));
    setProfile(fresh);
    setMissionRecords({});
    setActivityLogs([]);
    setTodayExercisesMap({});
    setSection(AppSection.ONBOARDING);
  }, []);

  const effectiveStreak = useMemo(() => {
    if (!profile) return 0;
    return computeEffectiveStreak(profile.currentStreak, profile.lastActivityDate);
  }, [profile]);

  // Progression unlock rules (Section 12)
  const isLevelAcademyUnlocked = useCallback(
    (levelNumber: number): boolean => {
      if (levelNumber <= 1) return true;
      if (!profile) return false;
      const prevLevel = JAVA_CURRICULUM.find((l) => l.levelNumber === levelNumber - 1);
      if (!prevLevel) return false;
      const allPrevLessonsDone = prevLevel.lessons.every((les) => profile.completedLessons.includes(les.id));
      const prevAssessmentPassed = profile.passedAssessments.includes(prevLevel.id);
      const prevMissionDone = profile.completedMissions.includes(prevLevel.worldId);
      return allPrevLessonsDone && prevAssessmentPassed && prevMissionDone;
    },
    [profile]
  );

  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      const [lvlStr, ordStr] = lessonId.split('-');
      const lvlNum = Number(lvlStr);
      const ord = Number(ordStr);
      if (!isLevelAcademyUnlocked(lvlNum)) return false;
      if (ord <= 1) return true;
      if (!profile) return false;
      const prevLessonId = `${lvlNum}-${ord - 1}`;
      return profile.completedLessons.includes(prevLessonId);
    },
    [profile, isLevelAcademyUnlocked]
  );

  const getCampaignLevelProgress = useCallback(
    (levelNumber: number) => {
      const clamped = Math.max(1, Math.min(100, Math.round(levelNumber || 1)));
      if (!profile) {
        return {
          unlocked: clamped === 1,
          lessonDone: false,
          practiceDone: false,
          missionDone: false,
        };
      }
      const lessonDone = profile.completedLessons.includes(`L${clamped}`);
      const practiceDone = profile.passedAssessments.includes(`P${clamped}`);
      const missionDone = profile.completedMissions.includes(`M${clamped}`);

      // Sequential 1 -> 100 unlocking: Level N requires Level N-1's 3D Mission (M{N-1}) to be cleared
      const unlocked =
        clamped <= 1 ||
        missionDone ||
        profile.completedMissions.includes(`M${clamped - 1}`);

      return { unlocked, lessonDone, practiceDone, missionDone };
    },
    [profile]
  );

  const isCampaignLevelUnlocked = useCallback(
    (levelNumber: number): boolean => getCampaignLevelProgress(levelNumber).unlocked,
    [getCampaignLevelProgress]
  );

  const {
    nextIncompleteCampaignLevel,
    completedCampaignLevelsCount,
    completedCampaignLessonsCount,
  } = useMemo(() => {
    if (!profile) {
      return {
        nextIncompleteCampaignLevel: 1,
        completedCampaignLevelsCount: 0,
        completedCampaignLessonsCount: 0,
      };
    }
    let clearedCount = 0;
    let lessonsCount = 0;
    let firstIncomplete = 0;
    for (const lvl of CAMPAIGN_LEVELS_100) {
      const n = lvl.levelNumber;
      if (profile.completedLessons.includes(`L${n}`)) lessonsCount++;
      if (profile.completedMissions.includes(`M${n}`)) {
        clearedCount++;
      } else if (firstIncomplete === 0) {
        firstIncomplete = n;
      }
    }
    return {
      nextIncompleteCampaignLevel: firstIncomplete || 100,
      completedCampaignLevelsCount: clearedCount,
      completedCampaignLessonsCount: lessonsCount,
    };
  }, [profile]);

  const isWorldUnlocked = useCallback(
    (worldNumber: number): boolean => {
      if (!profile) return worldNumber <= 1;
      const worldMeta = getCampaignWorldMeta(worldNumber);
      return isCampaignLevelUnlocked(worldMeta.levelRange[0]);
    },
    [profile, isCampaignLevelUnlocked]
  );

  const openCampaignLevel = useCallback(
    (levelNumber: number, stage?: LevelStageNumber) => {
      const requested = getCampaignLevel(levelNumber);
      const requestedProg = getCampaignLevelProgress(requested.levelNumber);

      if (!requestedProg.unlocked) {
        const fallback = getCampaignLevel(nextIncompleteCampaignLevel);
        setActiveCampaignLevel(fallback.levelNumber);
        setActiveWorldId(fallback.worldId);
        setActiveStage(1);
        setSection(AppSection.LESSON);
        pushNotification({
          title: `Level ${requested.levelNumber} Locked`,
          subtitle: `Clear Level ${requested.levelNumber - 1}'s 3D Mission first to unlock Level ${requested.levelNumber}.`,
        });
        return;
      }

      setActiveCampaignLevel(requested.levelNumber);
      setActiveWorldId(requested.worldId);

      const canEnter3D =
        requested.worldNumber === 1 ||
        (requestedProg.lessonDone && requestedProg.practiceDone) ||
        requestedProg.missionDone;

      if (stage === 4) {
        if (!canEnter3D) {
          const nextRequiredStage: LevelStageNumber = !requestedProg.lessonDone ? 2 : 3;
          setActiveStage(nextRequiredStage);
          setSection(AppSection.LESSON);
          pushNotification({
            title: 'Complete Lesson & Practice First',
            subtitle: `Finish Stage 2 (Java Lesson) and Stage 3 (Guided Practice) to unlock Level ${requested.levelNumber}'s 3D Mission.`,
          });
          return;
        }
        setActiveStage(4);
        setSection(AppSection.GAME);
        return;
      }

      if (stage === 5 && !requestedProg.missionDone) {
        setActiveStage(!requestedProg.lessonDone ? 2 : !requestedProg.practiceDone ? 3 : 4);
        setSection(AppSection.LESSON);
        return;
      }

      if (stage) {
        setActiveStage(stage);
        setSection(AppSection.LESSON);
        return;
      }

      if (!requestedProg.lessonDone) {
        setActiveStage(1);
      } else if (!requestedProg.practiceDone) {
        setActiveStage(3);
      } else if (!requestedProg.missionDone) {
        setActiveStage(4);
      } else {
        // Completed levels remain 100% replayable from Stage 1
        setActiveStage(1);
      }
      setSection(AppSection.LESSON);
    },
    [getCampaignLevelProgress, nextIncompleteCampaignLevel, pushNotification]
  );

  const openLesson = useCallback(
    (lessonId: string) => {
      if (/^L?\d+$/.test(lessonId)) {
        const num = Number(lessonId.replace(/^L/, ''));
        openCampaignLevel(num);
        return;
      }
      setActiveLessonId(lessonId);
      const [lvlStr] = lessonId.split('-');
      const worldNum = Math.max(1, Math.min(6, Number(lvlStr) || 1));
      const worldMeta = getCampaignWorldMeta(worldNum);
      openCampaignLevel(worldMeta.levelRange[0]);
    },
    [openCampaignLevel]
  );

  const openWorld = useCallback(
    (worldId: string, explicitLevelNumber?: number) => {
      const worldMeta = getCampaignWorldMeta(worldId);
      const levelsInWorld = getLevelsForWorld(worldMeta.worldNumber);

      if (!isCampaignLevelUnlocked(worldMeta.levelRange[0])) {
        openCampaignLevel(nextIncompleteCampaignLevel);
        pushNotification({
          title: `${worldMeta.name} Locked`,
          subtitle: `Clear Level ${worldMeta.levelRange[0] - 1} to unlock ${worldMeta.name} (Levels ${worldMeta.levelRange[0]}–${worldMeta.levelRange[1]}).`,
        });
        return;
      }

      let targetLevel = explicitLevelNumber || levelsInWorld[0]?.levelNumber || 1;
      if (!explicitLevelNumber && profile) {
        const nextInWorld = levelsInWorld.find(
          (l) =>
            !profile.completedMissions.includes(`M${l.levelNumber}`) &&
            isCampaignLevelUnlocked(l.levelNumber)
        );
        if (nextInWorld) {
          targetLevel = nextInWorld.levelNumber;
        } else {
          const anyUnlocked = [...levelsInWorld]
            .reverse()
            .find((l) => isCampaignLevelUnlocked(l.levelNumber));
          if (anyUnlocked) targetLevel = anyUnlocked.levelNumber;
        }
      }

      const prog = getCampaignLevelProgress(targetLevel);
      if (
        worldMeta.worldNumber === 1 ||
        (prog.lessonDone && prog.practiceDone) ||
        prog.missionDone
      ) {
        setActiveWorldId(worldMeta.worldId);
        setActiveCampaignLevel(targetLevel);
        setActiveStage(4);
        setSection(AppSection.GAME);
      } else {
        openCampaignLevel(targetLevel);
        pushNotification({
          title: `Prepare for Level ${targetLevel} 3D Mission`,
          subtitle: 'Complete the Java Lesson and Guided Practice to enter the 3D World.',
        });
      }
    },
    [
      profile,
      isCampaignLevelUnlocked,
      getCampaignLevelProgress,
      openCampaignLevel,
      nextIncompleteCampaignLevel,
      pushNotification,
    ]
  );

  // Core unified reward & anti-farming engine
  const applyQualifyingReward = useCallback(
    async (params: {
      baseXp: number;
      baseCoins: number;
      qualifiesForStreak: boolean;
      mutator: (draft: PlayerProfile) => void;
      primaryLog?: { activityId: string; activityType: ActivityType; title: string };
      extraExercisesTodayIncrement?: boolean;
      missionRecordUpdate?: {
        worldId: string;
        bestScore: number;
        bestTimeSeconds: number;
        xpEarned: number;
        completionsCount: number;
        isNewRecordDoc: boolean;
      };
    }) => {
      if (!profile) return;
      const today = formatLocalDateKey();
      const week = getIsoWeekKey();

      const draft: PlayerProfile = {
        ...profile,
        completedLessons: [...profile.completedLessons],
        completedExercises: [...profile.completedExercises],
        passedAssessments: [...profile.passedAssessments],
        completedMissions: [...profile.completedMissions],
        unlockedAchievements: [...profile.unlockedAchievements],
        claimedDailyGoals: [...profile.claimedDailyGoals],
        activityDates: [...profile.activityDates],
      };

      // Reset daily / weekly XP counters if period rolled over
      if (draft.lastDailyKey !== today) {
        draft.dailyXp = 0;
        draft.lastDailyKey = today;
      }
      if (draft.lastWeeklyKey !== week) {
        draft.weeklyXp = 0;
        draft.lastWeeklyKey = week;
      }

      params.mutator(draft);

      let totalXpGain = params.baseXp;
      let totalCoinsGain = params.baseCoins;
      const logsToPersist: {
        id: string;
        activityId: string;
        activityType: ActivityType;
        title: string;
        xpAmount: number;
        coinsAmount: number;
      }[] = [];

      if (params.primaryLog && (params.baseXp > 0 || params.baseCoins > 0)) {
        logsToPersist.push({
          id: `${params.primaryLog.activityType}_${params.primaryLog.activityId}_${Date.now()}`,
          activityId: params.primaryLog.activityId,
          activityType: params.primaryLog.activityType,
          title: params.primaryLog.title,
          xpAmount: params.baseXp,
          coinsAmount: params.baseCoins,
        });
      }

      // Update Daily Streak if qualifying learning activity
      if (params.qualifiesForStreak) {
        const streakRes = computeStreakAfterQualifyingActivity(
          draft.currentStreak,
          draft.longestStreak,
          draft.lastActivityDate,
          draft.activityDates
        );
        draft.currentStreak = streakRes.currentStreak;
        draft.longestStreak = streakRes.longestStreak;
        draft.lastActivityDate = streakRes.lastActivityDate;
        draft.activityDates = streakRes.activityDates;

        if (streakRes.incrementedToday) {
          pushNotification({
            title: `${streakRes.currentStreak}-Day Learning Streak!`,
            subtitle: 'Keep completing at least one Java activity daily.',
          });
        }

        const syncKind =
          params.primaryLog?.activityType === 'lesson' ||
          params.primaryLog?.activityType === 'exercise' ||
          params.primaryLog?.activityType === 'assessment' ||
          params.primaryLog?.activityType === 'mission' ||
          params.primaryLog?.activityType === 'multiplayer_match'
            ? params.primaryLog.activityType
            : 'lesson';

        void syncServerDailyStreak({
          userId: draft.uid,
          username: draft.username,
          displayName: draft.displayName,
          avatarId: draft.avatarId,
          totalXp: draft.totalXp + totalXpGain,
          localDateKey: today,
          activityType: syncKind,
          currentStreak: draft.currentStreak,
          longestStreak: draft.longestStreak,
        })
          .then((res) => {
            setTotalActiveDays(res.streak.totalActiveDays);
          })
          .catch(() => {
            // Non-blocking fallback
          });
      }

      // Track exercises solved today for Daily Goal #2
      const nextExMap = { ...todayExercisesMap };
      if (params.extraExercisesTodayIncrement) {
        nextExMap[today] = (nextExMap[today] || 0) + 1;
        setTodayExercisesMap(nextExMap);
      }

      // Check Daily Goals (+25 XP each once per day)
      const goalLessonKey = `goal_lesson_${today}`;
      if (
        params.primaryLog?.activityType === 'lesson' &&
        !draft.claimedDailyGoals.includes(goalLessonKey)
      ) {
        draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), goalLessonKey];
        totalXpGain += 25;
        logsToPersist.push({
          id: `dg_lesson_${today}`,
          activityId: goalLessonKey,
          activityType: 'daily_goal',
          title: 'Daily Goal: Complete 1 Java Lesson',
          xpAmount: 25,
          coinsAmount: 0,
        });
        pushNotification({
          title: 'Daily Goal Completed!',
          subtitle: 'Completed 1 Java Lesson today',
          xpDelta: 25,
        });
      }

      const goalExKey = `goal_ex3_${today}`;
      if ((nextExMap[today] || 0) >= 3 && !draft.claimedDailyGoals.includes(goalExKey)) {
        draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), goalExKey];
        totalXpGain += 25;
        logsToPersist.push({
          id: `dg_ex3_${today}`,
          activityId: goalExKey,
          activityType: 'daily_goal',
          title: 'Daily Goal: Solve 3 Practice Exercises',
          xpAmount: 25,
          coinsAmount: 0,
        });
        pushNotification({
          title: 'Daily Goal Completed!',
          subtitle: 'Solved 3 Practice Exercises today',
          xpDelta: 25,
        });
      }

      const goalMissionKey = `goal_mission_${today}`;
      if (
        params.primaryLog?.activityType === 'mission' &&
        !draft.claimedDailyGoals.includes(goalMissionKey)
      ) {
        draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), goalMissionKey];
        totalXpGain += 25;
        logsToPersist.push({
          id: `dg_mission_${today}`,
          activityId: goalMissionKey,
          activityType: 'daily_goal',
          title: 'Daily Goal: Complete 1 Adventure Mission',
          xpAmount: 25,
          coinsAmount: 0,
        });
        pushNotification({
          title: 'Daily Goal Completed!',
          subtitle: 'Completed 1 Adventure Mission today',
          xpDelta: 25,
        });
      }

      // Check Achievement Unlocks (Legacy + 100-Level Campaign World Boss Rewards)
      const candidateBadges: string[] = [];
      if (draft.completedLessons.length >= 1) candidateBadges.push('first-steps');
      if (
        draft.completedMissions.includes('M1') ||
        (draft.completedLessons.includes('1-1') && draft.passedAssessments.includes('level-1'))
      ) {
        candidateBadges.push('hello-world');
      }
      if (draft.completedMissions.includes('M10')) {
        candidateBadges.push('forest-explorer');
        candidateBadges.push('forest-builder');
      }
      if (draft.completedMissions.includes('M25') || draft.passedAssessments.includes('level-2')) {
        candidateBadges.push('variable-master');
      }
      if (draft.completedMissions.includes('M25')) {
        candidateBadges.push('crystal-collector');
      }
      if (draft.completedMissions.includes('M40') || draft.passedAssessments.includes('level-3')) {
        candidateBadges.push('logic-explorer');
      }
      if (draft.completedMissions.includes('M40')) {
        candidateBadges.push('logic-master');
      }
      if (draft.completedMissions.includes('M55') || draft.passedAssessments.includes('level-4')) {
        candidateBadges.push('loop-champion');
      }
      if (draft.completedMissions.includes('M55')) {
        candidateBadges.push('loop-engineer');
      }
      if (draft.completedMissions.includes('M75') || draft.passedAssessments.includes('level-5')) {
        candidateBadges.push('method-maker');
      }
      if (draft.completedMissions.includes('M75')) {
        candidateBadges.push('method-architect');
      }
      if (draft.completedMissions.includes('M100') || draft.passedAssessments.includes('level-6')) {
        candidateBadges.push('object-architect');
      }
      if (draft.completedMissions.includes('M100')) {
        candidateBadges.push('codeland-java-champion');
        candidateBadges.push('codeland-champion');
      }
      if (draft.completedExercises.length >= 5) candidateBadges.push('arena-tactician');
      const legacyWorldsCleared = ['world-1', 'world-2', 'world-3', 'world-4', 'world-5', 'world-6'].every(
        (wid) => draft.completedMissions.includes(wid)
      );
      if (legacyWorldsCleared) candidateBadges.push('codeland-champion');

      for (const milestone of [3, 7, 14, 30, 60, 100]) {
        if (draft.currentStreak >= milestone) {
          candidateBadges.push(`streak-${milestone}`);
        }
      }

      for (const badgeId of candidateBadges) {
        if (!draft.unlockedAchievements.includes(badgeId)) {
          const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === badgeId);
          if (def) {
            draft.unlockedAchievements.push(badgeId);
            totalXpGain += def.bonusXp;
            totalCoinsGain += def.bonusCoins;
            if (def.streakRequirement) {
              logsToPersist.push({
                id: `milestone_${badgeId}_${Date.now()}`,
                activityId: badgeId,
                activityType: 'streak_milestone',
                title: `Unlocked Badge: ${def.title}`,
                xpAmount: def.bonusXp,
                coinsAmount: def.bonusCoins,
              });
            }
            soundFX.playAchievementUnlock();
            pushNotification({
              title: `Achievement Unlocked: ${def.title}`,
              subtitle: def.description,
              xpDelta: def.bonusXp,
              coinsDelta: def.bonusCoins,
              badgeTitle: def.title,
            });
          }
        }
      }

      draft.totalXp += totalXpGain;
      draft.dailyXp += totalXpGain;
      draft.weeklyXp += totalXpGain;
      draft.coins += totalCoinsGain;

      // Update local React state immediately for crisp UX
      const newLogItems: ActivityLogItem[] = logsToPersist.map((l) => ({
        id: l.id,
        userId: draft.uid,
        activityId: l.activityId,
        activityType: l.activityType,
        title: l.title,
        xpAmount: l.xpAmount,
        coinsAmount: l.coinsAmount,
        timestampIso: new Date().toISOString(),
      }));

      const nextLogs = [...newLogItems, ...activityLogs].slice(0, 50);
      const nextMissions = { ...missionRecords };
      if (params.missionRecordUpdate) {
        nextMissions[params.missionRecordUpdate.worldId] = {
          userId: draft.uid,
          worldId: params.missionRecordUpdate.worldId,
          bestScore: params.missionRecordUpdate.bestScore,
          bestTimeSeconds: params.missionRecordUpdate.bestTimeSeconds,
          xpEarned: params.missionRecordUpdate.xpEarned,
          completionsCount: params.missionRecordUpdate.completionsCount,
        };
      }

      setProfile(draft);
      setActivityLogs(nextLogs);
      setMissionRecords(nextMissions);

      if (draft.isDemo) {
        saveDemoBundle(draft, nextMissions, nextLogs, nextExMap);
      } else {
        await recordCloudProgressBatch(draft, logsToPersist, params.missionRecordUpdate);
      }
    },
    [profile, todayExercisesMap, activityLogs, missionRecords, pushNotification, saveDemoBundle]
  );

  const completeLesson = useCallback(
    async (lessonId: string, lessonTitle: string): Promise<{ firstTime: boolean }> => {
      if (!profile) return { firstTime: false };
      if (profile.completedLessons.includes(lessonId)) {
        return { firstTime: false };
      }
      await applyQualifyingReward({
        baseXp: 50,
        baseCoins: 15,
        qualifiesForStreak: true,
        mutator: (draft) => {
          draft.completedLessons.push(lessonId);
        },
        primaryLog: {
          activityId: `lesson_${lessonId}`,
          activityType: 'lesson',
          title: `Completed Lesson ${lessonId}: ${lessonTitle}`,
        },
      });
      pushNotification({
        title: `Lesson ${lessonId} Complete!`,
        subtitle: lessonTitle,
        xpDelta: 50,
        coinsDelta: 15,
      });
      return { firstTime: true };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  const completePracticeExercise = useCallback(
    async (exerciseId: string, exerciseTitle: string): Promise<{ firstTime: boolean }> => {
      if (!profile) return { firstTime: false };
      if (profile.completedExercises.includes(exerciseId)) {
        return { firstTime: false };
      }
      await applyQualifyingReward({
        baseXp: 10,
        baseCoins: 5,
        qualifiesForStreak: true,
        extraExercisesTodayIncrement: true,
        mutator: (draft) => {
          draft.completedExercises.push(exerciseId);
        },
        primaryLog: {
          activityId: exerciseId,
          activityType: 'exercise',
          title: `Solved Practice: ${exerciseTitle}`,
        },
      });
      pushNotification({
        title: 'Exercise Solved!',
        subtitle: exerciseTitle,
        xpDelta: 10,
        coinsDelta: 5,
      });
      return { firstTime: true };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  const passLevelAssessment = useCallback(
    async (levelNumber: number, scorePercent: number): Promise<{ firstTime: boolean }> => {
      if (!profile) return { firstTime: false };
      const levelId = `level-${levelNumber}`;
      if (profile.passedAssessments.includes(levelId)) {
        return { firstTime: false };
      }
      await applyQualifyingReward({
        baseXp: 30,
        baseCoins: 10,
        qualifiesForStreak: true,
        mutator: (draft) => {
          draft.passedAssessments.push(levelId);
        },
        primaryLog: {
          activityId: `assess_${levelId}`,
          activityType: 'assessment',
          title: `Passed Level ${levelNumber} Readiness Check (${scorePercent}%)`,
        },
      });
      pushNotification({
        title: `World ${levelNumber} Unlocked!`,
        subtitle: `Readiness Assessment passed (${scorePercent}%)`,
        xpDelta: 30,
        coinsDelta: 10,
      });
      return { firstTime: true };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  const completeWorldMission = useCallback(
    async (
      worldId: string,
      missionTitle: string,
      score: number,
      timeSeconds: number,
      collectedCoinsCount: number
    ): Promise<{ firstTime: boolean; totalCoinsAwarded: number; xpAwarded: number }> => {
      if (!profile) return { firstTime: false, totalCoinsAwarded: 0, xpAwarded: 0 };
      const alreadyDone = profile.completedMissions.includes(worldId);
      const existingRec = missionRecords[worldId];

      const xpAwarded = alreadyDone ? 0 : 100;
      const totalCoinsAwarded = alreadyDone ? 0 : 50 + collectedCoinsCount * 5;

      const clampedTime = Math.max(1, Math.round(timeSeconds));
      const nextBestScore = existingRec ? Math.max(existingRec.bestScore, score) : score;
      const nextBestTime = existingRec ? Math.min(existingRec.bestTimeSeconds, clampedTime) : clampedTime;
      const nextCount = existingRec ? existingRec.completionsCount + 1 : 1;

      await applyQualifyingReward({
        baseXp: xpAwarded,
        baseCoins: totalCoinsAwarded,
        qualifiesForStreak: !alreadyDone,
        mutator: (draft) => {
          if (!alreadyDone) {
            draft.completedMissions.push(worldId);
          }
        },
        primaryLog: !alreadyDone
          ? {
              activityId: `mission_${worldId}`,
              activityType: 'mission',
              title: `Completed 3D Mission: ${missionTitle}`,
            }
          : undefined,
        missionRecordUpdate: {
          worldId,
          bestScore: nextBestScore,
          bestTimeSeconds: nextBestTime,
          xpEarned: existingRec ? existingRec.xpEarned : 100,
          completionsCount: nextCount,
          isNewRecordDoc: !existingRec,
        },
      });

      if (!alreadyDone) {
        pushNotification({
          title: `Mission Complete: ${missionTitle}`,
          subtitle: 'Next Java Learning Level Unlocked!',
          xpDelta: xpAwarded,
          coinsDelta: totalCoinsAwarded,
        });
      } else {
        pushNotification({
          title: 'Mission Replay Completed',
          subtitle: `Best Time: ${nextBestTime}s · Best Score: ${nextBestScore} (No duplicate XP awarded)`,
        });
      }

      return { firstTime: !alreadyDone, totalCoinsAwarded, xpAwarded };
    },
    [profile, missionRecords, applyQualifyingReward, pushNotification]
  );

  const completeCampaignLesson = useCallback(
    async (levelNumber: number): Promise<{ firstTime: boolean }> => {
      if (!profile) return { firstTime: false };
      const lvl = getCampaignLevel(levelNumber);
      const key = `L${lvl.levelNumber}`;
      if (profile.completedLessons.includes(key)) {
        return { firstTime: false };
      }
      await applyQualifyingReward({
        baseXp: 20,
        baseCoins: 5,
        qualifiesForStreak: true,
        mutator: (draft) => {
          draft.completedLessons = [...draft.completedLessons.slice(-148), key];
        },
        primaryLog: {
          activityId: `camp_lesson_${lvl.levelNumber}`,
          activityType: 'lesson',
          title: `Level ${lvl.levelNumber} Lesson: ${lvl.whatPlayerLearns}`,
        },
      });
      pushNotification({
        title: `Stage 2 Complete — Level ${lvl.levelNumber}`,
        subtitle: lvl.whatPlayerLearns,
        xpDelta: 20,
        coinsDelta: 5,
      });
      return { firstTime: true };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  const completeCampaignGuidedPractice = useCallback(
    async (levelNumber: number): Promise<{ firstTime: boolean }> => {
      if (!profile) return { firstTime: false };
      const lvl = getCampaignLevel(levelNumber);
      const key = `P${lvl.levelNumber}`;
      if (profile.passedAssessments.includes(key)) {
        return { firstTime: false };
      }
      await applyQualifyingReward({
        baseXp: 15,
        baseCoins: 5,
        qualifiesForStreak: true,
        extraExercisesTodayIncrement: true,
        mutator: (draft) => {
          draft.passedAssessments = [...draft.passedAssessments.slice(-148), key];
        },
        primaryLog: {
          activityId: `camp_practice_${lvl.levelNumber}`,
          activityType: 'assessment',
          title: `Level ${lvl.levelNumber} Guided Practice Passed`,
        },
      });
      pushNotification({
        title: `Stage 3 Complete — 3D Mission Ready!`,
        subtitle: `Level ${lvl.levelNumber}: ${lvl.mission3d.missionTitle}`,
        xpDelta: 15,
        coinsDelta: 5,
      });
      return { firstTime: true };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  const completeCampaignMission3D = useCallback(
    async (
      levelNumber: number,
      score: number,
      timeSeconds: number,
      collectedCoinsCount: number
    ): Promise<{
      firstTime: boolean;
      totalCoinsAwarded: number;
      xpAwarded: number;
      unlockedWorldBadgeTitle?: string;
      unlockedCertificate?: boolean;
    }> => {
      if (!profile) {
        return { firstTime: false, totalCoinsAwarded: 0, xpAwarded: 0 };
      }
      const lvl = getCampaignLevel(levelNumber);
      const worldMeta = getCampaignWorldMeta(lvl.worldNumber);
      const missionKey = `M${lvl.levelNumber}`;
      const lessonKey = `L${lvl.levelNumber}`;
      const practiceKey = `P${lvl.levelNumber}`;

      const alreadyDone = profile.completedMissions.includes(missionKey);
      const existingRec = missionRecords[lvl.worldId];

      const xpAwarded = alreadyDone ? 0 : lvl.xpReward;
      const totalCoinsAwarded = alreadyDone ? 0 : lvl.coinReward + collectedCoinsCount * 5;

      const clampedTime = Math.max(1, Math.round(timeSeconds));
      const nextBestScore = existingRec ? Math.max(existingRec.bestScore, score) : score;
      const nextBestTime = existingRec ? Math.min(existingRec.bestTimeSeconds, clampedTime) : clampedTime;
      const nextCount = existingRec ? existingRec.completionsCount + 1 : 1;

      const hadBadgeBefore = profile.unlockedAchievements.includes(worldMeta.rewardBadgeId);

      await applyQualifyingReward({
        baseXp: xpAwarded,
        baseCoins: totalCoinsAwarded,
        qualifiesForStreak: !alreadyDone,
        mutator: (draft) => {
          if (!draft.completedLessons.includes(lessonKey)) {
            draft.completedLessons = [...draft.completedLessons.slice(-148), lessonKey];
          }
          if (!draft.passedAssessments.includes(practiceKey)) {
            draft.passedAssessments = [...draft.passedAssessments.slice(-148), practiceKey];
          }
          if (!alreadyDone) {
            const nextMissions = [...draft.completedMissions, missionKey];
            if (lvl.isBossLevel && !nextMissions.includes(lvl.worldId)) {
              nextMissions.push(lvl.worldId);
            }
            draft.completedMissions = nextMissions.slice(-148);
          }
        },
        primaryLog: !alreadyDone
          ? {
              activityId: `camp_mission_${lvl.levelNumber}`,
              activityType: 'mission',
              title: `Cleared Level ${lvl.levelNumber}: ${lvl.mission3d.missionTitle}`,
            }
          : undefined,
        missionRecordUpdate: {
          worldId: lvl.worldId,
          bestScore: nextBestScore,
          bestTimeSeconds: nextBestTime,
          xpEarned: existingRec ? existingRec.xpEarned + xpAwarded : xpAwarded,
          completionsCount: nextCount,
          isNewRecordDoc: !existingRec,
        },
      });

      const unlockedWorldBadgeTitle =
        lvl.isBossLevel && !alreadyDone && !hadBadgeBefore
          ? `${worldMeta.rewardBadgeTitle} (+${worldMeta.rewardBonusXp} XP)`
          : undefined;
      const unlockedCertificate = lvl.levelNumber === 100 && !alreadyDone;

      if (!alreadyDone) {
        pushNotification({
          title: `Level ${lvl.levelNumber} Complete!`,
          subtitle:
            lvl.levelNumber < 100
              ? `Unlocked Level ${lvl.levelNumber + 1}: ${getCampaignLevel(lvl.levelNumber + 1).whatPlayerLearns}`
              : 'All 100 CODELAND Java Levels Restored!',
          xpDelta: xpAwarded,
          coinsDelta: totalCoinsAwarded,
        });
      } else {
        pushNotification({
          title: `Level ${lvl.levelNumber} Replay Cleared`,
          subtitle: `Score: ${score} · Time: ${clampedTime}s (Replay mastery — no duplicate XP)`,
        });
      }

      return {
        firstTime: !alreadyDone,
        totalCoinsAwarded,
        xpAwarded,
        unlockedWorldBadgeTitle,
        unlockedCertificate,
      };
    },
    [profile, missionRecords, applyQualifyingReward, pushNotification]
  );

  const saveProfileCustomization = useCallback(
    async (updates: {
      username: string;
      displayName: string;
      avatarId: string;
      experienceLevel: ExperienceLevel;
    }) => {
      if (!profile) return;
      const nextProfile: PlayerProfile = {
        ...profile,
        username: updates.username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || profile.username,
        displayName: updates.displayName.trim().slice(0, 40) || profile.displayName,
        avatarId: updates.avatarId,
        experienceLevel: updates.experienceLevel,
      };
      setProfile(nextProfile);
      if (nextProfile.isDemo) {
        saveDemoBundle(nextProfile, missionRecords, activityLogs, todayExercisesMap);
      } else {
        await updateCloudProfileIdentityBatch(nextProfile.uid, {
          username: nextProfile.username,
          displayName: nextProfile.displayName,
          avatarId: nextProfile.avatarId,
          experienceLevel: nextProfile.experienceLevel,
        });
      }
      pushNotification({
        title: 'Profile Updated',
        subtitle: `Saved changes for ${nextProfile.displayName}.`,
      });
    },
    [profile, missionRecords, activityLogs, todayExercisesMap, saveDemoBundle, pushNotification]
  );

  const saveSettings = useCallback(
    async (updates: {
      graphicsQuality: GraphicsQuality;
      soundMuted: boolean;
      theme: ThemeMode;
    }) => {
      if (!profile) {
        setGuestTheme(updates.theme);
        soundFX.setMuted(updates.soundMuted);
        return;
      }
      const nextProfile: PlayerProfile = {
        ...profile,
        graphicsQuality: updates.graphicsQuality,
        soundMuted: updates.soundMuted,
        theme: updates.theme,
      };
      setProfile(nextProfile);
      if (nextProfile.isDemo) {
        saveDemoBundle(nextProfile, missionRecords, activityLogs, todayExercisesMap);
      } else {
        await updateCloudPlayerSettings(nextProfile.uid, updates);
      }
    },
    [profile, missionRecords, activityLogs, todayExercisesMap, saveDemoBundle]
  );

  const toggleThemeQuick = useCallback(() => {
    const nextTheme: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    if (profile) {
      void saveSettings({
        graphicsQuality: profile.graphicsQuality,
        soundMuted: profile.soundMuted,
        theme: nextTheme,
      });
    } else {
      setGuestTheme(nextTheme);
    }
  }, [activeTheme, profile, saveSettings]);

  const dailyGoalStatus = useMemo(() => {
    const today = formatLocalDateKey();
    if (!profile) {
      return { lessonDone: false, exercisesCount: 0, missionDone: false };
    }
    return {
      lessonDone: profile.claimedDailyGoals.includes(`goal_lesson_${today}`),
      exercisesCount: Math.min(
        3,
        profile.claimedDailyGoals.includes(`goal_ex3_${today}`) ? 3 : todayExercisesMap[today] || 0
      ),
      missionDone: profile.claimedDailyGoals.includes(`goal_mission_${today}`),
    };
  }, [profile, todayExercisesMap]);

  const dailyRewardClaimedToday = useMemo(() => {
    if (!profile) return false;
    const today = formatLocalDateKey();
    return profile.claimedDailyGoals.includes(`daily_chest_${today}`);
  }, [profile]);

  const claimDailyRewardChest = useCallback(async (): Promise<{
    claimed: boolean;
    xpAwarded: number;
    coinsAwarded: number;
    streakBonusCoins: number;
  }> => {
    if (!profile) {
      return { claimed: false, xpAwarded: 0, coinsAwarded: 0, streakBonusCoins: 0 };
    }
    const today = formatLocalDateKey();
    const chestKey = `daily_chest_${today}`;
    if (profile.claimedDailyGoals.includes(chestKey)) {
      return { claimed: false, xpAwarded: 0, coinsAwarded: 0, streakBonusCoins: 0 };
    }

    const baseXp = 30;
    const baseCoins = 20;
    const streakBonusCoins = Math.min(20, Math.max(0, effectiveStreak) * 2);
    const totalCoins = baseCoins + streakBonusCoins;

    soundFX.playTreasureChestOpen();

    await applyQualifyingReward({
      baseXp,
      baseCoins: totalCoins,
      qualifiesForStreak: false,
      mutator: (draft) => {
        if (!draft.claimedDailyGoals.includes(chestKey)) {
          draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), chestKey];
        }
      },
      primaryLog: {
        activityId: chestKey,
        activityType: 'daily_goal',
        title: `Opened Daily Reward Chest (${today})`,
      },
    });

    pushNotification({
      title: 'Daily Reward Chest Claimed!',
      subtitle:
        streakBonusCoins > 0
          ? `Includes +${streakBonusCoins} Byte Coins streak bonus!`
          : 'Come back tomorrow for another magical chest!',
      xpDelta: baseXp,
      coinsDelta: totalCoins,
    });

    return {
      claimed: true,
      xpAwarded: baseXp,
      coinsAwarded: totalCoins,
      streakBonusCoins,
    };
  }, [profile, effectiveStreak, applyQualifyingReward, pushNotification]);

  // Marketplace & Inventory State
  const [equippedPetId, setEquippedPetId] = useState<string>(() => {
    try {
      return localStorage.getItem('codeland_equipped_pet') || 'pet-cyber-bot';
    } catch {
      return 'pet-cyber-bot';
    }
  });

  const [equippedAccessoryId, setEquippedAccessoryId] = useState<string>(() => {
    try {
      return localStorage.getItem('codeland_equipped_accessory') || 'acc-cyan-energy-sword';
    } catch {
      return 'acc-cyan-energy-sword';
    }
  });

  const [equippedThemeId, setEquippedThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem('codeland_equipped_theme') || 'theme-twilight-castle';
    } catch {
      return 'theme-twilight-castle';
    }
  });

  const ownedItemIds = useMemo(() => {
    const list = ['theme-twilight-castle', 'acc-cyan-energy-sword', 'pet-cyber-bot'];
    if (profile?.avatarId) {
      const matchSkin = MARKETPLACE_ITEMS.find((item) => item.avatarId === profile.avatarId);
      if (matchSkin) list.push(matchSkin.id);
    }
    if (profile?.claimedDailyGoals) {
      profile.claimedDailyGoals.forEach((goalKey) => {
        if (goalKey.startsWith('shop_owned_')) {
          const itemId = goalKey.replace('shop_owned_', '');
          if (!list.includes(itemId)) list.push(itemId);
        }
      });
    }
    return list;
  }, [profile?.claimedDailyGoals, profile?.avatarId]);

  const completedWinterChallengeIds = useMemo(() => {
    if (!profile?.claimedDailyGoals) return [];
    return profile.claimedDailyGoals
      .filter((k) => k.startsWith('winter_c_'))
      .map((k) => k.replace('winter_c_', ''));
  }, [profile?.claimedDailyGoals]);

  const buyMarketplaceItem = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      if (!profile) return { success: false, error: 'Sign in to access the Marketplace.' };
      const item = MARKETPLACE_ITEMS.find((it) => it.id === itemId);
      if (!item) return { success: false, error: 'Item not found in catalog.' };
      if (ownedItemIds.includes(itemId)) return { success: false, error: 'You already own this item.' };
      if (profile.coins < item.price) {
        return {
          success: false,
          error: `Insufficient Byte Coins! You need ${item.price} coins but only have ${profile.coins}.`,
        };
      }

      const shopKey = `shop_owned_${item.id}`;
      await applyQualifyingReward({
        baseXp: 10,
        baseCoins: -item.price,
        qualifiesForStreak: false,
        mutator: (draft) => {
          if (!draft.claimedDailyGoals.includes(shopKey)) {
            draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), shopKey];
          }
          if (item.category === 'skins' && item.avatarId) {
            draft.avatarId = item.avatarId;
          }
        },
        primaryLog: {
          activityId: `purchase_${item.id}_${Date.now()}`,
          activityType: 'marketplace_purchase',
          title: `Purchased ${item.name} for ${item.price} coins`,
        },
      });

      soundFX.playCoinCollect();
      pushNotification({
        title: 'Purchase Successful!',
        subtitle: `Acquired ${item.name}`,
        coinsDelta: -item.price,
        xpDelta: 10,
      });

      if (item.category === 'pets') {
        setEquippedPetId(item.id);
        try { localStorage.setItem('codeland_equipped_pet', item.id); } catch {}
      } else if (item.category === 'accessories') {
        setEquippedAccessoryId(item.id);
        try { localStorage.setItem('codeland_equipped_accessory', item.id); } catch {}
      } else if (item.category === 'themes') {
        setEquippedThemeId(item.id);
        try { localStorage.setItem('codeland_equipped_theme', item.id); } catch {}
      }

      return { success: true };
    },
    [profile, ownedItemIds, applyQualifyingReward, pushNotification]
  );

  const equipMarketplaceItem = useCallback(
    async (itemId: string) => {
      const item = MARKETPLACE_ITEMS.find((it) => it.id === itemId);
      if (!item) return;
      if (item.category === 'skins' && item.avatarId && profile) {
        await saveProfileCustomization({
          username: profile.username,
          displayName: profile.displayName,
          avatarId: item.avatarId,
          experienceLevel: profile.experienceLevel,
        });
      } else if (item.category === 'pets') {
        setEquippedPetId(item.id);
        try { localStorage.setItem('codeland_equipped_pet', item.id); } catch {}
      } else if (item.category === 'accessories') {
        setEquippedAccessoryId(item.id);
        try { localStorage.setItem('codeland_equipped_accessory', item.id); } catch {}
      } else if (item.category === 'themes') {
        setEquippedThemeId(item.id);
        try { localStorage.setItem('codeland_equipped_theme', item.id); } catch {}
      }
      soundFX.playClick();
      pushNotification({
        title: 'Equipped Item',
        subtitle: `Now wearing ${item.name}`,
      });
    },
    [profile, saveProfileCustomization, pushNotification]
  );

  const unequipMarketplaceItem = useCallback(
    async (category: 'skins' | 'pets' | 'accessories' | 'themes') => {
      if (category === 'pets') {
        setEquippedPetId('');
        try { localStorage.removeItem('codeland_equipped_pet'); } catch {}
      } else if (category === 'accessories') {
        setEquippedAccessoryId('');
        try { localStorage.removeItem('codeland_equipped_accessory'); } catch {}
      } else if (category === 'themes') {
        setEquippedThemeId('theme-twilight-castle');
        try { localStorage.setItem('codeland_equipped_theme', 'theme-twilight-castle'); } catch {}
      }
      soundFX.playClick();
    },
    []
  );

  const completeWinterChallenge = useCallback(
    async (challengeId: string) => {
      if (!profile) return { success: false, xpAwarded: 0, coinsAwarded: 0 };
      const challenge = WINTER_CHALLENGES.find((c) => c.id === challengeId);
      if (!challenge) return { success: false, xpAwarded: 0, coinsAwarded: 0 };

      const eventKey = `winter_c_${challenge.id}`;
      if (profile.claimedDailyGoals.includes(eventKey)) {
        return { success: false, xpAwarded: 0, coinsAwarded: 0 };
      }

      await applyQualifyingReward({
        baseXp: challenge.xpReward,
        baseCoins: challenge.coinReward,
        qualifiesForStreak: true,
        mutator: (draft) => {
          if (!draft.claimedDailyGoals.includes(eventKey)) {
            draft.claimedDailyGoals = [...draft.claimedDailyGoals.slice(-58), eventKey];
          }
        },
        primaryLog: {
          activityId: `winter_${challenge.id}`,
          activityType: 'winter_event_reward',
          title: `Completed ${challenge.title} (${challenge.concept})`,
        },
      });

      soundFX.playAchievementUnlock();
      pushNotification({
        title: 'Winter Mission Completed!',
        subtitle: `${challenge.title} · +${challenge.xpReward} XP, +${challenge.coinReward} Coins`,
        xpDelta: challenge.xpReward,
        coinsDelta: challenge.coinReward,
      });

      return {
        success: true,
        xpAwarded: challenge.xpReward,
        coinsAwarded: challenge.coinReward,
      };
    },
    [profile, applyQualifyingReward, pushNotification]
  );

  // Resolve canonical deployed APP_URL origin once on mount
  useEffect(() => {
    void resolveCanonicalAppOrigin().then((origin) => {
      if (origin) setCanonicalAppOrigin(origin);
    });
  }, []);

  // Sync Consecutive Daily Login Streak automatically once onboarded profile loads
  useEffect(() => {
    if (!profile || !profile.onboardingCompleted) return;
    const today = formatLocalDateKey();
    const syncToken = `${profile.uid}__${today}`;
    if (syncedLoginDateRef.current === syncToken) return;
    syncedLoginDateRef.current = syncToken;

    const localLoginStreak = computeStreakAfterQualifyingActivity(
      profile.currentStreak,
      profile.longestStreak,
      profile.lastActivityDate,
      profile.activityDates
    );

    if (localLoginStreak.incrementedToday || profile.lastActivityDate !== today) {
      const updatedProfile: PlayerProfile = {
        ...profile,
        currentStreak: localLoginStreak.currentStreak,
        longestStreak: localLoginStreak.longestStreak,
        lastActivityDate: localLoginStreak.lastActivityDate,
        activityDates: localLoginStreak.activityDates,
      };
      setProfile(updatedProfile);
      setTotalActiveDays((prev) => Math.max(prev, updatedProfile.activityDates.length));
      if (updatedProfile.isDemo) {
        saveDemoBundle(updatedProfile, missionRecords, activityLogs, todayExercisesMap);
      } else {
        void recordCloudProgressBatch(updatedProfile, []);
      }
    } else {
      setTotalActiveDays((prev) => Math.max(prev, profile.activityDates.length));
    }

    void syncServerDailyStreak({
      userId: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      totalXp: profile.totalXp,
      localDateKey: today,
      activityType: 'daily_login',
      currentStreak: localLoginStreak.currentStreak,
      longestStreak: localLoginStreak.longestStreak,
    })
      .then((res) => {
        setTotalActiveDays(res.streak.totalActiveDays);
      })
      .catch(() => {
        // Keep local streak state if offline
      });
  }, [profile, missionRecords, activityLogs, todayExercisesMap, saveDemoBundle]);

  // Connect Real-Time WebSocket Hub for Presence, Room Sync, Poses, and Direct Friend Invites
  useEffect(() => {
    if (!profile || !profile.onboardingCompleted) {
      if (socketRef.current) {
        socketRef.current.dispose();
        socketRef.current = null;
      }
      return;
    }

    const conn = new CodelandSocketConnection(
      (ev) => {
        if (ev.type === 'room:updated') {
          setActiveRoom((prev) => {
            const isMember = ev.room.members.some((m) => m.userId === profile.uid);
            if (!isMember && (!prev || prev.roomCode !== ev.room.roomCode)) {
              return prev;
            }
            if (!isMember && prev && prev.roomCode === ev.room.roomCode) {
              return null;
            }
            return ev.room;
          });
        } else if (ev.type === 'room:kicked') {
          setActiveRoom((prev) => (prev?.roomCode === ev.roomCode ? null : prev));
          pushNotification({
            title: 'Removed from Room',
            subtitle: `The host removed you from ${ev.roomName} (${ev.roomCode}).`,
          });
          setSection((prevSec) =>
            prevSec === AppSection.MULTIPLAYER_GAME ? AppSection.MULTIPLAYER : prevSec
          );
        } else if (ev.type === 'player:pose') {
          setRemotePlayerPoses((prev) => ({
            ...prev,
            [ev.userId]: { yawDeg: ev.yawDeg, pitchDeg: ev.pitchDeg },
          }));
        } else if (ev.type === 'invite:init') {
          setIncomingInvitations(
            ev.invitations.filter((i) => i.invitationStatus === 'pending')
          );
        } else if (ev.type === 'invite:received') {
          soundFX.playCoinCollect();
          setIncomingInvitations((prev) => {
            const filtered = prev.filter((x) => x.id !== ev.invitation.id);
            return [ev.invitation, ...filtered];
          });
        } else if (ev.type === 'invite:updated') {
          setIncomingInvitations((prev) =>
            prev.filter(
              (x) =>
                x.id !== ev.invitation.id || ev.invitation.invitationStatus === 'pending'
            )
          );
          setFriendsRevision((r) => r + 1);
        } else if (ev.type === 'presence:updated' || ev.type === 'friend:updated') {
          setFriendsRevision((r) => r + 1);
        }
      },
      () => {
        // Re-sync active room on socket reconnect
        void fetchActiveRoomForUser(profile.uid)
          .then((room) => {
            if (room) setActiveRoom(room);
          })
          .catch(() => {});
      }
    );

    conn.identify({
      userId: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      totalXp: profile.totalXp,
      currentStreak: effectiveStreak,
    });
    socketRef.current = conn;

    // Recover active room if page refreshed mid-lobby or mid-match
    void fetchActiveRoomForUser(profile.uid)
      .then((room) => {
        if (room) {
          setActiveRoom(room);
        }
      })
      .catch(() => {});

    return () => {
      conn.dispose();
      socketRef.current = null;
    };
  }, [profile?.uid, profile?.onboardingCompleted]);

  // Keep socket identity metadata & watchedRoomCode updated
  useEffect(() => {
    if (!socketRef.current || !profile || !profile.onboardingCompleted) return;
    socketRef.current.identify({
      userId: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      totalXp: profile.totalXp,
      currentStreak: effectiveStreak,
    });
  }, [
    profile?.username,
    profile?.displayName,
    profile?.avatarId,
    profile?.totalXp,
    effectiveStreak,
    profile?.onboardingCompleted,
  ]);

  useEffect(() => {
    socketRef.current?.watchRoom(activeRoom?.roomCode || previewRoomCode || null);
    if (typeof window !== 'undefined') {
      if (activeRoom && activeRoom.roomStatus === 'waiting') {
        const targetPath = `/room/${activeRoom.roomCode}`;
        if (window.location.pathname !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
      } else if (!activeRoom && !previewRoomCode && window.location.pathname.startsWith('/room/')) {
        window.history.replaceState({}, '', '/');
      }
    }
  }, [activeRoom?.roomCode, activeRoom?.roomStatus, previewRoomCode]);

  // Automatically launch 360°/AR Multiplayer Arena when match enters starting/in_progress
  useEffect(() => {
    if (!activeRoom) return;
    if (activeRoom.roomStatus === 'starting' || activeRoom.roomStatus === 'in_progress') {
      setSection((prev) => (prev !== AppSection.MULTIPLAYER_GAME ? AppSection.MULTIPLAYER_GAME : prev));
    } else if (
      (activeRoom.roomStatus === 'cancelled' || activeRoom.roomStatus === 'expired') &&
      section === AppSection.MULTIPLAYER_GAME
    ) {
      setSection(AppSection.MULTIPLAYER);
    }
  }, [activeRoom?.roomStatus, section]);

  const openCreatePrivateRoomFlow = useCallback(() => {
    setCreateModalRequested(true);
    setSection(AppSection.MULTIPLAYER);
  }, []);

  const openJoinRoomPreviewFlow = useCallback((code: string) => {
    const clean = normalizeRoomCode(code);
    if (!clean) return;
    setPreviewRoomCode(clean);
    setSection(AppSection.MULTIPLAYER);
  }, []);

  const joinRoomByCodeAction = useCallback(
    async (code: string): Promise<GameRoom> => {
      if (!profile) throw new Error('Please sign in first.');
      const res = await joinPrivateRoom(code, {
        userId: profile.uid,
        username: profile.username,
        displayName: profile.displayName,
        avatarId: profile.avatarId,
      });
      setActiveRoom(res.room);
      setPreviewRoomCode(null);
      setPendingInviteRoomCode(null);
      savePendingInviteRoomCode(null);
      soundFX.playAchievementUnlock();
      setSection(
        res.room.roomStatus === 'starting' || res.room.roomStatus === 'in_progress'
          ? AppSection.MULTIPLAYER_GAME
          : AppSection.MULTIPLAYER
      );
      return res.room;
    },
    [profile]
  );

  const acceptDirectInviteAndJoin = useCallback(
    async (inv: RoomInvitation) => {
      if (!profile) return;
      try {
        await respondToRoomInvite(inv.id, profile.uid, 'accepted').catch(() => {});
        setIncomingInvitations((prev) => prev.filter((x) => x.id !== inv.id));
        await joinRoomByCodeAction(inv.roomCode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to join room.';
        pushNotification({
          title: 'Could Not Join Room',
          subtitle: msg,
        });
      }
    },
    [profile, joinRoomByCodeAction, pushNotification]
  );

  const declineDirectInvite = useCallback(
    async (inv: RoomInvitation) => {
      if (!profile) return;
      setIncomingInvitations((prev) => prev.filter((x) => x.id !== inv.id));
      await respondToRoomInvite(inv.id, profile.uid, 'declined').catch(() => {});
    },
    [profile]
  );

  const emitArenaPose = useCallback(
    (yawDeg: number, pitchDeg: number) => {
      if (!activeRoom || !socketRef.current) return;
      socketRef.current.sendPlayerPoseThrottled(activeRoom.roomCode, yawDeg, pitchDeg);
    },
    [activeRoom]
  );

  const completeMultiplayerMatchReward = useCallback(
    async (
      roomId: string,
      roomCode: string,
      mode: RoomGameMode,
      wonOrCoopSuccess: boolean,
      score: number
    ) => {
      if (!profile) return;
      const matchKey = `${roomId}__${activeRoom?.matchState?.startedAtIso || roomCode}`;
      if (rewardedMatchIdsRef.current.has(matchKey)) return;
      rewardedMatchIdsRef.current.add(matchKey);

      const xpGain = wonOrCoopSuccess ? 65 : 35;
      const coinsGain = wonOrCoopSuccess ? 30 : 15;
      const modeTitle =
        mode === 'coding_race'
          ? 'Coding Race'
          : mode === 'coop_adventure'
          ? 'Co-op Adventure'
          : 'Challenge Mode';

      await applyQualifyingReward({
        baseXp: xpGain,
        baseCoins: coinsGain,
        qualifiesForStreak: true,
        mutator: () => {},
        primaryLog: {
          activityId: `mp_${roomCode}`,
          activityType: 'multiplayer_match',
          title: `Completed ${modeTitle} in Room ${roomCode} (${score} pts)`,
        },
      });

      pushNotification({
        title: wonOrCoopSuccess ? `${modeTitle} Victory!` : `${modeTitle} Completed!`,
        subtitle: `Room ${roomCode} · Score: ${score} pts`,
        xpDelta: xpGain,
        coinsDelta: coinsGain,
      });
    },
    [profile, activeRoom?.matchState?.startedAtIso, applyQualifyingReward, pushNotification]
  );

  const persistWorld1State = useCallback(
    async (nextW1: World1PersistentState) => {
      const stamped: World1PersistentState = {
        ...nextW1,
        updatedAtIso: new Date().toISOString(),
      };
      world1StateRef.current = stamped;
      setWorld1State(stamped);

      if (!profile) return;
      if (profile.isDemo) {
        saveDemoBundle(profile, missionRecords, activityLogs, todayExercisesMap, stamped);
      } else if (firebaseUser) {
        const isNew = !world1CloudDocExistsRef.current;
        await saveCloudWorld1State(profile.uid, stamped, isNew);
        world1CloudDocExistsRef.current = true;
      }
    },
    [profile, firebaseUser, missionRecords, activityLogs, todayExercisesMap, saveDemoBundle]
  );

  const recordWorld1TaskSolved = useCallback(
    async (params: {
      levelNumber: number;
      siteId: World1SiteId;
      taskId: string;
      newStage: number;
      xpBonus: number;
      coinBonus: number;
      playerPos?: [number, number, number];
      scannerRegistration?: { name: string; crystals: number };
      purchasedSupplyId?: string;
    }): Promise<{ firstTimeTask: boolean }> => {
      if (!profile) return { firstTimeTask: false };
      const cur = world1StateRef.current;
      const alreadySolvedTask = cur.completedTaskIds.includes(params.taskId);
      const monotonicStage = Math.max(
        cur.structureStages[params.siteId] || 0,
        Math.max(0, Math.min(4, Math.round(params.newStage)))
      );

      const nextStages = {
        ...cur.structureStages,
        [params.siteId]: monotonicStage,
      };
      const nextTaskIds = alreadySolvedTask
        ? cur.completedTaskIds
        : [...cur.completedTaskIds.slice(-48), params.taskId];
      const curPurchased = cur.purchasedSupplyIds || [];
      const nextPurchased =
        params.purchasedSupplyId && !curPurchased.includes(params.purchasedSupplyId)
          ? [...curPurchased.slice(-18), params.purchasedSupplyId]
          : curPurchased;

      const nextW1: World1PersistentState = {
        ...cur,
        completedTaskIds: nextTaskIds,
        purchasedSupplyIds: nextPurchased,
        collectedSupplyIds: cur.collectedSupplyIds || [],
        structureStages: nextStages,
        playerX: params.playerPos ? params.playerPos[0] : cur.playerX,
        playerY: params.playerPos ? params.playerPos[1] : cur.playerY,
        playerZ: params.playerPos ? params.playerPos[2] : cur.playerZ,
        registeredVillagerName: params.scannerRegistration?.name
          ? params.scannerRegistration.name.trim().slice(0, 32) || cur.registeredVillagerName
          : cur.registeredVillagerName,
        registeredCrystalCount:
          params.scannerRegistration && Number.isFinite(params.scannerRegistration.crystals)
            ? Math.max(0, Math.min(100000, Math.round(params.scannerRegistration.crystals)))
            : cur.registeredCrystalCount,
        updatedAtIso: new Date().toISOString(),
      };

      await persistWorld1State(nextW1);

      if (!alreadySolvedTask && (params.xpBonus > 0 || params.coinBonus > 0)) {
        await applyQualifyingReward({
          baseXp: params.xpBonus,
          baseCoins: params.coinBonus,
          qualifiesForStreak: true,
          extraExercisesTodayIncrement: true,
          mutator: (draft) => {
            if (!draft.completedExercises.includes(params.taskId)) {
              draft.completedExercises = [...draft.completedExercises.slice(-248), params.taskId];
            }
          },
          primaryLog: {
            activityId: params.taskId,
            activityType: 'exercise',
            title: `World 1 Lv.${params.levelNumber} Construction Stage ${params.newStage}/4`,
          },
        });
      }

      return { firstTimeTask: !alreadySolvedTask };
    },
    [profile, persistWorld1State, applyQualifyingReward]
  );

  const collectWorld1Supply = useCallback(
    async (
      supplyId: string,
      playerPos?: [number, number, number]
    ): Promise<{ firstTimeCollect: boolean }> => {
      const cur = world1StateRef.current;
      const curCollected = cur.collectedSupplyIds || [];
      const alreadyCollected = curCollected.includes(supplyId);
      const nextCollected = alreadyCollected
        ? curCollected
        : [...curCollected.slice(-18), supplyId];
      await persistWorld1State({
        ...cur,
        purchasedSupplyIds: cur.purchasedSupplyIds || [],
        collectedSupplyIds: nextCollected,
        playerX: playerPos ? playerPos[0] : cur.playerX,
        playerY: playerPos ? playerPos[1] : cur.playerY,
        playerZ: playerPos ? playerPos[2] : cur.playerZ,
      });
      return { firstTimeCollect: !alreadyCollected };
    },
    [persistWorld1State]
  );

  const completeWorld1Level = useCallback(
    async (params: {
      levelNumber: number;
      siteId: World1SiteId;
      score: number;
      timeSeconds: number;
      collectedCoinsCount: number;
      playerPos?: [number, number, number];
    }): Promise<{
      firstTime: boolean;
      xpAwarded: number;
      totalCoinsAwarded: number;
      world1RestoredNow: boolean;
    }> => {
      const cur = world1StateRef.current;
      const hadFreeRoamBefore = cur.freeRoamUnlocked;
      const nextStages = {
        ...cur.structureStages,
        [params.siteId]: Math.max(cur.structureStages[params.siteId] || 0, 4),
      };
      const nextCompletedLevels = cur.completedLevels.includes(params.levelNumber)
        ? cur.completedLevels
        : [...cur.completedLevels, params.levelNumber].sort((a, b) => a - b);
      const allTenRestored =
        params.levelNumber === 10 ||
        WORLD1_SITE_KEYS.every((k) => (nextStages[k] || 0) >= 4);

      const nextW1: World1PersistentState = {
        ...cur,
        completedLevels: nextCompletedLevels,
        structureStages: nextStages,
        playerX: params.playerPos ? params.playerPos[0] : cur.playerX,
        playerY: params.playerPos ? params.playerPos[1] : cur.playerY,
        playerZ: params.playerPos ? params.playerPos[2] : cur.playerZ,
        unlockedForestOutfit: cur.unlockedForestOutfit || allTenRestored,
        equippedForestOutfit:
          cur.equippedForestOutfit || (!cur.unlockedForestOutfit && allTenRestored),
        unlockedCompanionAccessory: cur.unlockedCompanionAccessory || allTenRestored,
        equippedCompanionAccessory:
          cur.equippedCompanionAccessory || (!cur.unlockedCompanionAccessory && allTenRestored),
        freeRoamUnlocked: cur.freeRoamUnlocked || allTenRestored,
        updatedAtIso: new Date().toISOString(),
      };

      await persistWorld1State(nextW1);

      const missionRes = await completeCampaignMission3D(
        params.levelNumber,
        params.score,
        params.timeSeconds,
        params.collectedCoinsCount
      );

      return {
        firstTime: missionRes.firstTime,
        xpAwarded: missionRes.xpAwarded,
        totalCoinsAwarded: missionRes.totalCoinsAwarded,
        world1RestoredNow: allTenRestored && !hadFreeRoamBefore,
      };
    },
    [persistWorld1State, completeCampaignMission3D]
  );

  const saveWorld1Checkpoint = useCallback(
    async (pos: [number, number, number]) => {
      const cur = world1StateRef.current;
      const dx = Math.abs(cur.playerX - pos[0]);
      const dz = Math.abs(cur.playerZ - pos[2]);
      if (dx < 0.75 && dz < 0.75) return;
      await persistWorld1State({
        ...cur,
        playerX: pos[0],
        playerY: pos[1],
        playerZ: pos[2],
      });
    },
    [persistWorld1State]
  );

  const toggleWorld1Cosmetics = useCallback(
    async (updates: {
      equippedForestOutfit?: boolean;
      equippedCompanionAccessory?: boolean;
    }) => {
      const cur = world1StateRef.current;
      await persistWorld1State({
        ...cur,
        equippedForestOutfit:
          updates.equippedForestOutfit !== undefined && cur.unlockedForestOutfit
            ? updates.equippedForestOutfit
            : cur.equippedForestOutfit,
        equippedCompanionAccessory:
          updates.equippedCompanionAccessory !== undefined && cur.unlockedCompanionAccessory
            ? updates.equippedCompanionAccessory
            : cur.equippedCompanionAccessory,
      });
    },
    [persistWorld1State]
  );

  const updateWorld1ScannerRegistration = useCallback(
    async (name: string, crystals: number) => {
      const cur = world1StateRef.current;
      await persistWorld1State({
        ...cur,
        registeredVillagerName: name.trim().slice(0, 32) || cur.registeredVillagerName,
        registeredCrystalCount: Math.max(0, Math.min(100000, Math.round(crystals || 0))),
      });
    },
    [persistWorld1State]
  );

  const markWorld1CinematicTourDone = useCallback(async () => {
    const cur = world1StateRef.current;
    if (cur.cinematicTourCompleted) return;
    await persistWorld1State({
      ...cur,
      cinematicTourCompleted: true,
    });
  }, [persistWorld1State]);

  const value: PlayerContextValue = {
    section,
    setSection,
    activeLessonId,
    setActiveLessonId,
    activeWorldId,
    setActiveWorldId,
    activeCampaignLevel,
    setActiveCampaignLevel,
    activeStage,
    setActiveStage,
    certificateOpen,
    setCertificateOpen,
    glossaryOpen,
    setGlossaryOpen,
    authLoading,
    authError,
    tokenServiceActivationUrl,
    clearAuthError: () => setAuthError(null),
    firebaseUser,
    profile,
    effectiveStreak,
    totalActiveDays: Math.max(totalActiveDays, profile?.activityDates.length || 0),
    missionRecords,
    activityLogs,
    cloudLeaderboard,
    demoChallengers,
    notifications,
    dismissNotification,
    pushToast: pushNotification,
    theme: activeTheme,
    toggleThemeQuick,
    canonicalAppOrigin,
    activeRoom,
    setActiveRoom,
    pendingInviteRoomCode,
    previewRoomCode,
    setPreviewRoomCode,
    createModalRequested,
    setCreateModalRequested,
    openCreatePrivateRoomFlow,
    openJoinRoomPreviewFlow,
    joinRoomByCodeAction,
    incomingInvitations,
    acceptDirectInviteAndJoin,
    declineDirectInvite,
    friendsRevision,
    bumpFriendsRevision: () => setFriendsRevision((r) => r + 1),
    remotePlayerPoses,
    emitArenaPose,
    completeMultiplayerMatchReward,
    loginWithGoogle,
    enterDemoMode,
    completeOnboarding,
    logout,
    resetDemoAccount,
    isLevelAcademyUnlocked,
    isLessonUnlocked,
    isWorldUnlocked,
    isCampaignLevelUnlocked,
    getCampaignLevelProgress,
    nextIncompleteCampaignLevel,
    completedCampaignLevelsCount,
    completedCampaignLessonsCount,
    openLesson,
    openWorld,
    openCampaignLevel,
    completeLesson,
    completePracticeExercise,
    passLevelAssessment,
    completeWorldMission,
    completeCampaignLesson,
    completeCampaignGuidedPractice,
    completeCampaignMission3D,
    saveProfileCustomization,
    saveSettings,
    dailyGoalStatus,
    dailyRewardClaimedToday,
    claimDailyRewardChest,
    ownedItemIds,
    equippedSkinId: profile?.avatarId || 'character-a',
    equippedPetId,
    equippedAccessoryId,
    equippedThemeId,
    buyMarketplaceItem,
    equipMarketplaceItem,
    unequipMarketplaceItem,
    completedWinterChallengeIds,
    completeWinterChallenge,
    world1State,
    recordWorld1TaskSolved,
    collectWorld1Supply,
    completeWorld1Level,
    saveWorld1Checkpoint,
    toggleWorld1Cosmetics,
    updateWorld1ScannerRegistration,
    markWorld1CinematicTourDone,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
