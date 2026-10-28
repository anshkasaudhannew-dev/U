import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { RocketieeLogo } from './RocketieeLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  darkMode: boolean;
  onProfileSaved: (displayName: string) => Promise<void>;
}

type AuthTab = 'signin' | 'signup' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  darkMode,
  onProfileSaved,
}) => {
  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusMsg('Signed in with Google! Syncing your Rocketiee AI conversations...');
      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was closed before completing.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (tab === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setStatusMsg(`Password reset link sent to ${trimmedEmail}. Please check your inbox.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (tab === 'signup' && !displayName.trim()) {
      setErrorMsg('Please enter your name to create an account.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onClose();
      } else {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
          await onProfileSaved(displayName.trim());
        }
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in the Firebase Console for this project. Use "Continue with Google" right below, or enable Email/Password under Firebase Console > Authentication > Sign-in method.'
        );
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setErrorMsg('Invalid email or password. Please try again or reset your password.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await updateProfile(currentUser, { displayName: trimmed });
      await onProfileSaved(trimmed);
      setStatusMsg('Profile updated! Your preferences are synced.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-xl transition-colors ${
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
          aria-label="Close account modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <RocketieeLogo size="md" />
          <div>
            <h2 id="auth-modal-title" className="font-display font-bold text-xl">
              {currentUser ? 'Your Rocketiee Account' : 'Welcome to Rocketiee AI'}
            </h2>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentUser
                ? 'Cloud history & preferences synced'
                : 'Sign in to sync chat history across devices'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {currentUser ? (
          <div className="space-y-5">
            <div
              className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/60 border-amber-200/80'
              }`}
            >
              <div className="text-xs font-medium text-amber-600 dark:text-yellow-400 mb-1">
                Signed In Explorer
              </div>
              <div className="font-semibold text-sm truncate">
                {currentUser.displayName || 'Explorer'}
              </div>
              <div className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentUser.email || 'Authenticated Session'}
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium mb-1.5"
                >
                  Display Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    placeholder="Enter your name"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Segmented Mode Tabs */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${
                darkMode ? 'bg-slate-950' : 'bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'signin'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'signup'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reset');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'reset'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reset Password
              </button>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full min-h-[46px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 hover:bg-slate-800 text-white'
                  : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink mx-3 text-xs text-slate-400">or with email</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      maxLength={80}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {tab !== 'reset' && (
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-bold text-sm transition-colors cursor-pointer"
              >
                {loading
                  ? 'Please wait...'
                  : tab === 'signin'
                  ? 'Sign In'
                  : tab === 'signup'
                  ? 'Create Rocketiee Account'
                  : 'Send Password Reset Link'}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onClose}
                className={`text-xs font-medium hover:underline cursor-pointer ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Continue in Guest Mode (No account required to explore)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
