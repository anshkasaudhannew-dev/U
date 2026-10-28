/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Menu,
  X,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Volume2,
  Square,
  ThumbsUp,
  ThumbsDown,
  Mic,
  MicOff,
  Paperclip,
  Globe,
  Trash2,
  Settings,
  User as UserIcon,
  Lightbulb,
  Calculator,
  PenTool,
  Languages,
  Atom,
  Code2,
  Search,
  FileText,
  Image as ImageIcon,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import {
  SUGGESTION_CARDS,
  SuggestionCardItem,
  LanguageMode,
  ResponseStyle,
  FeedbackType,
  generateConversationTitle,
  generateFollowUpSuggestions,
  sanitizeFirestoreId,
  sanitizeConversationFields,
  sanitizeChatMessageFields,
} from './utils/rocketieeLogic';
import { RocketieeLogo } from './components/RocketieeLogo';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MarkdownMessage } from './components/MarkdownMessage';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  feedback: FeedbackType;
  attachmentName: string;
  attachmentPreviewUrl?: string;
  sources?: Array<{ uri: string; title?: string }>;
  createdAtMs: number;
}

export interface ConversationItem {
  id: string;
  userId: string;
  title: string;
  lastMessagePreview: string;
  messageCount: number;
  updatedAtMs: number;
}

interface AttachmentPayload {
  name: string;
  mimeType: string;
  base64Data?: string;
  textContent?: string;
  previewUrl?: string;
}

const LOCAL_STORAGE_CONVS_KEY = 'rocketiee_guest_conversations_v1';
const LOCAL_STORAGE_MSGS_KEY = 'rocketiee_guest_messages_v1';
const LOCAL_STORAGE_WELCOMED_KEY = 'rocketiee_welcomed_v1';
const LOCAL_STORAGE_THEME_KEY = 'rocketiee_theme_v1';

export default function App() {
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
      const saved = window.localStorage.getItem(LOCAL_STORAGE_WELCOMED_KEY);
      return saved !== 'true';
    }
    return true;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(LOCAL_STORAGE_THEME_KEY) === 'dark';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // User Preferences
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('balanced');
  const [voiceName, setVoiceName] = useState<string>('Kore');
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

  // Conversations & Messages State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessageItem[]>>({});
  const [historySearch, setHistorySearch] = useState<string>('');

  // Composer & Generation State
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentPayload | null>(null);

  // UI Drawers & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // Copy, Speech Recognition & TTS States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<unknown>(null);
  const sendingLockRef = useRef<boolean>(false);
  const requestSeqRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem(LOCAL_STORAGE_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem(LOCAL_STORAGE_THEME_KEY, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!currentUser || !currentUser.emailVerified) {
      try {
        const rawConvs = window.localStorage.getItem(LOCAL_STORAGE_CONVS_KEY);
        const rawMsgs = window.localStorage.getItem(LOCAL_STORAGE_MSGS_KEY);
        if (rawConvs) {
          setConversations(JSON.parse(rawConvs));
        } else {
          setConversations([]);
        }
        if (rawMsgs) {
          setMessagesByConv(JSON.parse(rawMsgs));
        } else {
          setMessagesByConv({});
        }
      } catch {
        setConversations([]);
        setMessagesByConv({});
      }
      return;
    }

    const uid = currentUser.uid;
    const convQuery = query(collection(db, 'conversations'), where('userId', '==', uid));

    const unsubConvs = onSnapshot(
      convQuery,
      (snapshot) => {
        const loaded: ConversationItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: data.id || docSnap.id,
            userId: data.userId,
            title: data.title || 'Exploration',
            lastMessagePreview: data.lastMessagePreview || '',
            messageCount: Number(data.messageCount) || 0,
            updatedAtMs: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
          });
        });
        loaded.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setConversations(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'conversations');
      }
    );

    return () => unsubConvs();
  }, [authReady, currentUser]);

  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified || !activeConversationId) {
      return;
    }

    const msgsPath = `conversations/${activeConversationId}/messages`;
    const msgsQuery = query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      where('userId', '==', currentUser.uid)
    );

    const unsubMsgs = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const list: ChatMessageItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: data.id || docSnap.id,
            conversationId: data.conversationId || activeConversationId,
            userId: data.userId,
            role: data.role === 'assistant' ? 'assistant' : 'user',
            content: data.content || '',
            feedback:
              data.feedback === 'up' || data.feedback === 'down' ? data.feedback : 'none',
            attachmentName: data.attachmentName || '',
            createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          });
        });
        list.sort((a, b) => a.createdAtMs - b.createdAtMs);
        setMessagesByConv((prev) => ({
          ...prev,
          [activeConversationId]: list,
        }));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, msgsPath);
      }
    );

    return () => unsubMsgs();
  }, [authReady, currentUser, activeConversationId]);

  const saveGuestState = (
    nextConvs: ConversationItem[],
    nextMsgs: Record<string, ChatMessageItem[]>
  ) => {
    if (!currentUser || !currentUser.emailVerified) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(nextConvs));
        window.localStorage.setItem(LOCAL_STORAGE_MSGS_KEY, JSON.stringify(nextMsgs));
      } catch {
        // Ignore storage quota errors
      }
    }
  };

  const activeMessages: ChatMessageItem[] = activeConversationId
    ? messagesByConv[activeConversationId] || []
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isGenerating]);

  const handleCompleteWelcome = () => {
    window.localStorage.setItem(LOCAL_STORAGE_WELCOMED_KEY, 'true');
    setShowWelcome(false);
  };

  const handleStartNewChat = () => {
    requestSeqRef.current += 1;
    sendingLockRef.current = false;
    setIsGenerating(false);
    setActiveConversationId(null);
    setInputPrompt('');
    setAttachment(null);
    setErrorBanner(null);
    setSidebarOpen(false);
  };

  const handleSaveUserProfileToFirestore = async (newDisplayName: string) => {
    if (!currentUser || !currentUser.emailVerified) return;
    const uid = sanitizeFirestoreId(currentUser.uid);
    const pubPath = `users/${uid}/public/profile`;
    try {
      await setDoc(doc(db, 'users', uid, 'public', 'profile'), {
        uid,
        displayName: newDisplayName.trim().slice(0, 80) || 'Explorer',
        preferredLanguage: languageMode,
        theme: darkMode ? 'dark' : 'light',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (currentUser.email) {
        await setDoc(doc(db, 'users', uid, 'private', 'info'), {
          uid,
          email: currentUser.email.slice(0, 254),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pubPath);
    }
  };

  const sendPromptToRocketiee = async (
    promptText: string,
    targetConvId?: string | null,
    overrideAttachment?: AttachmentPayload | null,
    overrideBaseMessages?: ChatMessageItem[]
  ) => {
    const cleanPrompt = promptText.trim();
    const activeAttachment = overrideAttachment !== undefined ? overrideAttachment : attachment;

    if ((!cleanPrompt && !activeAttachment) || isGenerating || sendingLockRef.current) return;

    sendingLockRef.current = true;
    const currentReqSeq = ++requestSeqRef.current;

    setErrorBanner(null);
    setIsGenerating(true);

    const isCloudUser = Boolean(currentUser && currentUser.emailVerified);
    const ownerUid = isCloudUser && currentUser ? sanitizeFirestoreId(currentUser.uid) : 'guest_user';

    let convId = targetConvId !== undefined ? targetConvId : activeConversationId;
    const isNewConv = !convId;
    if (!convId) {
      convId = sanitizeFirestoreId(`conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      setActiveConversationId(convId);
    }

    const userMsgId = sanitizeFirestoreId(
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    );
    const nowMs = Date.now();

    const userMessage: ChatMessageItem = {
      id: userMsgId,
      conversationId: convId,
      userId: ownerUid,
      role: 'user',
      content: cleanPrompt || `Attached: ${activeAttachment?.name || 'file'}`,
      feedback: 'none',
      attachmentName: activeAttachment?.name || '',
      attachmentPreviewUrl: activeAttachment?.previewUrl,
      createdAtMs: nowMs,
    };

    const existingMsgs =
      overrideBaseMessages !== undefined ? overrideBaseMessages : messagesByConv[convId] || [];
    const updatedMsgsWithUser = [...existingMsgs, userMessage];

    const convTitle = isNewConv
      ? generateConversationTitle(cleanPrompt || activeAttachment?.name || 'New Exploration')
      : conversations.find((c) => c.id === convId)?.title || 'Exploration';

    const updatedConvItem: ConversationItem = {
      id: convId,
      userId: ownerUid,
      title: convTitle,
      lastMessagePreview: userMessage.content.slice(0, 300),
      messageCount: updatedMsgsWithUser.length,
      updatedAtMs: nowMs,
    };

    const nextConversations = isNewConv
      ? [updatedConvItem, ...conversations]
      : conversations.map((c) => (c.id === convId ? updatedConvItem : c));

    const nextMessagesMap = {
      ...messagesByConv,
      [convId]: updatedMsgsWithUser,
    };

    setConversations(nextConversations);
    setMessagesByConv(nextMessagesMap);
    saveGuestState(nextConversations, nextMessagesMap);

    setInputPrompt('');
    setAttachment(null);

    if (isCloudUser && currentUser) {
      try {
        const sanitizedConv = sanitizeConversationFields({
          id: convId,
          userId: ownerUid,
          title: convTitle,
          lastMessagePreview: userMessage.content,
          messageCount: updatedMsgsWithUser.length,
        });

        if (isNewConv) {
          await setDoc(doc(db, 'conversations', convId), {
            ...sanitizedConv,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'conversations', convId), {
            title: sanitizedConv.title,
            lastMessagePreview: sanitizedConv.lastMessagePreview,
            messageCount: sanitizedConv.messageCount,
            updatedAt: serverTimestamp(),
          });
        }

        const sanitizedUserMsg = sanitizeChatMessageFields({
          id: userMsgId,
          conversationId: convId,
          userId: ownerUid,
          role: 'user',
          content: userMessage.content,
          feedback: 'none',
          attachmentName: userMessage.attachmentName,
        });

        await setDoc(doc(db, 'conversations', convId, 'messages', userMsgId), {
          ...sanitizedUserMsg,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: existingMsgs.map((m) => ({ role: m.role, content: m.content })),
          languageMode,
          responseStyle,
          useWebSearch,
          attachment: activeAttachment
            ? {
                name: activeAttachment.name,
                mimeType: activeAttachment.mimeType,
                base64Data: activeAttachment.base64Data,
                textContent: activeAttachment.textContent,
              }
            : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI response.');
      }

      if (currentReqSeq !== requestSeqRef.current) {
        return;
      }

      const aiMsgId = sanitizeFirestoreId(
        `msg_${Date.now() + 1}_${Math.random().toString(36).slice(2, 6)}`
      );
      const aiMessage: ChatMessageItem = {
        id: aiMsgId,
        conversationId: convId,
        userId: ownerUid,
        role: 'assistant',
        content: String(data.text || '').trim(),
        feedback: 'none',
        attachmentName: '',
        sources: Array.isArray(data.sources) ? data.sources : [],
        createdAtMs: Date.now(),
      };

      const finalMsgsForConv = [...updatedMsgsWithUser, aiMessage];
      const finalConvItem: ConversationItem = {
        ...updatedConvItem,
        lastMessagePreview: aiMessage.content.replace(/[#*`_~]/g, '').slice(0, 300),
        messageCount: finalMsgsForConv.length,
        updatedAtMs: Date.now(),
      };

      setMessagesByConv((prev) => {
        const updated = { ...prev, [convId!]: finalMsgsForConv };
        const updatedConvs = nextConversations.map((c) => (c.id === convId ? finalConvItem : c));
        saveGuestState(updatedConvs, updated);
        return updated;
      });
      setConversations((prev) => prev.map((c) => (c.id === convId ? finalConvItem : c)));

      if (isCloudUser && currentUser) {
        try {
          const sanitizedAiMsg = sanitizeChatMessageFields({
            id: aiMsgId,
            conversationId: convId,
            userId: ownerUid,
            role: 'assistant',
            content: aiMessage.content,
            feedback: 'none',
            attachmentName: '',
          });

          await setDoc(doc(db, 'conversations', convId, 'messages', aiMsgId), {
            ...sanitizedAiMsg,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await updateDoc(doc(db, 'conversations', convId), {
            title: finalConvItem.title.slice(0, 160),
            lastMessagePreview: finalConvItem.lastMessagePreview.slice(0, 300),
            messageCount: finalMsgsForConv.length,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `conversations/${convId}/messages/${aiMsgId}`
          );
        }
      }
    } catch (err: unknown) {
      if (currentReqSeq === requestSeqRef.current) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Network connection interrupted. Please check your internet and try again.'
        );
      }
    } finally {
      if (currentReqSeq === requestSeqRef.current) {
        sendingLockRef.current = false;
        setIsGenerating(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPromptToRocketiee(inputPrompt);
  };

  const handleSuggestionCardClick = (card: SuggestionCardItem) => {
    sendPromptToRocketiee(card.prompt);
  };

  const handleRegenerateResponse = async (assistantMsgIndex: number) => {
    if (!activeConversationId || isGenerating || sendingLockRef.current) return;
    const currentMsgs = messagesByConv[activeConversationId] || [];
    let userPromptToRetry = '';
    let userMsgIndex = -1;
    for (let i = assistantMsgIndex - 1; i >= 0; i--) {
      if (currentMsgs[i].role === 'user') {
        userPromptToRetry = currentMsgs[i].content;
        userMsgIndex = i;
        break;
      }
    }
    if (!userPromptToRetry || userMsgIndex < 0) return;

    const baseMessagesBeforeRetry = currentMsgs.slice(0, userMsgIndex);
    setMessagesByConv((prev) => ({
      ...prev,
      [activeConversationId]: baseMessagesBeforeRetry,
    }));
    await sendPromptToRocketiee(
      userPromptToRetry,
      activeConversationId,
      null,
      baseMessagesBeforeRetry
    );
  };

  const handleCopyMessage = (msg: ChatMessageItem) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMessageId(msg.id);
    showToast('Copied to clipboard');
    window.setTimeout(() => {
      setCopiedMessageId((prev) => (prev === msg.id ? null : prev));
    }, 2000);
  };

  const handleShareMessage = async (msg: ChatMessageItem) => {
    const shareText = `${msg.content}\n\n— Rocketiee AI`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rocketiee AI',
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareText);
    showToast('Copied shareable response');
  };

  const handleFeedback = async (msg: ChatMessageItem, nextFeedback: 'up' | 'down') => {
    const toggled: FeedbackType = msg.feedback === nextFeedback ? 'none' : nextFeedback;
    const convId = msg.conversationId;

    setMessagesByConv((prev) => {
      const list = (prev[convId] || []).map((item) =>
        item.id === msg.id ? { ...item, feedback: toggled } : item
      );
      const updated = { ...prev, [convId]: list };
      saveGuestState(conversations, updated);
      return updated;
    });

    if (toggled !== 'none') {
      showToast('Thanks for your feedback!');
    }

    if (currentUser && currentUser.emailVerified) {
      try {
        await updateDoc(doc(db, 'conversations', convId, 'messages', msg.id), {
          feedback: toggled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `conversations/${convId}/messages/${msg.id}`
        );
      }
    }
  };

  const handleSpeakMessage = async (msg: ChatMessageItem) => {
    if (speakingMessageId === msg.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingMessageId(msg.id);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content, voiceName }),
      });
      const data = await res.json();

      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setSpeakingMessageId(null);
        audio.onerror = () => setSpeakingMessageId(null);
        await audio.play();
        return;
      }
    } catch {
      // Fall through to browser speechSynthesis
    }

    if ('speechSynthesis' in window) {
      const cleanSpeech = msg.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*_`~>|]/g, '')
        .slice(0, 900);
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      const hasHindi = /[\u0900-\u097F]/.test(cleanSpeech);
      utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingMessageId(null);
      showToast('Speech output is not supported in this browser.');
    }
  };

  const handleToggleVoiceInput = () => {
    if (isListeningMic) {
      const activeRec = speechRecognitionRef.current as { stop?: () => void } | null;
      activeRec?.stop?.();
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      showToast('Voice recognition is supported in Chrome and Android browsers.');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognitionAPI as any)();
      recognition.lang = languageMode === 'hindi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningMic(true);
        showToast('Listening... 🎙️');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorBanner('Please select an image or document smaller than 10 MB.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (isImage || isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64Data = resultStr.split(',')[1] || '';
        setAttachment({
          name: file.name,
          mimeType: file.type,
          base64Data,
          previewUrl: isImage ? resultStr : undefined,
        });
        showToast(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = String(reader.result || '');
        setAttachment({
          name: file.name,
          mimeType: file.type || 'text/plain',
          textContent,
        });
        showToast(`Attached ${file.name}`);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextConvs = conversations.filter((c) => c.id !== convId);
    const nextMsgs = { ...messagesByConv };
    delete nextMsgs[convId];

    setConversations(nextConvs);
    setMessagesByConv(nextMsgs);
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    saveGuestState(nextConvs, nextMsgs);

    if (currentUser && currentUser.emailVerified) {
      try {
        const msgsSnap = await getDocs(
          query(
            collection(db, 'conversations', convId, 'messages'),
            where('userId', '==', currentUser.uid)
          )
        );
        for (const msgDoc of msgsSnap.docs) {
          await deleteDoc(msgDoc.ref);
        }
        await deleteDoc(doc(db, 'conversations', convId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `conversations/${convId}`);
      }
    }
    showToast('Conversation deleted');
  };

  const handleClearAllLocalHistory = () => {
    setConversations([]);
    setMessagesByConv({});
    setActiveConversationId(null);
    window.localStorage.removeItem(LOCAL_STORAGE_CONVS_KEY);
    window.localStorage.removeItem(LOCAL_STORAGE_MSGS_KEY);
    showToast('Conversation history cleared');
  };

  const renderSuggestionIcon = (iconName: SuggestionCardItem['iconName']) => {
    switch (iconName) {
      case 'lightbulb':
        return <Lightbulb className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
      case 'calculator':
        return <Calculator className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
      case 'pen':
        return <PenTool className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
      case 'languages':
        return <Languages className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
      case 'atom':
        return <Atom className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-amber-600 dark:text-yellow-400" />;
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  // Only show follow-up suggestions when genuinely helpful on substantive answers
  const lastUserMessage =
    [...activeMessages].reverse().find((m) => m.role === 'user')?.content || '';
  const lastAssistantMessage =
    activeMessages.length > 0 && activeMessages[activeMessages.length - 1].role === 'assistant'
      ? activeMessages[activeMessages.length - 1].content
      : '';
  const followUpSuggestions =
    lastAssistantMessage && !isGenerating
      ? generateFollowUpSuggestions(lastUserMessage, languageMode, lastAssistantMessage)
      : [];

  if (showWelcome) {
    return (
      <WelcomeScreen
        onGetStarted={handleCompleteWelcome}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div
      className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* Top Bar Contract: 3 Clean Zones separated by gap-8 */}
      <header
        className={`h-16 px-4 sm:px-6 border-b flex items-center justify-between gap-8 shrink-0 z-30 ${
          darkMode
            ? 'bg-slate-950/90 border-slate-800/90'
            : 'bg-white/95 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              darkMode ? 'hover:bg-slate-900 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            aria-label="Toggle conversation history drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleStartNewChat}
            className="flex items-center gap-2.5 text-left cursor-pointer shrink-0"
          >
            <RocketieeLogo size="sm" />
            <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap shrink-0">
              Rocketiee AI
            </span>
          </button>
        </div>

        <nav
          aria-label="Workspace navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          <button
            type="button"
            onClick={handleStartNewChat}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !activeConversationId
                ? 'text-amber-600 dark:text-yellow-400 font-semibold'
                : darkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Chat
          </button>
          <button
            type="button"
            onClick={() => {
              const order: LanguageMode[] = ['auto', 'english', 'hindi', 'hinglish'];
              const next = order[(order.indexOf(languageMode) + 1) % order.length];
              setLanguageMode(next);
              showToast(`Language: ${next.toUpperCase()}`);
            }}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {languageMode === 'auto'
              ? 'Language: Auto'
              : languageMode === 'hindi'
              ? 'Language: हिन्दी'
              : languageMode === 'hinglish'
              ? 'Language: Hinglish'
              : 'Language: English'}
          </button>
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {darkMode ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {currentUser
              ? currentUser.displayName || currentUser.email?.split('@')[0] || 'Account'
              : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Conversation History Sidebar / Drawer */}
        <aside
          aria-label="Conversation history"
          className={`fixed lg:static inset-y-0 left-0 z-40 w-72 flex flex-col border-r transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${
            darkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-slate-50/90 border-slate-200/80 text-slate-900'
          }`}
        >
          <div className="p-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleStartNewChat}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-bold text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Close conversation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search conversations"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400">
              Conversations ({filteredConversations.length})
            </div>

            {filteredConversations.length === 0 ? (
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                No conversations yet. Say hello or select a topic to get started!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? darkMode
                          ? 'bg-yellow-400/15 text-yellow-300 font-semibold'
                          : 'bg-amber-100/90 text-slate-950 font-semibold'
                        : darkMode
                        ? 'hover:bg-slate-800/70 text-slate-300'
                        : 'hover:bg-slate-200/60 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setSidebarOpen(false);
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="text-xs font-medium truncate">{conv.title}</div>
                      <div
                        className={`text-[11px] truncate mt-0.5 tabular-nums ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {conv.messageCount} msgs · {conv.lastMessagePreview || 'Chat'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      aria-label={`Delete conversation ${conv.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div
            className={`p-4 border-t space-y-3 ${
              darkMode ? 'border-slate-800' : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light' : 'Dark'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <UserIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {currentUser
                    ? currentUser.displayName || currentUser.email
                    : 'Guest Explorer · Sign In'}
                </span>
              </div>
              <span className="text-[11px] text-amber-600 dark:text-yellow-400 font-semibold shrink-0 ml-2">
                {currentUser ? 'Profile' : 'Sync'}
              </span>
            </button>

            <div
              className={`pt-1 text-[11px] leading-snug ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Built with an Indian Vision 🇮🇳
              </div>
              <div>Think Bigger. Learn Faster. Explore Further.</div>
            </div>
          </div>
        </aside>

        {/* Main Chat Viewport */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {toastMessage && (
            <div
              role="status"
              className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-yellow-300 border border-slate-700 text-xs font-medium shadow-lg"
            >
              {toastMessage}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6">
            {activeMessages.length === 0 ? (
              /* Clean, Welcoming Home Screen */
              <div className="max-w-4xl mx-auto py-4 sm:py-8 flex flex-col items-center text-center">
                <div className="mb-4">
                  <RocketieeLogo size="lg" />
                </div>

                <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-1.5 text-balance">
                  Hello, Explorer! 🚀
                </h1>
                <p className="font-display text-lg sm:text-xl font-bold text-amber-600 dark:text-yellow-400 mb-1">
                  Let’s Explore Together
                </p>
                <p
                  className={`text-sm sm:text-base mb-8 ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  What would you like to discover today?
                </p>

                {/* 6 Interactive Suggestion Cards */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
                  {SUGGESTION_CARDS.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleSuggestionCardClick(card)}
                      className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-150 text-left flex flex-col justify-between cursor-pointer ${
                        darkMode
                          ? 'bg-slate-900/90 border-slate-800 hover:border-yellow-400/60 hover:bg-slate-900'
                          : 'bg-white border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/30 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              darkMode ? 'bg-yellow-400/15' : 'bg-amber-100/80'
                            }`}
                          >
                            {renderSuggestionIcon(card.iconName)}
                          </div>
                          <span
                            className={`text-[11px] font-medium ${
                              darkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {card.category}
                          </span>
                        </div>
                        <h2 className="font-display font-bold text-base mb-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                          {card.title}
                        </h2>
                        <p
                          className={`text-xs leading-relaxed ${
                            darkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {card.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  className={`mt-8 text-xs ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <span>Built with an Indian Vision 🇮🇳</span>
                  <span className="mx-2" aria-hidden="true">
                    ·
                  </span>
                  <span>Your Ideas. Your Intelligence. Your India.</span>
                </div>
              </div>
            ) : (
              /* Active Conversation Stream */
              <div className="max-w-3xl mx-auto space-y-5 pb-4">
                {activeMessages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  const isCompactReply =
                    !isUser &&
                    msg.content.length < 220 &&
                    !msg.content.includes('###') &&
                    !msg.content.includes('```') &&
                    (!msg.sources || msg.sources.length === 0);

                  return (
                    <div
                      key={msg.id}
                      className={`group flex gap-3 sm:gap-3.5 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isUser && (
                        <div className="shrink-0 mt-0.5">
                          <RocketieeLogo size="sm" />
                        </div>
                      )}

                      <div
                        className={`${
                          isCompactReply
                            ? 'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 sm:px-4 sm:py-3'
                            : 'max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4'
                        } ${
                          isUser
                            ? 'bg-yellow-400 text-slate-950 font-medium shadow-2xs'
                            : darkMode
                            ? 'bg-slate-900 border border-slate-800 text-slate-100'
                            : 'bg-slate-50/90 border border-slate-200/80 text-slate-900'
                        }`}
                      >
                        {msg.attachmentName && (
                          <div className="mb-2">
                            {msg.attachmentPreviewUrl ? (
                              <img
                                src={msg.attachmentPreviewUrl}
                                alt={msg.attachmentName}
                                referrerPolicy="no-referrer"
                                className="max-h-48 rounded-xl border border-black/10 object-cover mb-1.5"
                              />
                            ) : null}
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-80">
                              <FileText className="w-3.5 h-3.5" />
                              <span>{msg.attachmentName}</span>
                            </div>
                          </div>
                        )}

                        {isUser ? (
                          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        ) : (
                          <>
                            <MarkdownMessage content={msg.content} darkMode={darkMode} />

                            {msg.sources && msg.sources.length > 0 && (
                              <div
                                className={`mt-3 pt-3 border-t text-xs ${
                                  darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              >
                                <div className="font-semibold mb-1.5 flex items-center gap-1.5 text-amber-600 dark:text-yellow-400">
                                  <Globe className="w-3.5 h-3.5" />
                                  <span>Verified Web Sources</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.sources.map((src, idx) => (
                                    <a
                                      key={idx}
                                      href={src.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline hover:text-amber-500 truncate max-w-xs"
                                    >
                                      {src.title || src.uri}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* For compact greetings/short replies, keep actions subtle and uncluttered; for longer answers, show full toolbar */}
                            {isCompactReply ? (
                              <div
                                className={`mt-1.5 flex items-center gap-1 text-[11px] opacity-80 group-hover:opacity-100 transition-opacity ${
                                  darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  aria-label="Copy response"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{copiedMessageId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSpeakMessage(msg)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  aria-label={
                                    speakingMessageId === msg.id ? 'Stop speaking' : 'Listen to response'
                                  }
                                >
                                  {speakingMessageId === msg.id ? (
                                    <Square className="w-3 h-3" />
                                  ) : (
                                    <Volume2 className="w-3 h-3" />
                                  )}
                                  <span>{speakingMessageId === msg.id ? 'Stop' : 'Listen'}</span>
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`mt-3 pt-2.5 border-t flex flex-wrap items-center gap-1.5 text-xs ${
                                  darkMode
                                    ? 'border-slate-800/80 text-slate-400'
                                    : 'border-slate-200/70 text-slate-500'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  aria-label="Copy response"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-500 font-medium">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRegenerateResponse(index)}
                                  disabled={isGenerating}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                                  aria-label="Regenerate response"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Regenerate</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSpeakMessage(msg)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                    speakingMessageId === msg.id
                                      ? 'bg-yellow-400 text-slate-950 font-semibold'
                                      : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                  }`}
                                  aria-label={
                                    speakingMessageId === msg.id ? 'Stop speaking' : 'Listen to response'
                                  }
                                >
                                  {speakingMessageId === msg.id ? (
                                    <>
                                      <Square className="w-3.5 h-3.5" />
                                      <span>Stop</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5" />
                                      <span>Listen</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareMessage(msg)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  aria-label="Share response"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share</span>
                                </button>

                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(msg, 'up')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      msg.feedback === 'up'
                                        ? 'text-emerald-500 bg-emerald-500/10'
                                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                    }`}
                                    aria-label="Helpful response"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(msg, 'down')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      msg.feedback === 'down'
                                        ? 'text-amber-500 bg-amber-500/10'
                                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                    }`}
                                    aria-label="Not helpful response"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Follow-Up Suggestions: Only displayed for substantive/detailed explanations */}
                {followUpSuggestions.length > 0 && (
                  <div className="pl-11 sm:pl-12 pt-1 flex flex-wrap gap-2">
                    {followUpSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendPromptToRocketiee(suggestion)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-medium text-left transition-colors cursor-pointer ${
                          darkMode
                            ? 'bg-slate-900 border-slate-800 hover:border-yellow-400/60 text-slate-300'
                            : 'bg-white border-slate-200 hover:border-amber-400 text-slate-700'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-start gap-3 sm:gap-3.5" aria-live="polite">
                    <RocketieeLogo size="sm" animated />
                    <div
                      className={`rounded-2xl px-4 py-3 border flex items-center gap-2.5 ${
                        darkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-amber-50/60 border-amber-200/80 text-slate-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {errorBanner && (
            <div className="max-w-3xl w-full mx-auto px-4 mb-2">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center justify-between gap-3">
                <span>{errorBanner}</span>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="text-xs font-semibold underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Bottom Message Input Composer */}
          <div
            className={`px-4 sm:px-6 py-3.5 border-t shrink-0 ${
              darkMode
                ? 'bg-slate-950 border-slate-800/80'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <div className="max-w-3xl mx-auto">
              {attachment && (
                <div
                  className={`mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-200'
                      : 'bg-amber-50/70 border-amber-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-yellow-400/20 text-amber-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                        {attachment.mimeType.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{attachment.name}</div>
                      <div className="text-[11px] opacity-70">Ready for analysis</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleFormSubmit}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2 transition-colors ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 focus-within:border-yellow-400'
                    : 'bg-slate-50/90 border-slate-200 focus-within:border-amber-400 focus-within:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt,.md,.csv,.json,.py,.js,.ts,.tsx,.pdf"
                  onChange={handleFileUploadChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 ${
                    darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                  aria-label="Upload image or document"
                  title="Attach image or document"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUseWebSearch((prev) => !prev);
                    showToast(
                      !useWebSearch
                        ? 'Live Web Search enabled 🌐'
                        : 'Live Web Search disabled'
                    );
                  }}
                  className={`min-h-[44px] min-w-[44px] sm:px-2.5 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    useWebSearch
                      ? 'bg-yellow-400 text-slate-950'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-400'
                      : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                  aria-label="Toggle live web search"
                  title="Search the web for current information"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask Rocketiee AI in English, हिन्दी, or Hinglish..."
                  aria-label="Message Rocketiee AI"
                  className="flex-1 min-w-0 h-11 px-2 bg-transparent text-sm sm:text-[15px] focus:outline-none truncate"
                />

                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 ${
                    isListeningMic
                      ? 'bg-red-500 text-white animate-pulse'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                  aria-label={isListeningMic ? 'Stop voice input' : 'Start voice input'}
                  title="Voice input (English & Hindi)"
                >
                  {isListeningMic ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  type="submit"
                  disabled={isGenerating || (!inputPrompt.trim() && !attachment)}
                  className="min-h-[44px] min-w-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-slate-950 font-display font-bold text-sm transition-colors cursor-pointer shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        darkMode={darkMode}
        onProfileSaved={handleSaveUserProfileToFirestore}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        languageMode={languageMode}
        onChangeLanguageMode={setLanguageMode}
        responseStyle={responseStyle}
        onChangeResponseStyle={setResponseStyle}
        voiceName={voiceName}
        onChangeVoiceName={setVoiceName}
        onReplayWelcome={() => setShowWelcome(true)}
        onClearAllHistory={handleClearAllLocalHistory}
      />
    </div>
  );
}
