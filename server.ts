import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  isCreatorIdentityQuery,
  getCreatorIdentityAnswer,
  buildSystemInstruction,
  LanguageMode,
  ResponseStyle,
} from './src/utils/rocketieeLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const GEMINI_CHAT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
] as const;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function buildGeminiContents(
  history: Array<{ role?: string; content?: string }>,
  currentUserPrompt: string,
  attachment?: {
    name?: string;
    mimeType?: string;
    base64Data?: string;
    textContent?: string;
  } | null
): Array<{ role: string; parts: Array<Record<string, unknown>> }> {
  const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
  const cleanedHistory: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const item of recentHistory) {
    if (!item || typeof item.content !== 'string') continue;
    const text = item.content.trim();
    if (!text) continue;
    const mappedRole: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';

    // Merge consecutive messages of the same role to preserve strict user/model alternation
    const prev = cleanedHistory[cleanedHistory.length - 1];
    if (prev && prev.role === mappedRole) {
      if (prev.text !== text) {
        prev.text = `${prev.text}\n\n${text}`;
      }
    } else {
      cleanedHistory.push({ role: mappedRole, text });
    }
  }

  // Ensure the current user message is not duplicated at the tail of history
  const lastInHistory = cleanedHistory[cleanedHistory.length - 1];
  if (
    lastInHistory &&
    lastInHistory.role === 'user' &&
    lastInHistory.text.trim() === currentUserPrompt.trim()
  ) {
    cleanedHistory.pop();
  }

  // Gemini requires the first turn in contents to be 'user'
  while (cleanedHistory.length > 0 && cleanedHistory[0].role !== 'user') {
    cleanedHistory.shift();
  }

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> =
    cleanedHistory.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    }));

  const currentParts: Array<Record<string, unknown>> = [];

  if (attachment && attachment.base64Data && attachment.mimeType) {
    if (
      attachment.mimeType.startsWith('image/') ||
      attachment.mimeType === 'application/pdf'
    ) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64Data,
        },
      });
    }
  }

  let finalUserPrompt =
    currentUserPrompt.trim() || 'Please analyze and summarize this attachment.';
  if (attachment?.textContent) {
    finalUserPrompt = `${finalUserPrompt}\n\n[Attached Document: ${attachment.name || 'document.txt'}]\n\`\`\`\n${String(attachment.textContent).slice(0, 18000)}\n\`\`\``;
  }

  currentParts.push({ text: finalUserPrompt });

  // If the last turn in contents is still 'user', append to its parts instead of creating consecutive user turns
  const tail = contents[contents.length - 1];
  if (tail && tail.role === 'user') {
    tail.parts.push(...currentParts);
  } else {
    contents.push({
      role: 'user',
      parts: currentParts,
    });
  }

  return contents;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Rocketiee AI', creator: 'Devansh' });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        message = '',
        history = [],
        languageMode = 'auto',
        responseStyle = 'balanced',
        useWebSearch = false,
        attachment = null,
      } = req.body || {};

      const trimmedMessage = String(message).trim();
      if (!trimmedMessage && !attachment) {
        res.status(400).json({ error: 'Please enter a message or attach a file.' });
        return;
      }

      // 1. Predefined Creator Identity response when explicitly asked who created/made Rocketiee AI
      if (!attachment && isCreatorIdentityQuery(trimmedMessage)) {
        res.json({
          text: getCreatorIdentityAnswer(trimmedMessage, languageMode as LanguageMode),
          model: 'rocketiee-identity-v1',
          sources: [],
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY to enable AI responses.',
        });
        return;
      }

      const systemInstruction = buildSystemInstruction(
        languageMode as LanguageMode,
        responseStyle as ResponseStyle
      );

      const contents = buildGeminiContents(history, trimmedMessage, attachment);

      const config: Record<string, unknown> = {
        systemInstruction,
        temperature: 0.7,
      };

      if (useWebSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      let response: GenerateContentResponse | null = null;
      let usedModel = '';
      let lastError: unknown = null;

      for (const candidateModel of GEMINI_CHAT_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config,
          });
          if (response && response.text && response.text.trim()) {
            usedModel = candidateModel;
            break;
          }
        } catch (modelErr: unknown) {
          lastError = modelErr;
          const errStr = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`Model ${candidateModel} error, trying next model if available:`, errStr.slice(0, 180));
        }
      }

      if (!response || !response.text || !response.text.trim()) {
        const rawErrMessage =
          lastError instanceof Error ? lastError.message : String(lastError || 'Unknown API error');
        const isQuotaError =
          rawErrMessage.includes('429') ||
          rawErrMessage.includes('RESOURCE_EXHAUSTED') ||
          rawErrMessage.toLowerCase().includes('quota');

        res.status(isQuotaError ? 429 : 502).json({
          error: isQuotaError
            ? 'The AI service is temporarily rate-limited (HTTP 429). Please wait a moment and try again.'
            : 'Unable to receive a response from the AI model right now. Please try again.',
        });
        return;
      }

      const outputText = response.text.trim();

      const rawChunks =
        (
          response.candidates?.[0] as unknown as {
            groundingMetadata?: {
              groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            };
          }
        )?.groundingMetadata?.groundingChunks || [];

      const sources = rawChunks
        .map((chunk) => chunk.web)
        .filter((web): web is { uri: string; title?: string } => Boolean(web && web.uri))
        .slice(0, 5);

      res.json({
        text: outputText,
        model: usedModel || GEMINI_CHAT_MODELS[0],
        sources,
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Unhandled /api/chat error:', errMessage);
      const isQuota =
        errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED');

      res.status(isQuota ? 429 : 500).json({
        error: isQuota
          ? 'The AI service is temporarily rate-limited (HTTP 429). Please wait a moment and try again.'
          : 'An unexpected server error occurred while processing your message.',
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { text = '', voiceName = 'Kore' } = req.body || {};
      const cleanText = String(text)
        .replace(/```[\s\S]*?```/g, 'Code block omitted for speech.')
        .replace(/[#*_`~>|]/g, '')
        .trim()
        .slice(0, 1200);

      if (!cleanText) {
        res.status(400).json({ error: 'No text provided for speech synthesis.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(200).json({ fallbackToBrowserTts: true });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: String(voiceName) },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(200).json({ fallbackToBrowserTts: true });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch {
      res.status(200).json({ fallbackToBrowserTts: true });
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body || {};
      if (!audioBase64) {
        res.status(400).json({ error: 'Missing audio data.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({ error: 'Speech transcription service requires API connection.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: String(mimeType),
                data: String(audioBase64),
              },
            },
            {
              text: 'Transcribe this spoken audio accurately in English, Hindi, or Hinglish.',
            },
          ],
        },
      });

      res.json({ text: response.text || '' });
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rocketiee AI server listening on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
