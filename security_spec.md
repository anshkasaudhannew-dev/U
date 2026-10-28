# Rocketiee AI Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched are denied for read and write.
2. **Verified Identity Gate**: Every write operation requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening (`isValidId`)**: Every single-document path variable (`userId`, `docId`, `conversationId`, `messageId`) must match `^[a-zA-Z0-9_\-]+$` with length `1..128`.
4. **PII Isolation (Split Collection)**: User PII (`email`) is strictly isolated in `/users/{userId}/private/{docId}` where only the verified owner (`request.auth.uid == userId`) can `get`, `create`, or `update`. Non-PII preferences live in `/users/{userId}/public/{docId}` and are also owner-restricted.
5. **Relational Master Gate**: A `ChatMessage` in `/conversations/{conversationId}/messages/{messageId}` can only be read, created, updated, or deleted if the parent `/conversations/{conversationId}` document exists and its `userId` equals `request.auth.uid`.
6. **Temporal Integrity**: On `create`, `createdAt == request.time && updatedAt == request.time`. On `update`, `createdAt == resource.data.createdAt && updatedAt == request.time`.
7. **Shadow Field Rejection**: Every `create` checks `keys().hasAll(...) && keys().hasOnly(...)`. Every `update` checks `incoming().diff(existing()).affectedKeys().hasOnly(...)` combined with `isValid[Entity](incoming())`.
8. **Secure List Queries**: `allow list` on `/conversations` and `/conversations/{conversationId}/messages` explicitly enforces `resource.data.userId == request.auth.uid` so unauthorized queries are rejected by the rule engine.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Write Spoof**: Authenticated user with `email_verified: false` attempting to create `/conversations/conv_1`.
2. **Shadow Field Injection on Conversation Create**: Adding `"isAdmin": true` to `/conversations/conv_1`.
3. **Identity Spoofing on Conversation Create**: Authenticated user `user_A` creating `/conversations/conv_1` with `userId: "user_B"`.
4. **ID Poisoning Attack**: Creating a conversation with a 500-character or special-character ID `conv_$$$###`.
5. **Orphaned Subcollection Write**: Creating `/conversations/non_existent_conv/messages/msg_1` where parent conversation does not exist.
6. **Cross-Tenant Subcollection Write**: User `user_B` creating a message inside `user_A`'s `/conversations/conv_A/messages/msg_1`.
7. **Timestamp Forgery on Create**: Client passing a past or future timestamp instead of `request.time` for `createdAt`.
8. **Immortal Field Mutation on Update**: Updating `createdAt` or `userId` on an existing `/conversations/conv_1` document.
9. **Value Poisoning on Update**: Updating allowed key `title` on `/conversations/conv_1` with an integer `12345` or a 10,000-character string.
10. **PII Blanket Read Leak**: Authenticated user `user_B` attempting `get` on `/users/user_A/private/info`.
11. **Unfiltered List Scraping**: Authenticated user `user_B` attempting to `list` `/conversations` without filtering by `userId == request.auth.uid`.
12. **Invalid Enum State Shortcutting**: Creating or updating a `ChatMessage` with `role: "system_admin"` or `feedback: "hacked"`.

## 3. Red Team Audit & Conflict Report
- **Identity Spoofing**: Blocked on all collections via `data.userId == request.auth.uid` and `data.uid == request.auth.uid`.
- **State Shortcutting**: Blocked via strict enum allowlists (`['user', 'assistant']`, `['none', 'up', 'down']`, `['auto', 'english', 'hindi', 'hinglish']`).
- **Resource Poisoning**: Blocked via `isValidId()` on all document IDs and `.size() <= MAX` on every string field.
- **Value Poisoning on Update**: Blocked because every `allow update` begins with `isValid[Entity](incoming())` before checking `affectedKeys().hasOnly(...)`.
