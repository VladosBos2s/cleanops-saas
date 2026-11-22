import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth';

const router = Router();

// List all staff members with completed jobs, payout totals, and onboarding status (Admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const staff = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        commissionRate: true,
        isActive: true,
        passwordHash: true,
        createdAt: true,
        assignedBookings: {
          where: { status: 'COMPLETED' },
          select: { cleanerPayout: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = staff.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      commissionRate: member.commissionRate,
      isActive: member.isActive,
      needsPasswordSetup: !member.passwordHash,
      completedJobs: member.assignedBookings.length,
      totalEarned: Number(
        member.assignedBookings.reduce((sum, b) => sum + b.cleanerPayout, 0).toFixed(2)
      ),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ error: 'Failed to load staff' });
  }
});

// Add a new cleaner without requiring an initial password (Admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, commissionRate } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const rate = commissionRate != null ? Number(commissionRate) : 0.5;

    const cleaner = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'CLEANER',
        commissionRate: rate,
        organizationId: req.user!.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        commissionRate: true,
        isActive: true,
      },
    });

    res.status(201).json({
      ...cleaner,
      needsPasswordSetup: !passwordHash,
    });
  } catch (error) {
    console.error('Create cleaner error:', error);
    res.status(500).json({ error: 'Failed to add cleaner' });
  }
});

// Activate or deactivate a staff member (Admin only)
router.patch('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const organizationId = req.user!.organizationId;

    const member = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (member.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const updated = await prisma.user.update({
      where: { id: member.id },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, isActive: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update staff status error:', error);
    res.status(500).json({ error: 'Failed to update staff status' });
  }
});

// Delete a staff member safely while preserving historical booking records (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const member = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (member.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Prevent deleting a cleaner who has active or assigned upcoming jobs
    const activeJobsCount = await prisma.booking.count({
      where: {
        organizationId,
        cleanerId: member.id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    if (activeJobsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete staff member with ${activeJobsCount} active or assigned booking(s). Reassign them first.`,
      });
    }

    // Unlink historical bookings and delete the user in a single transaction
    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { cleanerId: member.id, organizationId },
        data: { cleanerId: null },
      }),
      prisma.user.delete({
        where: { id: member.id },
      }),
    ]);

    res.json({ deleted: true, id: member.id });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

export default router;