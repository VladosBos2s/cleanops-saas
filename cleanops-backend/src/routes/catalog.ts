import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get all service types and add-ons for the current organization
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const [services, addons] = await Promise.all([
      prisma.serviceType.findMany({
        where: { organizationId },
        orderBy: { basePrice: 'asc' },
      }),
      prisma.addonService.findMany({
        where: { organizationId },
        orderBy: { price: 'asc' },
      }),
    ]);

    res.json({ services, addons });
  } catch (error) {
    console.error('Fetch catalog error:', error);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

// Create a new service tier (Admin only)
router.post('/services', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, basePrice, pricePerSqm, estimatedMinutes, defaultChecklist } = req.body;

    if (!name || basePrice == null || pricePerSqm == null) {
      return res.status(400).json({ error: 'Name, basePrice, and pricePerSqm are required' });
    }

    const service = await prisma.serviceType.create({
      data: {
        name,
        basePrice: Number(basePrice),
        pricePerSqm: Number(pricePerSqm),
        estimatedMinutes: Number(estimatedMinutes) || 120,
        defaultChecklist: Array.isArray(defaultChecklist) ? defaultChecklist : [],
        organizationId: req.user!.organizationId,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Create a new add-on service (Admin only)
router.post('/addons', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, extraMinutes } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const addon = await prisma.addonService.create({
      data: {
        name,
        price: Number(price),
        extraMinutes: Number(extraMinutes) || 30,
        organizationId: req.user!.organizationId,
      },
    });

    res.status(201).json(addon);
  } catch (error) {
    console.error('Create addon error:', error);
    res.status(500).json({ error: 'Failed to create add-on' });
  }
});

// Live pricing & duration calculator
router.post('/quote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceTypeId, areaSqm, addonIds = [] } = req.body;
    const organizationId = req.user!.organizationId;

    const service = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, organizationId },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service type not found' });
    }

    const addons = addonIds.length
      ? await prisma.addonService.findMany({
          where: { id: { in: addonIds }, organizationId },
        })
      : [];

    const area = Math.max(0, Number(areaSqm) || 0);
    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const addonsMinutes = addons.reduce((sum, a) => sum + a.extraMinutes, 0);

    const totalPrice = Number((service.basePrice + area * service.pricePerSqm + addonsPrice).toFixed(2));
    const totalMinutes = service.estimatedMinutes + addonsMinutes;

    res.json({
      totalPrice,
      totalMinutes,
      breakdown: {
        basePrice: service.basePrice,
        areaCost: Number((area * service.pricePerSqm).toFixed(2)),
        addonsCost: addonsPrice,
      },
    });
  } catch (error) {
    console.error('Quote calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

export default router;