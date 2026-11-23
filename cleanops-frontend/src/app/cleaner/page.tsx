'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Key,
  LogOut,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  Sparkles,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { apiRequest, AuthUser, clearSession, getStoredUser, getToken } from '@/lib/api';
import { Booking } from '@/types/cleanops';

type JobFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ASSIGNED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  IN_PROGRESS: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default function CleanerWorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<JobFilter>('ACTIVE');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const data = await apiRequest<Booking[]>('/bookings');
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      router.replace('/login');
      return;
    }

    if (stored.role !== 'CLEANER') {
      router.replace('/admin');
      return;
    }

    setUser(stored);
    loadBookings();
  }, [router, loadBookings]);

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  async function handleToggleChecklistItem(bookingId: string, itemId: string, nextVal: boolean) {
    setError(null);
    const key = `check-${itemId}`;
    setBusyKey(key);

    // Optimistic UI update so checklist toggles feel instantaneous on mobile
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              checklist: b.checklist.map((item) =>
                item.id === itemId ? { ...item, isCompleted: nextVal } : item
              ),
            }
          : b
      )
    );

    try {
      await apiRequest(`/bookings/${bookingId}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: nextVal }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist item');
      await loadBookings();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStatusTransition(bookingId: string, nextStatus: 'IN_PROGRESS' | 'COMPLETED') {
    setError(null);
    const key = `status-${bookingId}`;
    setBusyKey(key);

    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job status');
    } finally {
      setBusyKey(null);
    }
  }

  const stats = useMemo(() => {
    const nonCancelled = bookings.filter((b) => b.status !== 'CANCELLED');
    const activeCount = nonCancelled.filter((b) => b.status !== 'COMPLETED').length;
    const completedJobs = nonCancelled.filter((b) => b.status === 'COMPLETED');
    const earnedTotal = completedJobs.reduce((sum, b) => sum + b.cleanerPayout, 0);
    const upcomingPayout = nonCancelled
      .filter((b) => b.status !== 'COMPLETED')
      .reduce((sum, b) => sum + b.cleanerPayout, 0);

    return {
      activeCount,
      completedCount: completedJobs.length,
      earnedTotal: Number(earnedTotal.toFixed(2)),
      upcomingPayout: Number(upcomingPayout.toFixed(2)),
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filter === 'ACTIVE') return b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
      if (filter === 'COMPLETED') return b.status === 'COMPLETED';
      return true;
    });
  }, [bookings, filter]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading cleaner field portal...
      </div>
    );
  }

  const currency = user.currency || 'USD';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Mobile-friendly top header */}
      <header className="border-b border-slate-800 bg-slate-900/85 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white text-sm sm:text-base truncate">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[11px] font-medium shrink-0">
                  <UserCheck className="w-3 h-3" />
                  {Math.round((user.commissionRate ?? 0.5) * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{user.organizationName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => loadBookings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Earnings & Shift Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
            <div className="text-[11px] sm:text-xs text-slate-400">Active Jobs</div>
            <div className="text-lg sm:text-2xl font-bold text-white mt-1">{stats.activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Est: {stats.upcomingPayout.toFixed(2)} {currency}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
            <div className="text-[11px] sm:text-xs text-slate-400">Completed</div>
            <div className="text-lg sm:text-2xl font-bold text-sky-400 mt-1">
              {stats.completedCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified jobs</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
              <span>Earned</span>
              <Wallet className="w-3.5 h-3.5 text-emerald-400 hidden sm:block" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1">
              {stats.earnedTotal.toFixed(2)} {currency}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">From completed</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'ACTIVE', label: 'Active Shifts' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'ALL', label: 'All Assigned' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Job Cards */}
        {filteredBookings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            No jobs in this view right now.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((job) => {
              const completedCount = job.checklist.filter((item) => item.isCompleted).length;
              const totalCount = job.checklist.length;
              const progressPct =
                totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
              const allDone = completedCount === totalCount;
              const isStatusBusy = busyKey === `status-${job.id}`;

              return (
                <article
                  key={job.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4"
                >
                  {/* Top Header: Service, Status & Payout */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-white text-base sm:text-lg">
                          {job.serviceType.name}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${
                            STATUS_STYLES[job.status] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
                          {new Date(job.scheduledStart).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>Area: {job.areaSqm} m²</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Your Payout</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {job.cleanerPayout.toFixed(2)} {currency}
                      </div>
                    </div>
                  </div>

                  {/* Customer Address, Phone & Access Notes */}
                  <div className="rounded-xl bg-slate-950 border border-slate-800/90 p-3.5 space-y-2 text-xs sm:text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 text-slate-200">
                        <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-white">{job.customer.name}</div>
                          <div className="text-slate-300">{job.customer.address}</div>
                        </div>
                      </div>

                      <a
                        href={`tel:${job.customer.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-sky-400 shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {job.customer.phone}
                      </a>
                    </div>

                    {job.customer.accessNotes && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2">
                        <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-300">Entry & Access: </span>
                          {job.customer.accessNotes}
                        </div>
                      </div>
                    )}

                    {job.addons.length > 0 && (
                      <div className="text-xs text-slate-400 pt-1">
                        <span className="text-slate-300 font-medium">Add-ons: </span>
                        {job.addons.map((a) => a.addonService.name).join(', ')}
                      </div>
                    )}

                    {job.notes && (
                      <div className="text-xs text-slate-400 italic">Notes: {job.notes}</div>
                    )}
                  </div>

                  {/* Interactive Room Checklist */}
                  {job.checklist.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          Quality Checklist ({completedCount}/{totalCount})
                        </span>
                        <span className="text-slate-400">{progressPct}%</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {job.checklist.map((item) => {
                          const isItemBusy = busyKey === `check-${item.id}`;
                          const canToggle = job.status !== 'COMPLETED' && job.status !== 'CANCELLED';

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!canToggle || isItemBusy}
                              onClick={() =>
                                handleToggleChecklistItem(job.id, item.id, !item.isCompleted)
                              }
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs sm:text-sm transition ${
                                item.isCompleted
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-slate-300 line-through decoration-emerald-500/60'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-100 hover:border-slate-700'
                              } ${canToggle ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
                            >
                              {item.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <span>{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Job Status Action Footer */}
                  {job.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      disabled={isStatusBusy}
                      onClick={() => handleStatusTransition(job.id, 'IN_PROGRESS')}
                      className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      {isStatusBusy ? 'Starting...' : 'Start Cleaning'}
                    </button>
                  )}

                  {job.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      disabled={isStatusBusy || !allDone}
                      onClick={() => handleStatusTransition(job.id, 'COMPLETED')}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                        allDone
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isStatusBusy
                        ? 'Completing...'
                        : allDone
                        ? 'Complete Job & Claim Payout'
                        : `Complete ${totalCount - completedCount} more checklist item(s)`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}