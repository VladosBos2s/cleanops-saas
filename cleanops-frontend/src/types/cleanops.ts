export type BookingStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID';

export interface AnalyticsSummary {
  totalRevenue: number;
  totalPayouts: number;
  netMargin: number;
  activeJobs: number;
  completedJobs: number;
  unpaidAmount: number;
}

export interface ServiceType {
  id: string;
  name: string;
  basePrice: number;
  pricePerSqm: number;
  estimatedMinutes: number;
  defaultChecklist: string[];
}

export interface AddonService {
  id: string;
  name: string;
  price: number;
  extraMinutes: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  accessNotes: string | null;
  _count?: { bookings: number };
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLEANER';
  commissionRate: number;
  isActive: boolean;
  needsPasswordSetup: boolean;
  completedJobs: number;
  totalEarned: number;
}

export interface BookingChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface BookingAddon {
  id: string;
  priceAtBooking: number;
  addonService: AddonService;
}

export interface Booking {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  areaSqm: number;
  totalPrice: number;
  cleanerPayout: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  customer: Customer;
  cleaner: { id: string; name: string; email?: string } | null;
  serviceType: ServiceType;
  addons: BookingAddon[];
  checklist: BookingChecklistItem[];
}

export interface QuoteResponse {
  totalPrice: number;
  totalMinutes: number;
  breakdown: {
    basePrice: number;
    areaCost: number;
    addonsCost: number;
  };
}