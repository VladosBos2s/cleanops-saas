import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CleanOps database...');

  // Clean existing demo data in safe dependency order
  await prisma.bookingChecklistItem.deleteMany();
  await prisma.bookingAddon.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.addonService.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create primary demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'SparklePro Cleaning Co.',
      currency: 'USD',
    },
  });

  // 2. Create Admin & Cleaners
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cleanerPassword = await bcrypt.hash('1234', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cleanops.io',
      name: 'Elena Rostova',
      passwordHash: adminPassword,
      role: 'ADMIN',
      commissionRate: 0,
      organizationId: org.id,
    },
  });

  const cleaner1 = await prisma.user.create({
    data: {
      email: 'maria@cleanops.io',
      name: 'Maria Kowalska',
      passwordHash: cleanerPassword,
      role: 'CLEANER',
      commissionRate: 0.55,
      organizationId: org.id,
    },
  });

  const cleaner2 = await prisma.user.create({
    data: {
      email: 'david@cleanops.io',
      name: 'David Miller',
      passwordHash: cleanerPassword,
      role: 'CLEANER',
      commissionRate: 0.5,
      organizationId: org.id,
    },
  });

  // 3. Create Service Tiers & Add-on Services
  const standardClean = await prisma.serviceType.create({
    data: {
      name: 'Standard Maintenance Clean',
      basePrice: 60,
      pricePerSqm: 0.8,
      estimatedMinutes: 120,
      defaultChecklist: [
        'Dust all accessible surfaces and furniture',
        'Vacuum carpets and mop hard floors',
        'Sanitize bathroom sink, toilet, and shower',
        'Wipe kitchen countertops and exterior appliances',
        'Empty all trash bins and replace liners',
      ],
      organizationId: org.id,
    },
  });

  const deepClean = await prisma.serviceType.create({
    data: {
      name: 'Deep Restoration Clean',
      basePrice: 110,
      pricePerSqm: 1.4,
      estimatedMinutes: 210,
      defaultChecklist: [
        'Degrease kitchen backsplash, range hood, and cabinets',
        'Descale bathroom tiles, grout, and glass shower doors',
        'Wipe all baseboards, door frames, and light switches',
        'Vacuum under furniture and clean interior window sills',
        'Sanitize high-touch surfaces and empty all bins',
      ],
      organizationId: org.id,
    },
  });

  const postConstruction = await prisma.serviceType.create({
    data: {
      name: 'Post-Construction Dust Removal',
      basePrice: 160,
      pricePerSqm: 2.1,
      estimatedMinutes: 270,
      defaultChecklist: [
        'HEPA vacuum fine construction dust from walls and ceilings',
        'Remove paint splatters and adhesive residue from floors',
        'Deep clean window tracks, frames, and glass panes',
        'Sanitize all newly installed fixtures and cabinetry',
      ],
      organizationId: org.id,
    },
  });

  const windowAddon = await prisma.addonService.create({
    data: {
      name: 'Interior Windows (up to 6)',
      price: 35,
      extraMinutes: 45,
      organizationId: org.id,
    },
  });

  const ovenAddon = await prisma.addonService.create({
    data: {
      name: 'Inside Oven & Range Deep Clean',
      price: 25,
      extraMinutes: 30,
      organizationId: org.id,
    },
  });

  // 4. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Marcus Vance',
      phone: '+1 (555) 234-8890',
      email: 'marcus.vance@example.com',
      address: '742 Evergreen Terrace, Apt 4B',
      accessNotes: 'Intercom code #4512. Friendly golden retriever inside.',
      organizationId: org.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Sophia Chen',
      phone: '+1 (555) 891-3302',
      email: 'sophia.chen@example.com',
      address: '1180 Harbor View Blvd, Suite 12',
      accessNotes: 'Concierge has spare key on file. Park in visitor spot #4.',
      organizationId: org.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Liam O’Connor',
      phone: '+1 (555) 402-7719',
      address: '89 Oakridge Lane',
      accessNotes: 'Smart lock code: 9081#. Focus extra attention on master bath.',
      organizationId: org.id,
    },
  });

  // 5. Create Sample Bookings (Completed, In-Progress, Assigned, New)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Completed booking (yesterday)
  await prisma.booking.create({
    data: {
      organizationId: org.id,
      customerId: customer1.id,
      cleanerId: cleaner1.id,
      serviceTypeId: standardClean.id,
      scheduledStart: yesterday,
      scheduledEnd: new Date(yesterday.getTime() + 120 * 60 * 1000),
      areaSqm: 75,
      totalPrice: 120,
      cleanerPayout: 66,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      notes: 'Regular bi-weekly client',
      checklist: {
        create: standardClean.defaultChecklist.map((title) => ({
          title,
          isCompleted: true,
        })),
      },
    },
  });

  // Active in-progress booking (today)
  await prisma.booking.create({
    data: {
      organizationId: org.id,
      customerId: customer2.id,
      cleanerId: cleaner1.id,
      serviceTypeId: deepClean.id,
      scheduledStart: new Date(now.getTime() - 30 * 60 * 1000),
      scheduledEnd: new Date(now.getTime() + 225 * 60 * 1000),
      areaSqm: 95,
      totalPrice: 278,
      cleanerPayout: 152.9,
      status: 'IN_PROGRESS',
      paymentStatus: 'UNPAID',
      notes: 'Include inside oven cleaning',
      addons: {
        create: [{ addonServiceId: ovenAddon.id, priceAtBooking: ovenAddon.price }],
      },
      checklist: {
        create: deepClean.defaultChecklist.map((title, idx) => ({
          title,
          isCompleted: idx < 2, // First 2 items already checked off
        })),
      },
    },
  });

  // Assigned upcoming booking (tomorrow)
  await prisma.booking.create({
    data: {
      organizationId: org.id,
      customerId: customer3.id,
      cleanerId: cleaner2.id,
      serviceTypeId: deepClean.id,
      scheduledStart: tomorrow,
      scheduledEnd: new Date(tomorrow.getTime() + 255 * 60 * 1000),
      areaSqm: 110,
      totalPrice: 299,
      cleanerPayout: 149.5,
      status: 'ASSIGNED',
      paymentStatus: 'UNPAID',
      addons: {
        create: [{ addonServiceId: windowAddon.id, priceAtBooking: windowAddon.price }],
      },
      checklist: {
        create: deepClean.defaultChecklist.map((title) => ({
          title,
          isCompleted: false,
        })),
      },
    },
  });

  // Unassigned new booking
  await prisma.booking.create({
    data: {
      organizationId: org.id,
      customerId: customer1.id,
      serviceTypeId: postConstruction.id,
      scheduledStart: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      scheduledEnd: new Date(tomorrow.getTime() + 8.5 * 60 * 60 * 1000),
      areaSqm: 120,
      totalPrice: 412,
      cleanerPayout: 0,
      status: 'NEW',
      paymentStatus: 'UNPAID',
      notes: 'New loft renovation — bring HEPA vacuum',
      checklist: {
        create: postConstruction.defaultChecklist.map((title) => ({
          title,
          isCompleted: false,
        })),
      },
    },
  });

  console.log('✅ Seed complete! Demo accounts:');
  console.log('   Admin:   admin@cleanops.io / admin123');
  console.log('   Cleaner: maria@cleanops.io / 1234');
  console.log('   Cleaner: david@cleanops.io / 1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });