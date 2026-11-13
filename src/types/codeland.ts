export enum AppSection {
  LANDING = 'landing',
  AUTH = 'auth',
  ONBOARDING = 'onboarding',
  DASHBOARD = 'dashboard',
  ACADEMY = 'academy',
  LESSON = 'lesson',
  PRACTICE = 'practice',
  WORLDS = 'worlds',
  GAME = 'game',
  MULTIPLAYER = 'multiplayer',
  MULTIPLAYER_GAME = 'multiplayer_game',
  ACHIEVEMENTS = 'achievements',
  LEADERBOARD = 'leaderboard',
  PROFILE = 'profile',
  SETTINGS = 'settings',
  EVENTS = 'events',
  SHOP = 'shop',
}

export type ExperienceLevel = 'beginner' | 'some_java' | 'some_programming';
export type GraphicsQuality = 'high' | 'low';
export type ThemeMode = 'dark' | 'light';

export interface CharacterAvatar {
  id: string;
  name: string;
  roleTitle: string;
  previewUrl: string;
  glbUrl: string;
  accentHex: string;
}

export interface PlayerProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  onboardingCompleted: boolean;
  totalXp: number;
  dailyXp: number;
  weeklyXp: number;
  lastDailyKey: string;
  lastWeeklyKey: string;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  completedLessons: string[];
  completedExercises: string[];
  passedAssessments: string[];
  completedMissions: string[];
  unlockedAchievements: string[];
  claimedDailyGoals: string[];
  activityDates: string[];
  graphicsQuality: GraphicsQuality;
  soundMuted: boolean;
  theme: ThemeMode;
  isDemo: boolean;
}

export interface MissionRecordData {
  userId: string;
  worldId: string;
  bestScore: number;
  bestTimeSeconds: number;
  xpEarned: number;
  completionsCount: number;
}

export type ActivityType =
  | 'daily_login'
  | 'lesson'
  | 'exercise'
  | 'assessment'
  | 'mission'
  | 'multiplayer_match'
  | 'daily_goal'
  | 'streak_milestone'
  | 'marketplace_purchase'
  | 'winter_event_reward';

export type ShopCategory = 'skins' | 'pets' | 'accessories' | 'themes' | 'boosters';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  description: string;
  iconKind: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  avatarId?: string;
  accentColor: string;
  previewUrl?: string;
}

export interface WinterEventChallenge {
  id: string;
  title: string;
  concept: string;
  xpReward: number;
  coinReward: number;
  description: string;
  codeTaskPrompt: string;
  starterCode: string;
  solutionCode: string;
  testInput?: string;
  expectedOutput: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  activityId: string;
  activityType: ActivityType;
  title: string;
  xpAmount: number;
  coinsAmount: number;
  timestampIso: string;
}

export interface LeaderboardPlayer {
  uid: string;
  username: string;
  displayName: string;
  avatarId: string;
  totalXp: number;
  dailyXp: number;
  weeklyXp: number;
  lastDailyKey: string;
  lastWeeklyKey: string;
  currentStreak: number;
  achievementsCount: number;
  lessonsCompletedCount: number;
  missionsCompletedCount: number;
  isDemoNpc?: boolean;
}

export interface CliCommandValidationSpec {
  promptLabel: string;
  placeholder: string;
  expectedCommand: string;
  wrongCommandHints?: { pattern: RegExp; message: string }[];
  commandOnly?: boolean;
}

export interface CodeValidationSpec {
  expectedOutputLines?: string[];
  expectedOutputContains?: string[];
  requiredPatterns?: { regex: RegExp; message: string }[];
  requiredRawPatterns?: { regex: RegExp; message: string }[];
  forbiddenPatterns?: { regex: RegExp; message: string }[];
  requireExactPrintCount?: number;
  simulatedStdin?: string[];
  cliCommandSpec?: CliCommandValidationSpec;
}

export interface VisualDemoConfig {
  kind: 'output_flow' | 'variable_boxes' | 'condition_gate' | 'loop_stepper' | 'method_machine' | 'object_blueprint';
  title: string;
  caption: string;
}

export interface JavaLesson {
  id: string;
  levelNumber: number;
  orderInLevel: number;
  title: string;
  estimatedMinutes: number;
  xpReward: number;
  coinReward: number;
  introduction: string;
  conceptExplanation: string[];
  visualDemo: VisualDemoConfig;
  syntaxExample: string;
  lineByLine: { line: string; explanation: string }[];
  guidedPrompt: string;
  independentPrompt: string;
  starterCode: string;
  hints: string[];
  solutionCode: string;
  validation: CodeValidationSpec;
}

export interface ReadinessQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface JavaLevel {
  levelNumber: number;
  id: string;
  worldId: string;
  title: string;
  subtitle: string;
  themeName: string;
  accentColor: string;
  npcName: string;
  npcRole: string;
  npcAvatarId: string;
  storyIntro: string;
  learningObjective: string;
  adventureUnlockText: string;
  topics: string[];
  lessons: JavaLesson[];
  assessment: ReadinessQuestion[];
}

export type ExerciseType =
  | 'mcq'
  | 'predict_output'
  | 'fill_blank'
  | 'find_error'
  | 'arrange_code'
  | 'write_code'
  | 'debug_code';

export type ExerciseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface PracticeExercise {
  id: string;
  levelNumber: number;
  topic: string;
  difficulty: ExerciseDifficulty;
  type: ExerciseType;
  title: string;
  prompt: string;
  codeContext?: string;
  options?: string[];
  correctOptionIndex?: number;
  expectedTextAnswer?: string;
  jumbledLines?: string[];
  correctOrderIndices?: number[];
  starterCode?: string;
  validation?: CodeValidationSpec;
  hint: string;
  explanation: string;
  xpReward: number;
  coinReward: number;
}

export interface GlossaryTerm {
  term: string;
  category: string;
  simpleDefinition: string;
  javaExample: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'adventure' | 'streak' | 'mastery';
  iconKind: 'sprout' | 'terminal' | 'box' | 'shield' | 'repeat' | 'cpu' | 'cube' | 'flame' | 'crown' | 'swords';
  accentHex: string;
  bonusXp: number;
  bonusCoins: number;
  streakRequirement?: number;
}

export interface WorldObstacleSpec {
  id: string;
  title: string;
  npcPrompt: string;
  objectiveLabel: string;
  starterCode: string;
  hints: string[];
  validation: CodeValidationSpec;
  successActionText: string;
  position: [number, number, number];
}

export interface WorldSpec {
  worldId: string;
  levelNumber: number;
  name: string;
  biomeTitle: string;
  tagline: string;
  skyHex: string;
  fogHex: string;
  groundPrimaryHex: string;
  groundSecondaryHex: string;
  accentHex: string;
  npcName: string;
  npcRole: string;
  npcAvatarId: string;
  npcDialogue: string[];
  missionTitle: string;
  missionSummary: string;
  obstacles: [WorldObstacleSpec, WorldObstacleSpec];
  portalPosition: [number, number, number];
  coinPositions: [number, number, number][];
}

export interface RewardNotification {
  id: string;
  title: string;
  subtitle: string;
  xpDelta?: number;
  coinsDelta?: number;
  badgeTitle?: string;
}

export type RoomGameMode = 'coding_race' | 'coop_adventure' | 'challenge_mode';

export type RoomStatus =
  | 'waiting'
  | 'starting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UserStreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalActiveDays: number;
  activityDates: string[];
  updatedAt: string;
}

export interface StreakActivityRecord {
  id: string;
  userId: string;
  activityDate: string;
  activityType: 'daily_login' | 'lesson' | 'exercise' | 'assessment' | 'mission' | 'multiplayer_match';
  createdAt: string;
}

export interface MultiplayerChallengeNode {
  id: string;
  index: number;
  bearingDeg: number;
  elevationDeg: number;
  title: string;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  /** Only populated on server or after solve verification */
  correctOptionIndex?: number;
  gridRouteTargetSteps: number;
  accentHex: string;
  solvedByUserIds: string[];
}

export interface RoomMatchState {
  startedAtIso: string;
  countdownEndsAtMs: number;
  completedAtIso?: string;
  winnerUserId?: string;
  winnerDisplayName?: string;
  sharedCoreEnergy: number;
  targetCoreEnergy: number;
  nodes: MultiplayerChallengeNode[];
}

export interface RoomMember {
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
  routeEfficiencyBonus: number;
  yawDeg: number;
  pitchDeg: number;
  online: boolean;
  completedAtIso?: string;
}

export interface GameRoom {
  id: string;
  roomCode: string;
  roomName: string;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string;
  maxPlayers: number;
  gameMode: RoomGameMode;
  selectedLevel: number;
  javaDifficulty: ExerciseDifficulty;
  allowFriendsToInvite: boolean;
  roomStatus: RoomStatus;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  members: RoomMember[];
  matchState?: RoomMatchState;
}

export interface RoomInvitation {
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

export interface FriendEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  online: boolean;
  totalXp: number;
  currentStreak: number;
  relation: 'friend' | 'incoming_request' | 'outgoing_request' | 'discover';
}

export type LevelStageNumber = 1 | 2 | 3 | 4 | 5;

export type GuidedPracticeKind = 'predict_output' | 'fill_blank' | 'arrange_code' | 'fix_error';

export interface GuidedPracticeTask {
  kind: GuidedPracticeKind;
  prompt: string;
  codeSnippet?: string;
  options?: string[];
  correctOptionIndex?: number;
  optionFeedback?: string[];
  jumbledLines?: string[];
  correctOrderIndices?: number[];
  expectedBlankAnswer?: string;
  acceptableBlankAnswers?: string[];
  hint: string;
  explanation: string;
}

export interface CampaignWorldMeta {
  worldNumber: number;
  worldId: string;
  name: string;
  biomeTitle: string;
  levelRange: [number, number];
  mentorName: string;
  mentorRole: string;
  mentorAvatarId: string;
  story: string;
  rewardBadgeId: string;
  rewardBadgeTitle: string;
  rewardBonusXp: number;
  includesCertificate?: boolean;
  accentColor: string;
  parts?: { title: string; range: [number, number] }[];
}

export interface CampaignLevel {
  levelNumber: number;
  id: string;
  worldNumber: number;
  worldId: string;
  partTitle?: string;
  isBossLevel: boolean;
  bossTitle?: string;
  difficultyBandLabel: string;
  whatPlayerLearns: string;
  whatPlayerDoes: string;
  xpReward: number;
  coinReward: number;
  /** Stage 1: Story & Mission Briefing */
  briefing: {
    storyHeadline: string;
    mentorDialogue: string[];
    missionObjective: string;
  };
  /** Stage 2: Interactive Java Lesson */
  lesson: {
    conceptSummary: string[];
    visualDemo: VisualDemoConfig;
    javaExample: string;
    lineByLine: { line: string; explanation: string }[];
  };
  /** Stage 3: Guided Practice (predict output, fill blank, arrange statements, or fix error) */
  guidedPractice: GuidedPracticeTask;
  /** Stage 4: 3D Gameplay Mission inside Voxel World */
  mission3d: {
    missionTitle: string;
    missionSummary: string;
    obstacles: [WorldObstacleSpec, WorldObstacleSpec];
  };
  /** Stage 5: Level Completion */
  masterySummary: string;
}

export type World1SiteId =
  | 'beacon'
  | 'workshop'
  | 'gatehouse'
  | 'bridge'
  | 'staircase'
  | 'lantern_grove'
  | 'map_station'
  | 'repair_district'
  | 'registration_centre'
  | 'grand_settlement';

export interface World1StructureRecord {
  siteId: World1SiteId;
  levelNumber: number;
  structureType: string;
  position: [number, number, number];
  stage: number; // 0..4
  completed: boolean;
}

export interface World1PersistentState {
  userId: string;
  worldId: 'world-1';
  completedLevels: number[];
  completedTaskIds: string[];
  purchasedSupplyIds: string[];
  collectedSupplyIds: string[];
  structureStages: Record<World1SiteId, number>;
  playerX: number;
  playerY: number;
  playerZ: number;
  unlockedForestOutfit: boolean;
  equippedForestOutfit: boolean;
  unlockedCompanionAccessory: boolean;
  equippedCompanionAccessory: boolean;
  registeredVillagerName: string;
  registeredCrystalCount: number;
  cinematicTourCompleted: boolean;
  freeRoamUnlocked: boolean;
  updatedAtIso: string;
}

export type World1StationVisualKind =
  | 'pedestal'
  | 'riverbank_post'
  | 'door_lock'
  | 'merchant_counter'
  | 'execution_core'
  | 'stone_altar'
  | 'anvil_bench'
  | 'lantern_pedestal'
  | 'map_desk'
  | 'registry_booth'
  | 'stair_landing'
  | 'lantern_post'
  | 'ranger_easel'
  | 'forge_valve'
  | 'registry_desk';

export interface World1ConstructionTask {
  id: string;
  taskNumber: 1 | 2 | 3 | 4;
  title: string;
  sproutInstruction: string;
  sproutDialogueBubble: string;
  objective: string;
  constructionStageLabel: string;
  stationPosition: [number, number, number];
  stationLabel: string;
  stationKind: World1StationVisualKind;
  sproutWaypoint: [number, number, number];
  spawnsCollectibleSupplyId?: string;
  supplySpawnPosition?: [number, number, number];
  supplyLabel?: string;
  requiresCollectedSupplyId?: string;
  starterCode: string;
  solutionCode: string;
  hints: string[];
  validation: CodeValidationSpec;
  xpBonus: number;
  coinBonus: number;
  allowsCustomScannerInput?: boolean;
}

export interface World1LevelSpec {
  levelNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  siteId: World1SiteId;
  siteName: string;
  structureTitle: string;
  structureType: string;
  javaTopic: string;
  zoneSubtitle: string;
  sitePosition: [number, number, number];
  spawnPosition: [number, number, number];
  sproutPosition: [number, number, number];
  terminalPosition: [number, number, number];
  cameraLandmarkOffset: [number, number, number];
  briefingHeadline: string;
  sproutDialogue: string[];
  conceptHeadline: string;
  conceptExplanation: string[];
  workingExampleCode: string;
  workingExampleNotes: { line: string; explanation: string }[];
  tasks: [
    World1ConstructionTask,
    World1ConstructionTask,
    World1ConstructionTask,
    World1ConstructionTask,
  ];
  completionCelebration: string;
}
