'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  KeyRound,
  Building2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Lock,
} from 'lucide-react';
import {
  apiRequest,
  AuthUser,
  getDashboardPath,
  getStoredUser,
  getToken,
  LoginResponse,
  saveSession,
} from '@/lib/api';

type Mode = 'login' | 'setup-password' | 'register-org';

export default function HomeAuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupUserName, setSetupUserName] = useState('');

  // Multi-tenant organization registration fields
  const [organizationName, setOrganizationName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Redirect already authenticated users to their role workspace
  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [router]);

  function applyDemoAccount(demoEmail: string, demoPassword: string) {
    setError(null);
    setInfo(null);
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setConfirmPassword('');
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password: password || undefined,
        }),
      });

      // Switch to first-time password creation flow when account has no password yet
      if (data.requiresPasswordSetup) {
        setSetupUserName(data.name || email.trim());
        setPassword('');
        setConfirmPassword('');
        setMode('setup-password');
        setInfo('First-time sign-in detected. Create your personal password to activate access.');
        return;
      }

      if (data.token && data.user) {
        saveSession(data.token, data.user);
        router.replace(getDashboardPath(data.user.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/setup-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      saveSession(data.token, data.user);
      router.replace(getDashboardPath(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterOrgSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/register-org', {
        method: 'POST',
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          adminName: adminName.trim(),
          email: email.trim(),
          password,
          currency,
        }),
      });

      saveSession(data.token, data.user);
      router.replace(getDashboardPath(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-10">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: SaaS overview & demo accounts */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Multi-Tenant Cleaning Operations SaaS
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            CleanOps <span className="text-emerald-400">Dispatch & Field</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Coordinate cleaning crews, calculate square-meter quotes, enforce room-by-room
            completion checklists, and track cleaner payouts inside isolated organization workspaces.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Demo Credentials
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => applyDemoAccount('admin@cleanops.io', 'admin123')}
                className="text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Dispatcher (Admin)
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">admin@cleanops.io</div>
                <div className="text-[11px] text-slate-500">pass: admin123</div>
              </button>

              <button
                type="button"
                onClick={() => applyDemoAccount('maria@cleanops.io', '1234')}
                className="text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  Cleaner (Active)
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">maria@cleanops.io</div>
                <div className="text-[11px] text-slate-500">pass: 1234</div>
              </button>

              <button
                type="button"
                onClick={() => applyDemoAccount('newbie@cleanops.io', '')}
                className="text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  New Cleaner
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">newbie@cleanops.io</div>
                <div className="text-[11px] text-slate-500">sets password on 1st login</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Auth card */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Top mode switcher */}
            {mode !== 'setup-password' && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setInfo(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register-org');
                    setError(null);
                    setInfo(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mode === 'register-org'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  New Organization
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {info && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                {info}
              </div>
            )}

            {/* Mode 1: Standard Sign-In (triggers password setup if passwordHash is null) */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@cleanops.io"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Password</label>
                    <span className="text-[11px] text-slate-500">
                      Leave empty if setting up for the first time
                    </span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Mode 2: First-Time Password Setup */}
            {mode === 'setup-password' && (
              <form onSubmit={handleSetupPasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
                  <Lock className="w-5 h-5" />
                  <h2 className="text-lg font-semibold text-white">Create Your Password</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Account: <span className="text-slate-200 font-medium">{setupUserName}</span> ({email})
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Password (min 4 chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setPassword('');
                      setConfirmPassword('');
                      setInfo(null);
                      setError(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Password & Enter Workspace'}
                  </button>
                </div>
              </form>
            )}

            {/* Mode 3: Multi-Tenant Organization Registration */}
            {mode === 'register-org' && (
              <form onSubmit={handleRegisterOrgSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Creates a new isolated cleaning company workspace
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="FreshNest Cleaning"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="PLN">PLN (zł)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Owner / Admin Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@freshnest.io"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
                >
                  {loading ? 'Creating workspace...' : 'Create Organization Workspace'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}