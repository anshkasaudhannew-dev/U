import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Static & Structural Verification Test Suite for firestore.rules and Dirty Dozen Invariants
 */
test('firestore.rules enforces all 8 pillars and blocks Dirty Dozen attack vectors', () => {
  const rules = fs.readFileSync('./firestore.rules', 'utf8');

  // 1. Rules version 2 & Default-Deny Catch-All
  assert.equal(rules.includes("rules_version = '2';"), true);
  assert.equal(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), true);

  // 2. Verified User check (Dirty Dozen #1: Unverified Email Write Spoof)
  assert.equal(rules.includes('request.auth.token.email_verified == true'), true);

  // 3. Strict Key Allowlisting (Dirty Dozen #2: Shadow Field Injection)
  assert.equal(
    rules.includes("data.keys().hasOnly(['id', 'userId', 'title', 'lastMessagePreview', 'messageCount', 'createdAt', 'updatedAt'])"),
    true
  );
  assert.equal(
    rules.includes("data.keys().hasOnly(['id', 'conversationId', 'userId', 'role', 'content', 'feedback', 'attachmentName', 'createdAt', 'updatedAt'])"),
    true
  );

  // 4. Identity Integrity & Path Hardening (Dirty Dozen #3 & #4)
  assert.equal(rules.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), true);
  assert.equal(rules.includes('data.userId == request.auth.uid'), true);

  // 5. Relational Master Gate on Subcollection (Dirty Dozen #5 & #6)
  assert.equal(
    rules.includes('exists(/databases/$(database)/documents/conversations/$(conversationId))'),
    true
  );
  assert.equal(
    rules.includes('get(/databases/$(database)/documents/conversations/$(conversationId)).data.userId == request.auth.uid'),
    true
  );

  // 6. Temporal Integrity & Immutability (Dirty Dozen #7 & #8)
  assert.equal(rules.includes('incoming().createdAt == request.time'), true);
  assert.equal(rules.includes('incoming().updatedAt == request.time'), true);
  assert.equal(rules.includes('incoming().createdAt == existing().createdAt'), true);

  // 7. Update Validation Blueprint + affectedKeys().hasOnly() (Dirty Dozen #9)
  assert.equal(rules.includes('isValidConversation(incoming(), conversationId)'), true);
  assert.equal(rules.includes('isValidChatMessage(incoming(), conversationId, messageId)'), true);
  assert.equal(rules.includes("affectedKeys().hasOnly(['feedback', 'updatedAt'])"), true);

  // 8. Split Collection PII Isolation & Query Enforcer (Dirty Dozen #10, #11, #12)
  assert.equal(rules.includes('match /users/{userId}/private/{docId}'), true);
  assert.equal(rules.includes('allow list: if isSignedIn() && existing().userId == request.auth.uid;'), true);
});
