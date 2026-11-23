'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Calculator,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Plus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import {
  AddonService,
  Booking,
  Customer,
  QuoteResponse,
  ServiceType,
  StaffMember,
} from '@/types/cleanops';

interface BookingsTabProps {
  bookings: Booking[];
  customers: Customer[];
  services: ServiceType[];
  addons: AddonService[];
  staff: StaffMember[];
  currency: string;
  onRefresh: () => Promise<void>;
}

const STATUS_BADGES: Record<string, string> = {
  NEW: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ASSIGNED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  IN_PROGRESS: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default function BookingsTab({
  bookings,
  customers,
  services,
  addons,
  staff,
  currency,
  onRefresh,
}: BookingsTabProps) {
  const activeCleaners = staff.filter((m) => m.role === 'CLEANER' && m.isActive);

  // Booking creation form state
  const [customerId, setCustomerId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [cleanerId, setCleanerId] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [areaSqm, setAreaSqm] = useState('75');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize default selections once data loads
  useEffect(() => {
    if (!customerId && customers.length > 0) setCustomerId(customers[0].id);
    if (!serviceTypeId && services.length > 0) setServiceTypeId(services[0].id);
    if (!scheduledStart) {
      const nextHour = new Date(Date.now() + 2 * 60 * 60 * 1000);
      nextHour.setMinutes(0, 0, 0);
      const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledStart(localIso);
    }
  }, [customers, services, customerId, serviceTypeId, scheduledStart]);

  // Live quote calculation whenever service, area, or add-ons change
  useEffect(() => {
    if (!serviceTypeId || !areaSqm || Number(areaSqm) <= 0) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<QuoteResponse>('/catalog/quote', {
          method: 'POST',
          body: JSON.stringify({
            serviceTypeId,
            areaSqm: Number(areaSqm),
            addonIds: selectedAddonIds,
          }),
        });
        setQuote(res);
      } catch {
        setQuote(null);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [serviceTypeId, areaSqm, selectedAddonIds]);

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          cleanerId: cleanerId || undefined,
          serviceTypeId,
          scheduledStart: new Date(scheduledStart).toISOString(),
          areaSqm: Number(areaSqm),
          addonIds: selectedAddonIds,
          notes: notes.trim() || undefined,
        }),
      });

      setSelectedAddonIds([]);
      setNotes('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignCleaner(bookingId: string, newCleanerId: string) {
    if (!newCleanerId) return;
    setError(null);
    setActionLoadingId(bookingId);
    try {
      await apiRequest(`/bookings/${bookingId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ cleanerId: newCleanerId }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign cleaner');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleTogglePaid(booking: Booking) {
    setError(null);
    setActionLoadingId(booking.id);
    try {
      const nextPayment = booking.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID';
      await apiRequest(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: nextPayment }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setError(null);
    setActionLoadingId(bookingId);
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: New Booking & Live Quote Calculator */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Schedule Cleaning Job
          </h2>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            Auto-Quote
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateBooking} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Customer</label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.address}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Tier</label>
              <select
                required
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.basePrice} + {s.pricePerSqm}/m²)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Area (m²)</label>
              <input
                type="number"
                min={10}
                max={2000}
                required
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Assign Cleaner (Optional)
              </label>
              <select
                value={cleanerId}
                onChange={(e) => setCleanerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Leave Unassigned (NEW) --</option>
                {activeCleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({Math.round(c.commissionRate * 100)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addons.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Add-on Extras</label>
              <div className="flex flex-wrap gap-2">
                {addons.map((addon) => {
                  const selected = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
                        selected
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      + {addon.name} ({addon.price} {currency})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Dispatch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special equipment, parking, or client request..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Live Price & Duration Preview */}
          {quote && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/25 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Base {quote.breakdown.basePrice} + Area {quote.breakdown.areaCost} + Add-ons{' '}
                  {quote.breakdown.addonsCost}
                </span>
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />~{quote.totalMinutes} min
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-300">Calculated Quote</span>
                <span className="text-base font-bold text-emerald-400">
                  {quote.totalPrice.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || customers.length === 0 || services.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
          >
            {submitting ? 'Scheduling...' : 'Create Booking'}
          </button>
        </form>
      </div>

      {/* Right: Dispatch Board */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Dispatch Queue ({bookings.length})
          </h2>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
            No bookings scheduled yet. Create your first job on the left.
          </div>
        ) : (
          bookings.map((b) => {
            const completedItems = b.checklist.filter((i) => i.isCompleted).length;
            const totalItems = b.checklist.length;
            const isBusy = actionLoadingId === b.id;

            return (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white text-sm sm:text-base">
                        {b.customer.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                          STATUS_BADGES[b.status] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {b.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          b.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.customer.address}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm sm:text-base font-bold text-white">
                      {b.totalPrice.toFixed(2)} {currency}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Payout: {b.cleanerPayout.toFixed(2)} {currency}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80">
                  <span className="font-medium text-emerald-400">
                    {b.serviceType.name} ({b.areaSqm} m²)
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(b.scheduledStart).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    Checklist: {completedItems}/{totalItems}
                  </span>
                </div>

                {b.notes && (
                  <p className="text-xs text-slate-400 italic">Note: {b.notes}</p>
                )}

                {/* Dispatcher actions */}
                {b.status !== 'CANCELLED' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        disabled={isBusy || b.status === 'COMPLETED'}
                        value={b.cleaner?.id || ''}
                        onChange={(e) => handleAssignCleaner(b.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>
                          Assign cleaner...
                        </option>
                        {activeCleaners.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({Math.round(c.commissionRate * 100)}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTogglePaid(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        {b.paymentStatus === 'PAID' ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>

                      {b.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleCancelBooking(b.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-300 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}