import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATOR_IDENTITY_RESPONSE,
  CREATOR_FOLLOWUP_RESPONSE,
  CREATOR_HINGLISH_RESPONSE,
  CREATOR_HINDI_RESPONSE,
  CREATOR_CONFIRMATION_RESPONSE,
  CORE_SYSTEM_PROMPT,
  isCreatorIdentityQuery,
  getCreatorIdentityAnswer,
  classifyUserIntent,
  generateFollowUpSuggestions,
  detectLanguagePreference,
  sanitizeFirestoreId,
  isValidFirestoreId,
  sanitizeConversationFields,
  sanitizeChatMessageFields,
  buildSystemInstruction,
} from './rocketieeLogic.ts';
import { buildGeminiContents } from '../../server.ts';

test('creator identity detection handles English, auxiliary verbs, follow-ups, Hindi, and Hinglish variations', () => {
  const positiveQueries = [
    'Who created you?',
    'Who made you?',
    'Who had made you?',
    'Who has made you?',
    'I am just asking who had made you',
    'I am just asking who made you.',
    'Who developed you?',
    'Who built Rocketiee AI?',
    'Who is your creator?',
    'Who is the founder of Rocketiee?',
    'Who were you made by?',
    'By whom were you created?',
    'Did Devansh create you?',
    'Is Devansh your creator?',
    'Tumhe kisne banaya?',
    'Aapko kisne banaya hai?',
    'Kisne banaya tumhe?',
    'Rocketiee ko kisne develop kiya?',
    'Tumhara creator kaun hai?',
    'तुम्हें किसने बनाया?',
    'रॉकेटी को किसने बनाया है?',
  ];

  for (const query of positiveQueries) {
    assert.equal(
      isCreatorIdentityQuery(query),
      true,
      `Expected creator query to be detected: "${query}"`
    );
    assert.equal(classifyUserIntent(query), 'creator');
  }

  const negativeQueries = [
    'Who created the telephone?',
    'Who made the first computer?',
    'Explain how gravity works',
    'Write a Python program for Fibonacci numbers',
  ];

  for (const query of negativeQueries) {
    assert.equal(
      isCreatorIdentityQuery(query),
      false,
      `Expected general query NOT to be flagged as creator query: "${query}"`
    );
  }
});

test('getCreatorIdentityAnswer returns exact expected answers for English, follow-ups, Hinglish, and Hindi', () => {
  assert.equal(getCreatorIdentityAnswer('Who had made you?'), CREATOR_IDENTITY_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('Who created you?'), CREATOR_IDENTITY_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('Who developed you?'), CREATOR_IDENTITY_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('I am just asking who made you.'), CREATOR_FOLLOWUP_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('I am just asking who had made you'), CREATOR_FOLLOWUP_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('Tumhe kisne banaya?'), CREATOR_HINGLISH_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('तुम्हें किसने बनाया?'), CREATOR_HINDI_RESPONSE);
  assert.equal(getCreatorIdentityAnswer('Did Devansh create you?'), CREATOR_CONFIRMATION_RESPONSE);

  const modelDistinction = getCreatorIdentityAnswer(
    'Who created you and did Devansh train the underlying language model?'
  );
  assert.ok(modelDistinction.startsWith(CREATOR_IDENTITY_RESPONSE));
  assert.ok(modelDistinction.includes('language model APIs'));
});

test('system instruction matches the required prompt and contains no generic filler templates', () => {
  const sys = buildSystemInstruction('auto', 'balanced');
  assert.equal(sys, CORE_SYSTEM_PROMPT);
  assert.ok(
    sys.includes(
      'You are Rocketiee AI, a smart, friendly, witty, and helpful AI assistant created by Devansh.'
    )
  );
  assert.ok(
    sys.includes(
      "Understand the user's actual intent and answer the specific question directly."
    )
  );
  assert.ok(sys.includes("'I was created by Devansh. 🚀'"));
  assert.ok(!sys.includes('Here is a direct answer regarding'));
  assert.ok(!sys.includes('core functional definition'));
});

test('buildGeminiContents preserves conversation history without duplicating the current user message', () => {
  const history = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hey there! How can I help you today?' },
    { role: 'user', content: 'What is gravity?' },
  ];

  // Even if the current user message is accidentally at the end of history, it must not be duplicated
  const contents = buildGeminiContents(history, 'What is gravity?');
  assert.equal(contents.length, 3);
  assert.equal(contents[0].role, 'user');
  assert.deepEqual(contents[0].parts, [{ text: 'Hello' }]);
  assert.equal(contents[1].role, 'model');
  assert.deepEqual(contents[1].parts, [{ text: 'Hey there! How can I help you today?' }]);
  assert.equal(contents[2].role, 'user');
  assert.deepEqual(contents[2].parts, [{ text: 'What is gravity?' }]);
});

test('generateFollowUpSuggestions suppresses follow-ups on greetings, creator queries, jokes, and simple replies', () => {
  assert.deepEqual(generateFollowUpSuggestions('Hello'), []);
  assert.deepEqual(generateFollowUpSuggestions('Who had made you?'), []);
  assert.deepEqual(generateFollowUpSuggestions('How are you?'), []);
  assert.deepEqual(generateFollowUpSuggestions('Tell me a joke.'), []);
  assert.deepEqual(generateFollowUpSuggestions('What is gravity?'), []);

  const detailedReply =
    'Gravity is the fundamental force of attraction between all masses in the universe. Newton formulated the law of universal gravitation, and Einstein later showed that gravity arises from the curvature of spacetime caused by mass and energy, governing planetary orbits, ocean tides, and falling objects on Earth.';
  const detailedSuggestions = generateFollowUpSuggestions(
    'Explain gravity in detail.',
    'auto',
    detailedReply
  );
  assert.ok(detailedSuggestions.length >= 2);
});

test('detectLanguagePreference accurately detects English, Hindi Devanagari, and Hinglish', () => {
  assert.equal(detectLanguagePreference('Explain how solar panels work'), 'english');
  assert.equal(detectLanguagePreference('सौर ऊर्जा कैसे काम करती है?'), 'hindi');
  assert.equal(detectLanguagePreference('Mujhe solar energy ke baare mein samjhao'), 'hinglish');
  assert.equal(detectLanguagePreference('Tumhe kisne banaya?'), 'hinglish');
  assert.equal(detectLanguagePreference('Hello friend', 'hindi'), 'hindi');
});

test('Firestore ID validation and sanitization enforce blueprint regex and length limits', () => {
  const cleanId = sanitizeFirestoreId('conv_12345-abc');
  assert.equal(cleanId, 'conv_12345-abc');
  assert.equal(isValidFirestoreId(cleanId), true);

  const dirtyId = sanitizeFirestoreId('bad/id with spaces & symbols!@#');
  assert.equal(isValidFirestoreId(dirtyId), true);
  assert.equal(dirtyId.includes('/'), false);
  assert.equal(dirtyId.includes(' '), false);
});

test('sanitizeConversationFields and sanitizeChatMessageFields enforce blueprint schema boundaries', () => {
  const conv = sanitizeConversationFields({
    id: 'conv_test_1',
    userId: 'user_abc_123',
    title: 'A'.repeat(250),
    lastMessagePreview: 'B'.repeat(500),
    messageCount: 42,
  });

  assert.equal(conv.title.length, 160);
  assert.equal(conv.lastMessagePreview.length, 300);
  assert.equal(conv.messageCount, 42);

  const msg = sanitizeChatMessageFields({
    id: 'msg_test_1',
    conversationId: 'conv_test_1',
    userId: 'user_abc_123',
    role: 'assistant',
    content: 'Hello from Rocketiee AI!',
    feedback: 'up',
  });

  assert.equal(msg.role, 'assistant');
  assert.equal(msg.feedback, 'up');
  assert.equal(msg.attachmentName, '');
});
