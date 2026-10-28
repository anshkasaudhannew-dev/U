export type LanguageMode = 'auto' | 'english' | 'hindi' | 'hinglish';
export type ResponseStyle = 'balanced' | 'concise' | 'detailed';
export type FriendlyVibe = 'dost' | 'mentor' | 'witty';
export type FeedbackType = 'none' | 'up' | 'down';
export type UserIntentType =
  | 'creator'
  | 'greeting'
  | 'casual'
  | 'joke'
  | 'simple_question'
  | 'detailed_explanation';

export const CREATOR_IDENTITY_RESPONSE = 'I was created by Devansh. 🚀';

export const CREATOR_FOLLOWUP_RESPONSE = 'Devansh created me! 🚀';

export const CREATOR_HINGLISH_RESPONSE = 'Mujhe Devansh ne banaya hai! 🚀';

export const CREATOR_HINDI_RESPONSE = 'मुझे देवांश (Devansh) ने बनाया है! 🚀';

export const CREATOR_CONFIRMATION_RESPONSE =
  'Yes! Devansh is the creator and founder of Rocketiee AI. 🚀';

export const CREATOR_MODEL_DISTINCTION_NOTE =
  ' Devansh is the creator and founder of the Rocketiee AI application, while the app connects to language model APIs via a secure backend.';

export interface SuggestionCardItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  prompt: string;
  iconName: 'lightbulb' | 'calculator' | 'pen' | 'languages' | 'atom' | 'code';
}

export const SUGGESTION_CARDS: SuggestionCardItem[] = [
  {
    id: 'explain-something',
    title: 'Explain Something',
    subtitle: 'Complex concepts made crystal clear',
    category: 'Concept Clarity',
    prompt: 'Explain gravity in detail with clear examples.',
    iconName: 'lightbulb',
  },
  {
    id: 'solve-a-problem',
    title: 'Solve a Problem',
    subtitle: 'Math, logic & step-by-step reasoning',
    category: 'Problem Solving',
    prompt: 'Help me solve a classic speed, distance, and time reasoning problem step by step.',
    iconName: 'calculator',
  },
  {
    id: 'write-something-amazing',
    title: 'Write Something Amazing',
    subtitle: 'Stories, essays, emails & pitches',
    category: 'Creative Studio',
    prompt: 'Write an inspiring short story set in futuristic India where a student builds a solar invention.',
    iconName: 'pen',
  },
  {
    id: 'learn-english',
    title: 'Learn English',
    subtitle: 'Spoken English with Hindi meanings',
    category: 'Bilingual Learning',
    prompt: 'Teach me 5 useful daily English phrases with simple Hindi meanings and natural examples.',
    iconName: 'languages',
  },
  {
    id: 'explore-science',
    title: 'Explore Science',
    subtitle: 'Space, physics & technology wonders',
    category: 'Science & Tech',
    prompt: 'Photosynthesis ko detail mein samjhao.',
    iconName: 'atom',
  },
  {
    id: 'build-with-code',
    title: 'Build with Code',
    subtitle: 'Clean code, debugging & architecture',
    category: 'Programming',
    prompt: 'Write a clean Python program to track daily study streaks and explain how it works.',
    iconName: 'code',
  },
];

const CREATOR_PATTERNS: RegExp[] = [
  // Direct & auxiliary-verb English questions: "Who made you?", "Who had made you?", "I am just asking who made you", "Who has created you?"
  /\bwho\s+(?:(?:has|had|have|did|was|is)\s+)?(?:actual+y\s+|real+y\s+)?(?:created|made|built|developed|invented|founded|designed|programmed|coded|authored|owns|make|create|build|develop)\s+(?:you|rocketiee(?:\s*ai)?|this\s+(?:app|ai|assistant|bot))\b/i,
  // Passive / preposition phrasing: "Who were you made by?", "By whom were you created?"
  /\bwho\s+(?:were|are|was)\s+(?:you|rocketiee(?:\s*ai)?)\s+(?:created|made|built|developed|designed|founded)\s+by\b/i,
  /\bby\s+whom\s+(?:were|are|was)\s+(?:you|rocketiee(?:\s*ai)?)\s+(?:created|made|built|developed|designed)\b/i,
  // Noun phrasing: "Who is your creator?", "Tell me who your founder is", "Who is behind Rocketiee?"
  /\bwho\s+(?:is|was)\s+(?:your|the|rocketiee(?:'?s)?)\s+(?:creator|founder|maker|developer|author|owner|builder|inventor|architect)\b/i,
  /\b(?:your|rocketiee(?:'?s)?)\s+(?:creator|founder|maker|developer|builder)\s+(?:is\s+who|name)\b/i,
  /\bcreator\s+of\s+(?:you|rocketiee(?:\s*ai)?)\b/i,
  // Confirmation questions about Devansh: "Did Devansh create you?", "Is Devansh the creator of Rocketiee?"
  /\b(?:did|has|was)\s+devansh\s+(?:create|created|make|made|build|built|develop|developed|found|founded)\s+(?:you|rocketiee(?:\s*ai)?|this\s+app)\b/i,
  /\bis\s+devansh\s+(?:your|the|rocketiee(?:'?s)?)\s+(?:creator|founder|maker|developer|owner|builder)\b/i,
  // Hinglish variations: "Tumhe kisne banaya?", "Aapko kisne banaya hai?", "Kisne banaya tumhe?"
  /\b(?:tumhe|tumko|tujhe|tujhko|aapko|apko|isko|is\s+app\s+ko|rocketiee(?:\s*ai)?\s*ko)\s+(?:kisne|kis\s+ne|kon|kaun)\s+(?:banaya|bnaya|develop\s+kiya|create\s+kiya|bnaया)\b/i,
  /\b(?:kisne|kis\s+ne)\s+(?:banaya|bnaya|create\s+kiya|develop\s+kiya)\s+(?:hai\s+)?(?:tumhe|tumko|tujhe|aapko|apko|rocketiee(?:\s*ai)?(?:\s*ko)?)\b/i,
  /\b(?:tumhara|tumhare|tera|aapka|apka|rocketiee(?:\s*ai)?\s+ka)\s+(?:creator|founder|malik|maker|developer|banane\s+wala)\s+(?:kaun|kon)\s+hai\b/i,
  // Hindi (Devanagari) variations
  /(?:तुम्हें|तुमको|तुझे|आपको|रॉकेटी(?:\s*एआई)?\s*को|इस\s+ऐप\s+को)\s*(?:किसने|किस\s+ने|कौन)\s*(?:बनाया|विकसित\s+किया|क्रिएट\s+किया)/i,
  /(?:किसने|किस\s+ने)\s*(?:बनाया|विकसित\s+किया)\s*(?:है\s*)?(?:तुम्हें|तुमको|आपको|रॉकेटी)/i,
  /(?:तुम्हारा|आपका|रॉकेटी\s+का)\s*(?:निर्माता|क्रिएटर|फाउंडर|बनाने\s+वाला)\s*(?:कौन)\s*है/i,
];

const MODEL_DISTINCTION_PATTERNS: RegExp[] = [
  /\b(underlying|base|foundation)\s+(ai\s+|language\s+)?model\b/i,
  /\bdid\s+devansh\s+(create|train|build|make)\s+the\s+(underlying\s+)?(llm|ai\s+model|language\s+model|neural\s+network)\b/i,
  /\bwhich\s+(llm|api|language\s+model)\s+(do\s+you\s+use|powers\s+you)\b/i,
];

export function isCreatorIdentityQuery(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) return false;
  return CREATOR_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isUnderlyingModelQuery(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) return false;
  return MODEL_DISTINCTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const HINGLISH_TOKENS = new Set([
  'mujhe',
  'samjhao',
  'batao',
  'kya',
  'kaise',
  'kyun',
  'tumhe',
  'tumko',
  'tujhe',
  'aapko',
  'apko',
  'kisne',
  'banaya',
  'bnaya',
  'tumhara',
  'aapka',
  'kaun',
  'kon',
  'accha',
  'bahut',
  'padhai',
  'shiksha',
  'vigyan',
  'ganit',
  'seekhna',
  'matlab',
  'shabd',
  'kahaani',
  'bhasha',
  'mein',
  'hai',
  'hain',
  'aur',
  'ke',
  'ki',
  'ka',
  'ko',
  'se',
  'par',
  'nahi',
  'haan',
  'yaar',
  'dost',
  'namaste',
  'sunao',
  'chutkula',
]);

export function detectLanguagePreference(
  input: string,
  preferredMode: LanguageMode = 'auto'
): 'english' | 'hindi' | 'hinglish' {
  if (preferredMode !== 'auto') {
    return preferredMode;
  }
  const trimmed = input.trim();
  if (!trimmed) return 'english';

  if (DEVANAGARI_REGEX.test(trimmed)) {
    return 'hindi';
  }

  const words = trimmed
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let hinglishMatches = 0;
  for (const w of words) {
    if (HINGLISH_TOKENS.has(w)) {
      hinglishMatches++;
    }
  }

  if (hinglishMatches >= 2 || (words.length <= 5 && hinglishMatches >= 1)) {
    return 'hinglish';
  }

  return 'english';
}

export function getCreatorIdentityAnswer(
  input: string,
  languageMode: LanguageMode = 'auto'
): string {
  const trimmed = input.trim();
  if (isUnderlyingModelQuery(trimmed)) {
    return `${CREATOR_IDENTITY_RESPONSE}${CREATOR_MODEL_DISTINCTION_NOTE}`;
  }

  const lang = detectLanguagePreference(trimmed, languageMode);
  if (lang === 'hindi') {
    return CREATOR_HINDI_RESPONSE;
  }
  if (
    lang === 'hinglish' ||
    /\b(tumhe|tumko|tujhe|aapko|apko|kisne|banaya|bnaya|tumhara|aapka)\b/i.test(trimmed)
  ) {
    return CREATOR_HINGLISH_RESPONSE;
  }

  if (
    /\b(did|has|is)\s+devansh\b/i.test(trimmed)
  ) {
    return CREATOR_CONFIRMATION_RESPONSE;
  }

  if (/\b(just\s+asking|asking\s+who|tell\s+me\s+who)\b/i.test(trimmed)) {
    return CREATOR_FOLLOWUP_RESPONSE;
  }

  return CREATOR_IDENTITY_RESPONSE;
}

/**
 * Classifies the user's conversational intent so UI presentation (compact bubble vs.
 * detailed view with follow-ups) matches the message type.
 */
export function classifyUserIntent(input: string): UserIntentType {
  const cleaned = input.trim();
  const lower = cleaned.toLowerCase().replace(/[!?.]+$/g, '').trim();

  if (!lower) return 'casual';

  if (isCreatorIdentityQuery(cleaned)) {
    return 'creator';
  }

  if (
    /^(hello|hi+|hey+|hola|yo|namaste|namaskar|pranam|ram\s*ram|radhe\s*radhe|assalamu\s*alaikum|sat\s*sri\s*akal|good\s*(morning|afternoon|evening)|gm)(\s+(rocketiee|ai|there|friend|dost|sir|bro|yaar))?$/i.test(
      lower
    ) ||
    /^(नमस्ते|नमस्कार|प्रणाम|हेलो|हाय)(\s+(रॉकेटी|दोस्त))?$/i.test(lower)
  ) {
    return 'greeting';
  }

  if (
    /^(how\s+are\s+you(\s+doing)?|how('?s|\s+is)\s+it\s+going|what'?s\s+up|wassup|sup|kaise\s+ho(\s+aap|\s+tum|\s+bhai|\s+dost)?|kya\s+haal\s+(hai|chaal\s+hai)|kya\s+chal\s+raha\s+hai|sab\s+badhiya|कैसे\s+हो|क्या\s+हाल\s+है)$/i.test(
      lower
    ) ||
    /^(thank\s*you(\s+so\s+much|\s+very\s+much)?|thanks(\s+a\s+lot|\s+bro|\s+dost)?|thx|ty|shukriya|dhanyawad|dhanyavaad|धन्यवाद|शुक्रिया|ok\s*thanks|cool\s*thanks)$/i.test(
      lower
    ) ||
    /^(bye+|goodbye|see\s+you(\s+later)?|good\s*night|gn|alvida|phir\s+milte\s+hain|ok|okay|got\s+it|awesome|nice|great|cool|acha|accha|theek\s+hai)$/i.test(
      lower
    )
  ) {
    return 'casual';
  }

  if (
    /\b(tell\s+(me\s+)?a\s+joke|make\s+me\s+laugh|funny\s+joke|another\s+joke|ek\s+joke(\s+sunao)?|joke\s+sunao|chutkula(\s+sunao)?|मज़ाक|चुटकुला|जोक\s+सुनाओ)\b/i.test(
      lower
    )
  ) {
    return 'joke';
  }

  if (
    /\b(in\s+detail|detailed|detail\s+mein|deep\s+dive|elaborate|step[\s-]*by[\s-]*step|thoroughly|comprehensive|write\s+a\s+(story|program|code|essay|article|script)|build|implement|compare\s+and\s+contrast|विस्तार\s+से|डिटेल\s+में)\b/i.test(
      lower
    ) ||
    cleaned.split(/\s+/).length >= 10
  ) {
    return 'detailed_explanation';
  }

  return 'simple_question';
}

/**
 * Only returns follow-up suggestions when the user asked for a detailed explanation.
 * Returns an empty array for greetings, casual chat, creator questions, jokes, and simple questions.
 */
export function generateFollowUpSuggestions(
  userMessage: string,
  languageMode: LanguageMode = 'auto',
  assistantMessage = ''
): string[] {
  const intent = classifyUserIntent(userMessage);
  if (intent !== 'detailed_explanation') {
    return [];
  }
  if (assistantMessage && assistantMessage.length < 280) {
    return [];
  }

  const lang = detectLanguagePreference(userMessage, languageMode);
  const lower = userMessage.toLowerCase();

  if (lang === 'hindi') {
    return [
      'इसका एक व्यावहारिक उदाहरण दो',
      'इसके मुख्य बिंदुओं का संक्षिप्त सारांश दो',
    ];
  }

  if (lang === 'hinglish') {
    return [
      'Iska ek real-life example batao',
      'Isko short points mein summarize karo',
    ];
  }

  if (lower.includes('code') || lower.includes('python') || lower.includes('program')) {
    return [
      'How can we add unit tests to this code?',
      'Show a real-world use case for this',
    ];
  }

  return [
    'Give me a real-world example of this',
    'Explain this in simple Hinglish',
  ];
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage
    .replace(/\s+/g, ' ')
    .replace(/[#*`_~]/g, '')
    .trim();
  if (!cleaned) return 'New Exploration';
  if (cleaned.length <= 56) return cleaned;
  return `${cleaned.slice(0, 53).trim()}...`;
}

export function sanitizeConversationFields(input: {
  id: string;
  userId: string;
  title: string;
  lastMessagePreview: string;
  messageCount: number;
}) {
  const id = sanitizeFirestoreId(input.id);
  const userId = sanitizeFirestoreId(input.userId);
  const title = (input.title || 'New Exploration').trim().slice(0, 160) || 'New Exploration';
  const lastMessagePreview = (input.lastMessagePreview || '').trim().slice(0, 300);
  const messageCount = Math.max(0, Math.min(10000, Math.floor(Number(input.messageCount) || 0)));

  return {
    id,
    userId,
    title,
    lastMessagePreview,
    messageCount,
  };
}

export function sanitizeChatMessageFields(input: {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: FeedbackType;
  attachmentName?: string;
}) {
  const id = sanitizeFirestoreId(input.id);
  const conversationId = sanitizeFirestoreId(input.conversationId);
  const userId = sanitizeFirestoreId(input.userId);
  const role: 'user' | 'assistant' = input.role === 'assistant' ? 'assistant' : 'user';
  const content = (input.content || '').trim().slice(0, 32000) || '...';
  const feedback: FeedbackType =
    input.feedback === 'up' || input.feedback === 'down' ? input.feedback : 'none';
  const attachmentName = (input.attachmentName || '').trim().slice(0, 200);

  return {
    id,
    conversationId,
    userId,
    role,
    content,
    feedback,
    attachmentName,
  };
}

export const CORE_SYSTEM_PROMPT = `You are Rocketiee AI, a smart, friendly, witty, and helpful AI assistant created by Devansh.

Understand the user's actual intent and answer the specific question directly.

Do not repeat or paraphrase the user's question as an introduction. Do not use generic filler phrases. Do not turn simple questions into explanations of unrelated concepts.

If someone asks 'Who created you?', 'Who made you?', 'Who developed you?', or similar questions, answer clearly:

'I was created by Devansh. 🚀'

If someone asks whether Devansh created Rocketiee, explain that Devansh is Rocketiee's creator.

If a question requires information that is not available, be honest rather than inventing an answer.

For greetings, respond naturally and briefly. For simple factual questions, answer directly. For complex questions, provide an appropriately detailed explanation.

Support Hindi, English, and Hinglish. Match the user's language.

Be conversational, natural, accurate, and helpful. Do not automatically add headings, generic conclusions, tips, quizzes, or follow-up questions.

Never claim that an action or feature works unless it has actually been implemented.`;

export function buildSystemInstruction(
  languageMode: LanguageMode = 'auto',
  responseStyle: ResponseStyle = 'balanced'
): string {
  const extras: string[] = [];

  if (languageMode === 'hindi') {
    extras.push('Language preference: Respond in Hindi (हिन्दी) unless the user asks otherwise.');
  } else if (languageMode === 'hinglish') {
    extras.push(
      'Language preference: Respond in natural Hinglish (Hindi + English in Roman script) unless the user asks otherwise.'
    );
  } else if (languageMode === 'english') {
    extras.push('Language preference: Respond in English unless the user asks otherwise.');
  }

  if (responseStyle === 'concise') {
    extras.push('Response style: Keep answers extra concise and to the point.');
  } else if (responseStyle === 'detailed') {
    extras.push(
      'Response style: For substantive questions, provide thorough detail while keeping greetings and simple questions concise.'
    );
  }

  if (extras.length === 0) {
    return CORE_SYSTEM_PROMPT;
  }

  return `${CORE_SYSTEM_PROMPT}\n\n${extras.join('\n')}`;
}
