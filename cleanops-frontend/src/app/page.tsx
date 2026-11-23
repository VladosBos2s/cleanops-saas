'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { apiRequest, getDashboardPath, getStoredUser, getToken } from '@/lib/api';
import { AddonService, ServiceType } from '@/types/cleanops';

interface PublicCatalogResponse {
  organization: {
    id: string;
    name: string;
    currency: string;
  };
  services: ServiceType[];
  addons: AddonService[];
}

interface BookingConfirmation {
  bookingId: string;
  status: string;
  totalPrice: number;
  currency: string;
  scheduledStart: string;
  scheduledEnd: string;
  serviceName: string;
}

export default function PublicStorefrontPage() {
  const [org, setOrg] = useState<{ id: string; name: string; currency: string } | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [addons, setAddons] = useState<AddonService[]>([]);
  const [portalHref, setPortalHref] = useState('/login');
  const [portalLabel, setPortalLabel] = useState('Staff & Admin Portal');

  // Booking & calculator state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [areaSqm, setAreaSqm] = useState('75');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [scheduledStart, setScheduledStart] = useState('');

  // Client contact & property state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      setPortalHref(getDashboardPath(user.role));
      setPortalLabel(`Open ${user.role === 'ADMIN' ? 'Dispatch' : 'Cleaner'} Workspace`);
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledStart(localIso);

    apiRequest<PublicCatalogResponse>('/public/catalog')
      .then((data) => {
        setOrg(data.organization);
        setServices(data.services);
        setAddons(data.addons);
        if (data.services.length > 0) {
          setSelectedServiceId(data.services[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load service catalog');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0] || null,
    [services, selectedServiceId]
  );

  const liveEstimate = useMemo(() => {
    if (!selectedService) return { totalPrice: 0, totalMinutes: 0, areaCost: 0, addonsCost: 0 };
    const area = Math.max(10, Number(areaSqm) || 0);
    const chosenAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
    const areaCost = Number((area * selectedService.pricePerSqm).toFixed(2));
    const addonsCost = chosenAddons.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = Number((selectedService.basePrice + areaCost + addonsCost).toFixed(2));
    const totalMinutes =
      selectedService.estimatedMinutes +
      chosenAddons.reduce((sum, a) => sum + a.extraMinutes, 0);

    return { totalPrice, totalMinutes, areaCost, addonsCost };
  }, [selectedService, areaSqm, addons, selectedAddonIds]);

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectServiceCard(serviceId: string) {
    setSelectedServiceId(serviceId);
    setConfirmation(null);
    const el = document.getElementById('book-now');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await apiRequest<BookingConfirmation>('/public/bookings', {
        method: 'POST',
        body: JSON.stringify({
          orgId: org?.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          accessNotes: accessNotes.trim() || undefined,
          serviceTypeId: selectedService.id,
          areaSqm: Number(areaSqm),
          addonIds: selectedAddonIds,
          scheduledStart: new Date(scheduledStart).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      setConfirmation(res);
      setSelectedAddonIds([]);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  }

  const currency = org?.currency || 'USD';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base sm:text-lg tracking-tight">
                {org?.name || 'SparklePro Cleaning'}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                Powered by CleanOps
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="hidden md:inline-block text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Pricing & Checklists
            </a>
            <a
              href="#book-now"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition"
            >
              Instant Quote
            </a>
            <Link
              href={portalHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {portalLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-14">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Star className="w-3.5 h-3.5" />
            Transparent Square-Meter Pricing · Verified Room Checklists
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Spotless Residential & Commercial Cleaning,{' '}
            <span className="text-emerald-400">Booked in 60 Seconds.</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Calculate your exact price upfront based on property size, customize add-on tasks, and
            schedule background-checked specialists who follow a strict quality checklist on every
            visit.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#book-now"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
            >
              Calculate & Book Online
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-sm transition"
            >
              Compare Service Packages
            </a>
          </div>
        </div>
      </section>

      {/* Dynamic Service Packages & Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-10 border-t border-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Service Packages & Rates</h2>
            <p className="text-sm text-slate-400 mt-1">
              Every booking includes eco-safe supplies and a mandatory room-by-room completion
              checklist.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-400 py-8">Loading live service rates...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, index) => {
              const isFeatured = index === 1;
              return (
                <div
                  key={service.id}
                  className={`rounded-2xl p-6 flex flex-col justify-between border transition ${
                    isFeatured
                      ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-white">{service.name}</h3>
                      {isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-white">
                        {service.basePrice} {currency}
                      </span>
                      <span className="text-xs text-slate-400">
                        + {service.pricePerSqm} {currency} / m²
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Base duration: ~{service.estimatedMinutes} min
                    </div>

                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Included Quality Checklist
                      </div>
                      <ul className="space-y-2">
                        {service.defaultChecklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectServiceCard(service.id)}
                    className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      isFeatured
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    Select {service.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Self-Service Calculator & Online Booking Form */}
      <section id="book-now" className="max-w-6xl mx-auto px-4 py-12 border-t border-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Estimator */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">1. Customize Your Cleaning</h2>
              <p className="text-xs text-slate-400 mt-1">
                Adjust property area and optional extras to see your exact instant quote.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Service Package
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setConfirmation(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.basePrice} {currency} + {s.pricePerSqm}/m²)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Property Area (m²)</label>
                <span className="text-xs font-semibold text-emerald-400">{areaSqm} m²</span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={5}
                value={areaSqm}
                onChange={(e) => {
                  setAreaSqm(e.target.value);
                  setConfirmation(null);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>20 m² (Studio)</span>
                <span>120 m² (House)</span>
                <span>300 m² (Office)</span>
              </div>
            </div>

            {addons.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Optional Add-ons
                </label>
                <div className="space-y-2">
                  {addons.map((addon) => {
                    const checked = selectedAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          toggleAddon(addon.id);
                          setConfirmation(null);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-medium">{addon.name}</div>
                          <div className="text-[11px] text-slate-400">+{addon.extraMinutes} min</div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400">
                          +{addon.price} {currency}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Breakdown Box */}
            {selectedService && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Base service fee</span>
                  <span>
                    {selectedService.basePrice.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    Area ({areaSqm} m² × {selectedService.pricePerSqm} {currency})
                  </span>
                  <span>
                    {liveEstimate.areaCost.toFixed(2)} {currency}
                  </span>
                </div>
                {liveEstimate.addonsCost > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Selected add-ons</span>
                    <span>
                      {liveEstimate.addonsCost.toFixed(2)} {currency}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-300">Total Estimate</div>
                    <div className="text-[11px] text-slate-500">
                      Est. duration: ~{liveEstimate.totalMinutes} min
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {liveEstimate.totalPrice.toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Customer Details & Instant Reservation */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            {confirmation ? (
              <div className="py-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Reservation Confirmed (#{confirmation.bookingId.slice(-6).toUpperCase()})
                </div>

                <h3 className="text-2xl font-bold text-white">
                  Your cleaning request has been sent to dispatch!
                </h3>

                <p className="text-sm text-slate-400 leading-relaxed">
                  Our coordinator has received your booking for{' '}
                  <span className="text-white font-medium">{confirmation.serviceName}</span> and
                  will assign a specialist shortly. You can also inspect this live order right now
                  inside the{' '}
                  <Link href="/login" className="text-emerald-400 underline">
                    Dispatcher Admin Portal
                  </Link>
                  .
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Scheduled Window</span>
                    <span className="text-slate-200 font-medium">
                      {new Date(confirmation.scheduledStart).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Locked Quote</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {confirmation.totalPrice.toFixed(2)} {confirmation.currency}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Book Another Cleaning
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">2. Complete Your Reservation</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    No prepayment required online — pay after the checklist is completed.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Hannah Abbott"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 390-1184"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email (for receipt)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hannah@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Preferred Date & Time *
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        required
                        value={scheduledStart}
                        onChange={(e) => setScheduledStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Service Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="450 Maple Avenue, Apt 9C"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Entry / Access Instructions
                    </label>
                    <input
                      type="text"
                      value={accessNotes}
                      onChange={(e) => setAccessNotes(e.target.value)}
                      placeholder="Intercom #2204, cat inside"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Additional Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Focus on kitchen & balcony"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedService}
                  className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  {submitting
                    ? 'Submitting Reservation...'
                    : `Confirm Booking (${liveEstimate.totalPrice.toFixed(2)} ${currency})`}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}