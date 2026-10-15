# Security Specification & Test Matrix

## 1. Data Invariants
1. **Catalog Integrity**: Only verified administrators (`reinatorrez001@gmail.com` or documents in `/admins/{uid}`) can create, edit, or delete novels, episodes, and platform ad configuration.
2. **Public Access to Catalog**: Anyone can read published novels and published episodes.
3. **User Data Isolation**: A user can only read, write, update, or delete their own `/users/{userId}/**` documents (progress, watchlist, unlocked episodes). Impersonating another `userId` must return PERMISSION_DENIED.
4. **Community Moderation**: Authenticated users can write comments if `userId == request.auth.uid`. Regular users cannot modify `isHidden` or `isReported` to falsify moderation state; only administrators can alter moderation flags or delete abusive comments.
5. **Auditing**: Audit logs are append-only by verified administrators with strict timestamp checks.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Novel Creation**: Anonymous user attempts to create a document in `/novels/novel-123`.
2. **Non-Admin Novel Update**: Authenticated user with email `viewer@gmail.com` attempts to change `title` in `/novels/novel-123`.
3. **Cross-User Progress Hijack**: User `user-A` attempts to write progress in `/users/user-B/progress/novel-123`.
4. **Watchlist Spoofing**: User `user-A` attempts to delete a bookmark in `/users/user-B/watchlist/novel-123`.
5. **Junk ID Poisoning**: Request with document ID longer than 128 characters or containing illegal characters like `<script>` or `/`.
6. **Shadow Field Injection**: Admin or user creates a novel or comment with an unregistered hidden property (e.g., `__superAdmin: true`).
7. **Comment Impersonation**: User `user-A` submits a comment with `userId: "user-B"`.
8. **Malicious Comment Auto-Unmoderation**: User attempts to update `isHidden: false` on a comment they previously authored.
9. **Fake Ad Config Modification**: Normal user attempts to change `interstitialFrequency` to 0 in `/config/ads`.
10. **Unauthenticated Audit Log Insertion**: Random user writes to `/auditLogs`.
11. **Oversized String Payload**: Attacker sends a comment with `text` exceeding 1000 characters to trigger memory exhaustion.
12. **Admin Email Spoof without Verification**: Attacker attempts admin action with email `reinatorrez001@gmail.com` but `email_verified: false`.

## 3. Implementation Verification
The `firestore.rules` enforces these 12 invariants using:
- `isValidId()` for path variables
- `isAdmin()` helper requiring verified email or admin collection record
- `incoming().keys().hasOnly(...)` for anti-update gap prevention
- Strict ownership checks `isOwner(userId)`
- Bounded string sizes (`.size() <= max`)
