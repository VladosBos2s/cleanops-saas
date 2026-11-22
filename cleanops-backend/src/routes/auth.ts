import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cleanops-super-secret-key-2026';

// Register a new cleaning company (Multi-Tenant Onboarding)
router.post('/register-org', async (req, res: Response) => {
  try {
    const { organizationName, currency, adminName, email, password } = req.body;

    if (!organizationName || !adminName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          currency: currency || 'USD',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: adminName,
          passwordHash,
          role: 'ADMIN',
          organizationId: organization.id,
        },
      });

      return { organization, user };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        role: result.user.role,
        organizationId: result.organization.id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.organization.id,
        organizationName: result.organization.name,
      },
    });
  } catch (error) {
    console.error('Register org error:', error);
    res.status(500).json({ error: 'Failed to register organization' });
  }
});

// Sign in (ADMIN and CLEANER roles)
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    // Prompt first-time password setup if no password has been configured yet
    if (!user.passwordHash) {
      return res.status(200).json({
        requiresPasswordSetup: true,
        email: user.email,
        name: user.name,
      });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        commissionRate: user.commissionRate,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        currency: user.organization.currency,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Self-service password setup for newly onboarded cleaners
router.post('/setup-password', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 4) {
      return res.status(400).json({ error: 'Email and a password (min 4 characters) are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    if (user.passwordHash) {
      return res.status(400).json({ error: 'Password is already set. Please sign in normally.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        commissionRate: user.commissionRate,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        currency: user.organization.currency,
      },
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Get current authenticated user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      commissionRate: user.commissionRate,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      currency: user.organization.currency,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;