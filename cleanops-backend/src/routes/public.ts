import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Helper to resolve target organization (by query/body orgId or fallback to primary demo org)
async function resolveOrganization(orgId?: string) {
  if (orgId) {
    const found = await prisma.organization.findUnique({ where: { id: orgId } });
    if (found) return found;
  }
  return prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
}

// Public storefront catalog (services, add-ons, and organization info without auth)
router.get('/catalog', async (req: Request, res: Response) => {
  try {
    const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : undefined;
    const organization = await resolveOrganization(orgId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization storefront not found' });
    }

    const [services, addons] = await Promise.all([
      prisma.serviceType.findMany({
        where: { organizationId: organization.id },
        orderBy: { basePrice: 'asc' },
      }),
      prisma.addonService.findMany({
        where: { organizationId: organization.id },
        orderBy: { price: 'asc' },
      }),
    ]);

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        currency: organization.currency,
      },
      services,
      addons,
    });
  } catch (error) {
    console.error('Public catalog error:', error);
    res.status(500).json({ error: 'Failed to load public catalog' });
  }
});

// Public self-service booking endpoint (creates/matches customer and drops NEW booking into dispatch)
router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const {
      orgId,
      name,
      phone,
      email,
      address,
      accessNotes,
      serviceTypeId,
      areaSqm,
      addonIds = [],
      scheduledStart,
      notes,
    } = req.body;

    if (!name || !phone || !address || !serviceTypeId || !areaSqm || !scheduledStart) {
      return res.status(400).json({
        error: 'Name, phone, address, serviceTypeId, areaSqm, and scheduledStart are required',
      });
    }

    const organization = await resolveOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const service = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, organizationId: organization.id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Selected service tier not found' });
    }

    const addons =
      Array.isArray(addonIds) && addonIds.length > 0
        ? await prisma.addonService.findMany({
            where: { id: { in: addonIds }, organizationId: organization.id },
          })
        : [];

    const area = Math.max(10, Number(areaSqm));
    const start = new Date(scheduledStart);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledStart date' });
    }

    const totalMinutes =
      service.estimatedMinutes + addons.reduce((sum, a) => sum + a.extraMinutes, 0);
    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = Number(
      (service.basePrice + area * service.pricePerSqm + addonsPrice).toFixed(2)
    );

    // Match existing customer by phone or email within the organization, or create a new one
    const booking = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({
        where: {
          organizationId: organization.id,
          OR: [
            { phone: phone.trim() },
            ...(email && email.trim() ? [{ email: email.trim() }] : []),
          ],
        },
      });

      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: name.trim(),
            address: address.trim(),
            ...(email && email.trim() ? { email: email.trim() } : {}),
            ...(accessNotes && accessNotes.trim() ? { accessNotes: accessNotes.trim() } : {}),
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            organizationId: organization.id,
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            address: address.trim(),
            accessNotes: accessNotes?.trim() || null,
          },
        });
      }

      return tx.booking.create({
        data: {
          organizationId: organization.id,
          customerId: customer.id,
          serviceTypeId: service.id,
          scheduledStart: start,
          scheduledEnd: end,
          areaSqm: area,
          totalPrice,
          cleanerPayout: 0,
          status: 'NEW',
          paymentStatus: 'UNPAID',
          notes: notes?.trim() || null,
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
          serviceType: true,
          addons: { include: { addonService: true } },
        },
      });
    });

    res.status(201).json({
      bookingId: booking.id,
      status: booking.status,
      totalPrice: booking.totalPrice,
      currency: organization.currency,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      serviceName: booking.serviceType.name,
    });
  } catch (error) {
    console.error('Public booking error:', error);
    res.status(500).json({ error: 'Failed to submit booking' });
  }
});

export default router;