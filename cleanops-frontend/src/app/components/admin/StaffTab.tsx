'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Power,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { StaffMember } from '@/types/cleanops';

interface StaffTabProps {
  staff: StaffMember[];
  currentUserId: string;
  currency: string;
  onRefresh: () => Promise<void>;
}

export default function StaffTab({
  staff,
  currentUserId,
  currency,
  onRefresh,
}: StaffTabProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('50');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddCleaner(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const rate = Math.min(1, Math.max(0, Number(commissionPercent) / 100));
      await apiRequest('/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          commissionRate: rate,
        }),
      });

      setName('');
      setEmail('');
      setCommissionPercent('50');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cleaner');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(member: StaffMember) {
    setError(null);
    setBusyId(member.id);
    try {
      await apiRequest(`/staff/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteMember(member: StaffMember) {
    if (
      !window.confirm(
        `Remove ${member.name} (${member.email}) from the organization? Completed booking history will be preserved.`
      )
    ) {
      return;
    }

    setError(null);
    setBusyId(member.id);
    try {
      await apiRequest(`/staff/${member.id}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Onboard Cleaner without Password */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Onboard Cleaner
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            No temporary password needed — the cleaner creates their own password on first sign-in.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAddCleaner} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lucas Bennett"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lucas@cleanops.io"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cleaner Payout Share (%)
            </label>
            <input
              type="number"
              min={10}
              max={90}
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
          >
            {submitting ? 'Creating account...' : 'Create Cleaner Account'}
          </button>
        </form>
      </div>

      {/* Right: Team Roster */}
      <div className="lg:col-span-8 space-y-3">
        {staff.map((member) => {
          const isSelf = member.id === currentUserId;
          const isBusy = busyId === member.id;

          return (
            <div
              key={member.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white text-sm sm:text-base">
                    {member.name}
                  </span>

                  {member.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[11px] font-medium">
                      <UserCheck className="w-3 h-3" />
                      CLEANER ({Math.round(member.commissionRate * 100)}%)
                    </span>
                  )}

                  {member.needsPasswordSetup && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                      <KeyRound className="w-3 h-3" />
                      Awaiting 1st-login password setup
                    </span>
                  )}

                  {!member.isActive && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 text-[11px] font-medium">
                      INACTIVE
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400">
                  {member.email}
                  {member.role === 'CLEANER' && (
                    <>
                      {' · '}Completed jobs:{' '}
                      <span className="text-slate-200 font-medium">{member.completedJobs}</span>
                      {' · '}Total earned:{' '}
                      <span className="text-emerald-400 font-medium">
                        {member.totalEarned.toFixed(2)} {currency}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {!isSelf && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleStatus(member)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5 text-amber-400" />
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeleteMember(member)}
                    title="Delete staff member"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}