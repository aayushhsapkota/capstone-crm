import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const where = unreadOnly === 'true' ? { read: false } : {};

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      include: { business: { select: { id: true, name: true } } },
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read — { ids: [...] } or { all: true }
router.patch('/read', async (req, res, next) => {
  try {
    const { ids, all } = req.body;

    if (all) {
      await prisma.notification.updateMany({ data: { read: true } });
    } else if (ids?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { read: true },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
