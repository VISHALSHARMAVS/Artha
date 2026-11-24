import React, { useState } from 'react';
import { api, AuthUser } from '../lib/api';
import { ArthaGlyph } from '../components/brand/ArthaLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let res;
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Please enter your full name.');
        res = await api.register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        });
      } else {
        res = await api.login({
          email: email.trim(),
          password,
        });
      }

      localStorage.setItem('artha_token', res.token);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('PASSWORD_NOT_SET') || msg.includes('financial onboarding without a password')) {
        setIsRegister(true);
        setError('Your account was created during financial onboarding! Please enter your name and choose a password below to secure and claim your account.');
      } else {
        setError(msg || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Demo login
      const demoEmail = 'aryan.demo@artha.finance';
      const demoPass = 'ArthaDemoPass@2026';
      
      try {
        const res = await api.login({ email: demoEmail, password: demoPass });
        localStorage.setItem('artha_token', res.token);
        onSuccess(res.user);
        onClose();
      } catch {
        // If demo user does not exist yet, auto-register
        const regRes = await api.register({
          email: demoEmail,
          password: demoPass,
          full_name: 'Aryan Sharma',
        });
        localStorage.setItem('artha_token', regRes.token);
        onSuccess(regRes.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-lg"
          title="Close"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <ArthaGlyph size={28} />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isRegister ? 'Create Your Artha Account' : 'Sign in to Artha'}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
          {isRegister
            ? 'Set up your private, institutional double-entry financial ledger.'
            : 'Access your financial health, safe-to-spend limits, and WhatsApp engine.'}
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Aryan Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="aryan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 shadow-sm"
          >
            {isLoading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-[#313131]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white dark:bg-[#1F1F1F] text-slate-400 dark:text-slate-500">or continue with</span>
          </div>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>1-Click Demo Sign-In (Aryan Sharma)</span>
        </button>

        <div className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
