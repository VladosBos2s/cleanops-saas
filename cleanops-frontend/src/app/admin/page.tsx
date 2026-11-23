'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarCheck2,
  DollarSign,
  Layers,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { apiRequest, AuthUser, clearSession, getStoredUser, getToken } from '@/lib/api';
import {
  AddonService,
  AnalyticsSummary,
  Booking,
  Customer,
  ServiceType,
  StaffMember,
} from '@/types/cleanops';
import BookingsTab from '../components/admin/BookingsTab';
import CustomersTab from '../components/admin/CustomersTab';
import CatalogTab from '../components/admin/CatalogTab';
import StaffTab from '../components/admin/StaffTab';

type Tab = 'bookings' | 'customers' | 'catalog' | 'staff';

export default function AdminWorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('bookings');

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [addons, setAddons] = useState<AddonService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const [summaryRes, bookingsRes, customersRes, catalogRes, staffRes] = await Promise.all([
        apiRequest<AnalyticsSummary>('/bookings/analytics/summary'),
        apiRequest<Booking[]>('/bookings'),
        apiRequest<Customer[]>('/customers'),
        apiRequest<{ services: ServiceType[]; addons: AddonService[] }>('/catalog'),
        apiRequest<StaffMember[]>('/staff'),
      ]);

      setAnalytics(summaryRes);
      setBookings(bookingsRes);
      setCustomers(customersRes);
      setServices(catalogRes.services);
      setAddons(catalogRes.addons);
      setStaff(staffRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data');
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

    if (stored.role !== 'ADMIN') {
      router.replace('/cleaner');
      return;
    }

    setUser(stored);
    loadAllData();
  }, [router, loadAllData]);

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading dispatch control center...
      </div>
    );
  }

  const currency = user.currency || 'USD';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top navigation bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white text-sm sm:text-base">
                  {user.organizationName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  DISPATCHER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {user.name} · {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => loadAllData(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Executive KPI Cards */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white mt-1.5">
                {analytics.totalRevenue.toFixed(2)} {currency}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Net Margin</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1.5">
                {analytics.netMargin.toFixed(2)} {currency}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Crew Payouts</span>
                <Wallet className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-lg font-bold text-white mt-1.5">
                {analytics.totalPayouts.toFixed(2)} {currency}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Unpaid Invoices</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-300 mt-1.5">
                {analytics.unpaidAmount.toFixed(2)} {currency}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Jobs</span>
                <CalendarCheck2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-white mt-1.5">{analytics.activeJobs}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Completed</span>
                <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white mt-1.5">{analytics.completedJobs}</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            Bookings & Dispatch ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Customers ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Services & Add-ons ({services.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff & Onboarding ({staff.length})
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            customers={customers}
            services={services}
            addons={addons}
            staff={staff}
            currency={currency}
            onRefresh={() => loadAllData(true)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab customers={customers} onRefresh={() => loadAllData(true)} />
        )}

        {activeTab === 'catalog' && (
          <CatalogTab
            services={services}
            addons={addons}
            currency={currency}
            onRefresh={() => loadAllData(true)}
          />
        )}

        {activeTab === 'staff' && (
          <StaffTab
            staff={staff}
            currentUserId={user.id}
            currency={currency}
            onRefresh={() => loadAllData(true)}
          />
        )}
      </main>
    </div>
  );
}