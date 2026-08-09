import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/public/unsubscribe?businessId=... — clickable from an email, no auth (keyed on an unguessable UUID)
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const { businessId } = req.query;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return res.status(404).send('<h1>Business not found.</h1>');
    }

    await prisma.business.update({
      where: { id: businessId },
      data: { unsubscribed: true },
    });

    await prisma.notification.create({
      data: {
        type: 'UNSUBSCRIBED',
        businessId: business.id,
        message: `${business.name} unsubscribed.`,
      },
    });

    res.send(
      `<h1>You have been unsubscribed.</h1><p>You will no longer receive emails from us.</p>`
    );
  } catch (err) {
    next(err);
  }
});

export default router;
