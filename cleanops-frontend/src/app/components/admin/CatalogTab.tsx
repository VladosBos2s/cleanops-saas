'use client';

import React, { useState } from 'react';
import { CheckSquare, Clock, Layers, Plus, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { AddonService, ServiceType } from '@/types/cleanops';

interface CatalogTabProps {
  services: ServiceType[];
  addons: AddonService[];
  currency: string;
  onRefresh: () => Promise<void>;
}

export default function CatalogTab({
  services,
  addons,
  currency,
  onRefresh,
}: CatalogTabProps) {
  // New service tier form
  const [serviceName, setServiceName] = useState('');
  const [basePrice, setBasePrice] = useState('70');
  const [pricePerSqm, setPricePerSqm] = useState('0.9');
  const [estimatedMinutes, setEstimatedMinutes] = useState('150');
  const [checklistText, setChecklistText] = useState(
    'Dust all surfaces\nVacuum & mop floors\nSanitize bathroom\nWipe kitchen counters'
  );

  // New add-on form
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('25');
  const [addonMinutes, setAddonMinutes] = useState('30');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const defaultChecklist = checklistText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      await apiRequest('/catalog/services', {
        method: 'POST',
        body: JSON.stringify({
          name: serviceName.trim(),
          basePrice: Number(basePrice),
          pricePerSqm: Number(pricePerSqm),
          estimatedMinutes: Number(estimatedMinutes),
          defaultChecklist,
        }),
      });

      setServiceName('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAddon(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiRequest('/catalog/addons', {
        method: 'POST',
        body: JSON.stringify({
          name: addonName.trim(),
          price: Number(addonPrice),
          extraMinutes: Number(addonMinutes),
        }),
      });

      setAddonName('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create add-on');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Service Tiers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            New Service Tier
          </h2>

          <form onSubmit={handleCreateService} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tier Name</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Move-In / Move-Out Clean"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Base ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Per m²</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={pricePerSqm}
                  onChange={(e) => setPricePerSqm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Minutes</label>
                <input
                  type="number"
                  required
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Checklist Template (one task per line)
              </label>
              <textarea
                rows={4}
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
            >
              Add Service Tier
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {services.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-white text-sm sm:text-base">{s.name}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-semibold">
                    {s.basePrice} {currency} + {s.pricePerSqm}/m²
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {s.estimatedMinutes} min
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Auto-generated Checklist ({s.defaultChecklist.length} items)
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                  {s.defaultChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add-on Services Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-800">
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            New Add-on Extra
          </h2>

          <form onSubmit={handleCreateAddon} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Add-on Name</label>
              <input
                type="text"
                required
                value={addonName}
                onChange={(e) => setAddonName(e.target.value)}
                placeholder="Inside Fridge Sanitization"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Price ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Extra Minutes</label>
                <input
                  type="number"
                  required
                  value={addonMinutes}
                  onChange={(e) => setAddonMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition cursor-pointer"
            >
              Add Extra Option
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-sm text-white">{addon.name}</div>
                <div className="text-xs text-slate-400">+{addon.extraMinutes} min</div>
              </div>
              <div className="text-sm font-bold text-sky-400">
                +{addon.price} {currency}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}