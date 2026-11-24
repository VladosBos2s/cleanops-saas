import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth';

const router = Router();

// Admin financial & operations KPI summary
router.get('/analytics/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const bookings = await prisma.booking.findMany({
      where: { organizationId, status: { not: 'CANCELLED' } },
      select: {
        totalPrice: true,
        cleanerPayout: true,
        status: true,
        paymentStatus: true,
      },
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalPayouts = bookings.reduce((sum, b) => sum + b.cleanerPayout, 0);
    const netMargin = totalRevenue - totalPayouts;
    const activeJobs = bookings.filter((b) => ['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status)).length;
    const completedJobs = bookings.filter((b) => b.status === 'COMPLETED').length;
    const unpaidAmount = bookings
      .filter((b) => b.paymentStatus === 'UNPAID')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    res.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalPayouts: Number(totalPayouts.toFixed(2)),
      netMargin: Number(netMargin.toFixed(2)),
      activeJobs,
      completedJobs,
      unpaidAmount: Number(unpaidAmount.toFixed(2)),
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// List bookings (Admin sees all org bookings; Cleaner sees only assigned jobs)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const { organizationId, role, userId } = req.user!;

    const bookings = await prisma.booking.findMany({
      where: {
        organizationId,
        ...(role === 'CLEANER' ? { cleanerId: userId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        customer: true,
        cleaner: { select: { id: true, name: true, email: true } },
        serviceType: true,
        addons: { include: { addonService: true } },
        checklist: { orderBy: { id: 'asc' } },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// Create a new booking with automatic pricing, conflict check, and checklist generation
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      cleanerId,
      serviceTypeId,
      scheduledStart,
      areaSqm,
      addonIds = [],
      notes,
    } = req.body;
    const organizationId = req.user!.organizationId;

    if (!customerId || !serviceTypeId || !scheduledStart || !areaSqm) {
      return res.status(400).json({ error: 'customerId, serviceTypeId, scheduledStart, and areaSqm are required' });
    }

    const [customer, service] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, organizationId } }),
      prisma.serviceType.findFirst({ where: { id: serviceTypeId, organizationId } }),
    ]);

    if (!customer || !service) {
      return res.status(404).json({ error: 'Customer or service type not found' });
    }

    const addons = addonIds.length
      ? await prisma.addonService.findMany({
          where: { id: { in: addonIds }, organizationId },
        })
      : [];

    const start = new Date(scheduledStart);
    const totalMinutes =
      service.estimatedMinutes + addons.reduce((sum, a) => sum + a.extraMinutes, 0);
    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = Number(
      (service.basePrice + Number(areaSqm) * service.pricePerSqm + addonsPrice).toFixed(2)
    );

    let cleanerPayout = 0;
    if (cleanerId) {
      const cleaner = await prisma.user.findFirst({
        where: { id: cleanerId, organizationId, role: 'CLEANER', isActive: true },
      });
      if (!cleaner) {
        return res.status(404).json({ error: 'Assigned cleaner not found or inactive' });
      }

      // Check for overlapping bookings for the same cleaner
      const conflict = await prisma.booking.findFirst({
        where: {
          organizationId,
          cleanerId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          AND: [
            { scheduledStart: { lt: end } },
            { scheduledEnd: { gt: start } },
          ],
        },
      });

      if (conflict) {
        return res.status(409).json({
          error: 'Schedule conflict: Cleaner already has an overlapping booking during this window',
        });
      }

      cleanerPayout = Number((totalPrice * cleaner.commissionRate).toFixed(2));
    }

    const booking = await prisma.booking.create({
      data: {
        organizationId,
        customerId,
        cleanerId: cleanerId || null,
        serviceTypeId,
        scheduledStart: start,
        scheduledEnd: end,
        areaSqm: Number(areaSqm),
        totalPrice,
        cleanerPayout,
        status: cleanerId ? 'ASSIGNED' : 'NEW',
        notes: notes || null,
        addons: {
          create: addons.map((addon) => ({
            addonServiceId: addon.id,
            priceAtBooking: addon.price,
          })),
        },
        checklist: {
          create: service.defaultChecklist.map((title) => ({
            title,
            isCompleted: false,
          })),
        },
      },
      include: {
        customer: true,
        cleaner: { select: { id: true, name: true } },
        serviceType: true,
        addons: { include: { addonService: true } },
        checklist: true,
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Assign or reassign a cleaner to an existing booking (Admin only)
router.patch('/:id/assign', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { cleanerId } = req.body;
    const organizationId = req.user!.organizationId;

    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.id), organizationId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const cleaner = await prisma.user.findFirst({
      where: { id: cleanerId, organizationId, role: 'CLEANER', isActive: true },
    });

    if (!cleaner) {
      return res.status(404).json({ error: 'Cleaner not found or inactive' });
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        organizationId,
        cleanerId,
        id: { not: booking.id },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        AND: [
          { scheduledStart: { lt: booking.scheduledEnd } },
          { scheduledEnd: { gt: booking.scheduledStart } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ error: 'Schedule conflict for this cleaner' });
    }

    const cleanerPayout = Number((booking.totalPrice * cleaner.commissionRate).toFixed(2));

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        cleanerId: cleaner.id,
        cleanerPayout,
        status: booking.status === 'NEW' ? 'ASSIGNED' : booking.status,
      },
      include: {
        customer: true,
        cleaner: { select: { id: true, name: true } },
        serviceType: true,
        checklist: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Assign cleaner error:', error);
    res.status(500).json({ error: 'Failed to assign cleaner' });
  }
});

// Toggle individual checklist item completion (Admin or assigned Cleaner)
router.patch('/:id/checklist/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { isCompleted } = req.body;
    const { organizationId, role, userId } = req.user!;

    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.id), organizationId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (role === 'CLEANER' && booking.cleanerId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Not assigned to this booking' });
    }

    const updatedItem = await prisma.bookingChecklistItem.update({
      where: { id: String(req.params.itemId) },
      data: { isCompleted: Boolean(isCompleted) },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Checklist toggle error:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Update booking status & payment status (enforces 100% checklist completion before COMPLETED)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentStatus } = req.body;
    const { organizationId, role, userId } = req.user!;

    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.id), organizationId },
      include: { checklist: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (role === 'CLEANER' && booking.cleanerId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Not assigned to this booking' });
    }

    if (status === 'COMPLETED') {
      const incompleteCount = booking.checklist.filter((item) => !item.isCompleted).length;
      if (incompleteCount > 0) {
        return res.status(400).json({
          error: `Cannot complete booking: ${incompleteCount} checklist item(s) still remaining`,
        });
      }
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus && role === 'ADMIN' ? { paymentStatus } : {}),
      },
      include: {
        customer: true,
        cleaner: { select: { id: true, name: true } },
        serviceType: true,
        checklist: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

export default router;