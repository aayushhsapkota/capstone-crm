import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/owner-profile — creates default if none exists
router.get('/', async (req, res, next) => {
  try {
    let profile = await prisma.ownerProfile.findFirst();
    if (!profile) {
      profile = await prisma.ownerProfile.create({
        data: {
          companyName: 'My Company',
          senderName: 'Your Name',
          senderEmail: 'you@example.com',
        },
      });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner-profile — upsert
router.put('/', async (req, res, next) => {
  try {
    const existing = await prisma.ownerProfile.findFirst();
    let profile;

    if (existing) {
      profile = await prisma.ownerProfile.update({
        where: { id: existing.id },
        data: req.body,
      });
    } else {
      profile = await prisma.ownerProfile.create({ data: req.body });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
