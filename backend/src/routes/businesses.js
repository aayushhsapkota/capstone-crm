import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/businesses
router.get('/', async (req, res, next) => {
  try {
    const { status, unsubscribed, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (unsubscribed !== undefined) where.unsubscribed = unsubscribed === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.business.count({ where }),
    ]);

    res.json({ businesses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id
router.get('/:id', async (req, res, next) => {
  try {
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        emails: { orderBy: { sentAt: 'asc' } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    res.json(business);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/businesses/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { customAttrs, ...rest } = req.body;

    let mergedAttrs;
    if (customAttrs !== undefined) {
      const existing = await prisma.business.findUnique({
        where: { id: req.params.id },
        select: { customAttrs: true },
      });
      mergedAttrs = { ...(existing?.customAttrs ?? {}), ...customAttrs };
    }

    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(mergedAttrs !== undefined && { customAttrs: mergedAttrs }),
      },
    });
    res.json(business);
  } catch (err) {
    next(err);
  }
});

export default router;
