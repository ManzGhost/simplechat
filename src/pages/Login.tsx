import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [deletedNotice, setDeletedNotice] = useState<boolean>(() => {
    return !!(location.state as any)?.accountDeleted;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!usernameOrEmail.trim() || !password) {
      setError('Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });
      navigate('/');
    } catch (err: any) {
      console.error('Login error', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        setError(serverMsg || 'Invalid credentials or wrong password');
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Server unavailable. Please check your connection.');
      } else {
        setError(serverMsg || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-neutral-100/70 dark:bg-slate-950 night:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle variant="compact" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <MessageSquare className="w-7 h-7" />
          </div>
        </div>
        <h2 id="login-title" className="text-center text-2xl font-bold tracking-tight text-neutral-900 dark:text-white night:text-white">
          Sign in to SimpleChat
        </h2>
        <p className="mt-1.5 text-center text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400">
          Real-time, private, end-to-end messaging
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 night:bg-black py-8 px-6 shadow-sm border border-neutral-200/80 dark:border-slate-800 night:border-neutral-800 rounded-2xl sm:px-10 transition-colors">
          {deletedNotice && (
            <div
              id="login-account-deleted-notice"
              className="mb-4 flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your account was successfully deleted.</span>
              </div>
              <button
                type="button"
                onClick={() => setDeletedNotice(false)}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div
              id="login-error-alert"
              className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="login-form" className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  name="usernameOrEmail"
                  type="text"
                  autoComplete="username"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@example.com or username"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
                <button
                  id="login-toggle-password-btn"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200 night:text-neutral-400 night:hover:text-neutral-200 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-800 night:border-neutral-900 text-center">
            <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400">
              Don't have an account?{' '}
              <Link
                id="to-register-link"
                to="/register"
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
