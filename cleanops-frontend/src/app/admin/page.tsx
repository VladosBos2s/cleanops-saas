'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Building2, ShieldCheck } from 'lucide-react';
import { AuthUser, clearSession, getStoredUser, getToken } from '@/lib/api';

export default function AdminWorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      router.replace('/');
      return;
    }

    if (stored.role !== 'ADMIN') {
      router.replace('/cleaner');
      return;
    }

    setUser(stored);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace('/');
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white">{user.organizationName}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {user.name} · {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Dispatch Control Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Authentication and role routing are active. Next up: KPI cards, booking scheduler with
            square-meter calculator, customer directory, and staff onboarding/deletion.
          </p>
        </div>
      </main>
    </div>
  );
}