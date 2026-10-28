import React, { useState } from 'react';
import { ArrowRight, Sparkles, Globe2, MessageSquare, Code2 } from 'lucide-react';
import { RocketieeLogo } from './RocketieeLogo';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  darkMode: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted, darkMode }) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchClick = () => {
    setIsLaunching(true);
    window.setTimeout(() => {
      onGetStarted();
    }, 280);
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Top Minimal Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RocketieeLogo size="sm" />
          <span className="font-display font-bold text-lg tracking-tight">Rocketiee AI</span>
        </div>
        <div
          className={`text-xs font-medium ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <span>Built with an Indian Vision 🇮🇳</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span>Created by Devansh</span>
        </div>
      </header>

      {/* Center Animated Hero Experience */}
      <main className="max-w-3xl w-full mx-auto my-auto py-8 flex flex-col items-center text-center">
        {/* Rocket Launch Stage */}
        <div className="relative mb-8 flex items-center justify-center">
          <div
            className={`absolute -inset-6 rounded-full blur-2xl transition-opacity duration-300 ${
              darkMode ? 'bg-yellow-400/20' : 'bg-yellow-300/45'
            }`}
            aria-hidden="true"
          />
          <div
            className={`transition-transform duration-300 ease-out ${
              isLaunching ? '-translate-y-12 scale-110 opacity-0' : 'translate-y-0 scale-100 opacity-100'
            }`}
          >
            <RocketieeLogo size="xl" animated />
          </div>
        </div>

        {/* Exact Required Welcome Message */}
        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-balance">
          Let’s Explore Together 🚀
        </h1>

        {/* Exact Required Sub-headline */}
        <p
          className={`text-lg sm:text-xl md:text-2xl font-semibold tracking-tight mb-3 ${
            darkMode ? 'text-yellow-400' : 'text-amber-600'
          }`}
        >
          Your Ideas. Your Intelligence. Your India.
        </p>

        <p
          className={`max-w-xl text-sm sm:text-base leading-relaxed mb-8 ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          Think Bigger. Learn Faster. Explore Further. Experience a smart, friendly, and witty AI
          companion fluent in English, हिन्दी, and Hinglish.
        </p>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={handleLaunchClick}
          className="group relative inline-flex items-center justify-center gap-3 min-h-[52px] px-8 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-slate-950 font-display font-bold text-base sm:text-lg shadow-md transition-all duration-150 cursor-pointer whitespace-nowrap"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5 transition-transform duration-150 group-hover:translate-x-1" />
        </button>

        {/* Capability Highlights Row */}
        <div
          className={`mt-12 pt-8 border-t w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left ${
            darkMode ? 'border-slate-800/80' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-amber-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5">English, हिन्दी & Hinglish</h2>
              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Converse naturally in your preferred language with patient, step-by-step clarity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-amber-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5">Voice, Vision & Docs</h2>
              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Speak with voice input, listen to spoken replies, or upload images and documents.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-amber-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5">STEM, Coding & Creativity</h2>
              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                From school homework and math equations to full-stack code and creative stories.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Vision Footer */}
      <footer
        className={`max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
          <span>Rocketiee AI — Let’s Explore Together! 🚀</span>
        </div>
        <div>Think Bigger. Learn Faster. Explore Further.</div>
      </footer>
    </div>
  );
};
