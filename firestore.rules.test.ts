/**
 * Firestore Security Rules Test Specification — Dirty Dozen Verification
 * Verifies all 12 adversarial payloads from security_spec.md are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  authUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on /users/{victimUid}',
    collectionPath: '/users/victim_1',
    authUid: 'attacker_1',
    emailVerified: true,
    operation: 'create',
    payload: { uid: 'victim_1', username: 'spoofed' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collectionPath: '/users/attacker_1',
    authUid: 'attacker_1',
    emailVerified: false,
    operation: 'create',
    payload: { uid: 'attacker_1', username: 'unverified' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Ghost Field Injection',
    collectionPath: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: { displayName: 'Alex', isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Leak Attempt on /users/user_1/private/info',
    collectionPath: '/users/user_1/private/info',
    authUid: 'user_2',
    emailVerified: true,
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User Profile Read on /users/user_1',
    collectionPath: '/users/user_1',
    authUid: 'user_2',
    emailVerified: true,
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Leaderboard XP Inflation',
    collectionPath: '/leaderboard/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: { totalXp: 999999 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client Timestamp Forgery on Create',
    collectionPath: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable uid/createdAt Mutation',
    collectionPath: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: { uid: 'other_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning on ActivityLog Path Variable',
    collectionPath: '/users/user_1/activityLogs/invalid$id!',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'create',
    payload: { userId: 'user_1', activityId: 'act_1' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Whitelisted displayName',
    collectionPath: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: { displayName: 'X'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Exhaustion on completedLessons',
    collectionPath: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: { completedLessons: Array.from({ length: 500 }, (_, i) => `l-${i}`) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable ActivityLog Tampering',
    collectionPath: '/users/user_1/activityLogs/log_1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'WorldState Structure Stage Downgrade Attack',
    collectionPath: '/users/user_1/worldState/world-1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: {
      structureStages: {
        beacon: 0,
      },
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 14,
    name: 'Cross-User WorldState Read Attempt',
    collectionPath: '/users/user_1/worldState/world-1',
    authUid: 'user_2',
    emailVerified: true,
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 15,
    name: 'WorldState Unbounded Supply Pickup Array Injection',
    collectionPath: '/users/user_1/worldState/world-1',
    authUid: 'user_1',
    emailVerified: true,
    operation: 'update',
    payload: {
      collectedSupplyIds: Array.from({ length: 100 }, (_, i) => `supply_${i}`),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];


