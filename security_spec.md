# CODELAND Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Unmatched paths (`/{document=**}`) deny all reads and writes unconditionally.
2. **PII Split Isolation**: User email addresses are stored exclusively in `/users/{userId}/private/info` and restricted to `request.auth.uid == userId`. Neither `/users/{userId}` nor `/leaderboard/{userId}` may contain `email` or other PII fields.
3. **Verified Identity**: All writes (`create`, `update`) require `request.auth != null && request.auth.token.email_verified == true` and strict ownership (`request.auth.uid == userId`).
4. **Atomic Leaderboard Synchronization**:
   - Creating `/users/{userId}` requires `existsAfter(/databases/$(database)/documents/leaderboard/$(userId))`.
   - Updating XP/progress on `/users/{userId}` requires `getAfter(/databases/$(database)/documents/leaderboard/$(userId)).data.totalXp == request.resource.data.totalXp`.
   - Creating or updating `/leaderboard/{userId}` requires `getAfter(/databases/$(database)/documents/users/$(userId)).data.totalXp == request.resource.data.totalXp`.
5. **Master Gate on Subcollections**: Every write to `/users/{userId}/private/{docId}`, `/users/{userId}/missionRecords/{worldId}`, and `/users/{userId}/activityLogs/{logId}` verifies parent ownership via `getAfter(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`, and single-doc reads verify `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`.
6. **Monotonic XP & Longest Streak**: `totalXp` and `longestStreak` cannot decrease on `RecordProgress` updates, and `activityLogs` are immutable (`allow update, delete: if false`).
7. **Strict Key Allowlists & Temporal Integrity**: Every `create` checks `hasAll` + `hasOnly` and `createdAt == request.time`. Every `update` wraps `isValid[Entity](incoming())`, locks `uid` and `createdAt`, enforces `updatedAt == request.time`, and restricts diffs via `affectedKeys().hasOnly(...)`.
8. **Secure List Queries**: `allow list` on `/leaderboard/{userId}` enforces `resource.data.visibility == 'public'`, and `allow list` on owner subcollections enforces `resource.data.userId == request.auth.uid` without `get()` calls.
9. **Unique Daily Streak Records**: `/userStreaks/{userId}` is strictly owner-restricted (`request.auth.uid == userId`), and `/userStreaks/{userId}/activities/{dateKey}` enforces `dateKey == incoming().activityDate` (`YYYY-MM-DD`), immutable once created (`allow update, delete: if false`), guaranteeing unique `(userId, activityDate)` records.
10. **Private Room Host Authority & Terminal State Locking**: `/gameRooms/{roomId}` requires `hostUserId == request.auth.uid` on creation with atomic host membership (`existsAfter(/databases/$(database)/documents/gameRooms/$(roomId)/members/$(request.auth.uid))`), locks all mutations once `existing().roomStatus in ['completed', 'cancelled', 'expired']`, and restricts settings/status updates to the current `existing().hostUserId`.
11. **Unique Room Membership & Master Gate**: `/gameRooms/{roomId}/members/{memberUid}` enforces `memberUid == incoming().userId`, verifies the parent `/gameRooms/{roomId}` is in `'waiting'` status on join, and allows deletion only by the member themselves (leaving) or the parent room's `hostUserId` (kick).
12. **Invitation Sender/Recipient Guard**: `/roomInvitations/{inviteId}` restricts `get`/`list` to `senderUserId == request.auth.uid || recipientUserId == request.auth.uid`, verifies the sender is a member of the parent `/gameRooms/{roomId}` (and either `isHost` or `allowFriendsToInvite == true`), locks terminal states (`accepted`, `declined`, `expired`), and allows only `recipientUserId` to transition `pending` -> `accepted` or `declined`.
13. **Persistent WorldState Monotonic Construction & Master Gate**: `/users/{userId}/worldState/{worldId}` is strictly owner-restricted (`isOwner(userId)` + Master Gate `get`/`getAfter` on `/users/{userId}`), enforces exact 10-site `structureStages` map (`0..4`), bounds `purchasedSupplyIds` and `collectedSupplyIds` (`max 20` items, `<= 32` chars), forbids list scraping (`allow list: if false`), and enforces monotonic `>=` stage transitions on `update` so completed 3D structures can never be downgraded or destroyed.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on `/users/{victimUid}`**: Authenticated user `attacker_1` writes a valid `UserProfile` payload with `uid: "victim_1"` to `/users/victim_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempts to create `/users/attacker_1` -> `PERMISSION_DENIED`.
3. **Shadow Ghost Field Injection**: Owner sends `update` to `/users/user_1` with `{ displayName: "Alex", isAdmin: true, updatedAt: request.time }` -> `PERMISSION_DENIED` (blocked by `hasOnly` in `isValidUserProfile` and `affectedKeys().hasOnly`).
4. **PII Leak Attempt**: Authenticated user `user_2` attempts `get` on `/users/user_1/private/info` -> `PERMISSION_DENIED`.
5. **Cross-User Profile Scraping**: Authenticated user `user_2` attempts `get` or `list` on `/users/user_1` -> `PERMISSION_DENIED`.
6. **Orphaned Leaderboard Inflation**: Owner updates `/leaderboard/user_1` with `totalXp: 999999` without updating `/users/user_1` -> `PERMISSION_DENIED` (`getAfter` mismatch).
7. **Timestamp Forgery**: Owner creates `/users/user_1` with a past client `Timestamp` (`2020-01-01`) instead of `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Owner updates `/users/user_1` changing `createdAt` or `uid` -> `PERMISSION_DENIED`.
9. **ID Poisoning / Oversized Path Variable**: Attacker targets `/users/user_1/activityLogs/bad$id!with/slashes` or 200-char ID -> `PERMISSION_DENIED` (`isValidId` regex/length guard).
10. **Value Poisoning on Whitelisted Key**: Owner updates `displayName` with a 5,000-character string or boolean `true` -> `PERMISSION_DENIED` (`isValidUserProfile` enforces `string` and `size() <= 40`).
11. **Unbounded Array Exhaustion**: Owner updates `completedLessons` with 500 elements -> `PERMISSION_DENIED` (`size() <= 150` guard).
12. **WorldState Structure Downgrade / Tampering**: Owner or attacker attempts to downgrade a built structure in `/users/user_1/worldState/world-1` from stage `4` to `0` or delete the document -> `PERMISSION_DENIED`.

