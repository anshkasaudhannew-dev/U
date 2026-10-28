import React from 'react';
import {
  X,
  Sun,
  Moon,
  Smartphone,
  Volume2,
  RotateCcw,
  Trash2,
  Languages,
  Sliders,
} from 'lucide-react';
import { LanguageMode, ResponseStyle } from '../utils/rocketieeLogic';
import { RocketieeLogo } from './RocketieeLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  languageMode: LanguageMode;
  onChangeLanguageMode: (mode: LanguageMode) => void;
  responseStyle: ResponseStyle;
  onChangeResponseStyle: (style: ResponseStyle) => void;
  voiceName: string;
  onChangeVoiceName: (voice: string) => void;
  onReplayWelcome: () => void;
  onClearAllHistory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  languageMode,
  onChangeLanguageMode,
  responseStyle,
  onChangeResponseStyle,
  voiceName,
  onChangeVoiceName,
  onReplayWelcome,
  onClearAllHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-7 shadow-xl transition-colors ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-5 right-5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          aria-label="Close settings modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <RocketieeLogo size="md" />
          <div>
            <h2 id="settings-modal-title" className="font-display font-bold text-xl">
              Settings & Android Guide
            </h2>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Customize Rocketiee AI’s theme, language, and voice
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance / Theme */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-yellow-400 mb-2.5">
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Appearance & Colour Theme</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (darkMode) onToggleDarkMode();
                }}
                className={`min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  !darkMode
                    ? 'bg-yellow-400 border-yellow-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Pure White & Yellow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!darkMode) onToggleDarkMode();
                }}
                className={`min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-yellow-400 border-yellow-500 text-slate-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Slate & Yellow</span>
              </button>
            </div>
          </div>

          {/* Language Preference */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-yellow-400 mb-2.5">
              <Languages className="w-4 h-4" />
              <span>Hindi, English & Hinglish Mode</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'english', label: 'English' },
                  { id: 'hindi', label: 'हिन्दी (Hindi)' },
                  { id: 'hinglish', label: 'Hinglish' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeLanguageMode(item.id)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    languageMode === item.id
                      ? 'bg-yellow-400 border-yellow-500 text-slate-950'
                      : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Depth */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-yellow-400 mb-2.5">
              <Sliders className="w-4 h-4" />
              <span>AI Explanation Style</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'balanced', label: 'Smart Adaptive' },
                  { id: 'concise', label: 'Quick & Concise' },
                  { id: 'detailed', label: 'Step-by-Step Deep' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeResponseStyle(item.id)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    responseStyle === item.id
                      ? 'bg-yellow-400 border-yellow-500 text-slate-950'
                      : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spoken Voice Selection */}
          <div>
            <label
              htmlFor="voice-select"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-yellow-400 mb-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Spoken Response Voice (Text-to-Speech)</span>
            </label>
            <select
              id="voice-select"
              value={voiceName}
              onChange={(e) => onChangeVoiceName(e.target.value)}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="Kore">Kore — Warm, Clear & Friendly</option>
              <option value="Puck">Puck — Energetic & Expressive</option>
              <option value="Zephyr">Zephyr — Calm & Articulate</option>
            </select>
          </div>

          {/* Android App Packaging & Home Screen Installation */}
          <div
            className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/60 border-amber-200/80'
            }`}
          >
            <div className="flex items-center gap-2 font-display font-bold text-sm mb-1.5">
              <Smartphone className="w-4 h-4 text-amber-500" />
              <span>Install on Android & APK Packaging</span>
            </div>
            <p className={`text-xs leading-relaxed mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Rocketiee AI is engineered with an Android-ready Web App Manifest and adaptive
              yellow-and-white rocket launcher icon:
            </p>
            <ul className={`text-xs space-y-1 list-disc pl-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <li>
                <strong>Instant Home Screen Install:</strong> Open in Chrome on Android, tap the
                browser menu (⋮), and select <strong>Add to Home screen / Install app</strong>.
              </li>
              <li>
                <strong>Native Android APK / Play Store:</strong> Package directly using{' '}
                <code className="font-mono">Bubblewrap (Trusted Web Activity)</code> or{' '}
                <code className="font-mono">Capacitor (@capacitor/android)</code> pointing to your
                deployed Cloud Run URL.
              </li>
            </ul>
          </div>

          {/* Actions Row */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onReplayWelcome();
              }}
              className={`min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                darkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Welcome Screen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClearAllHistory();
                onClose();
              }}
              className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
