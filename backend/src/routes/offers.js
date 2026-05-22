import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/offers
router.get('/', async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(offers);
  } catch (err) {
    next(err);
  }
});

// POST /api/offers
router.post('/', async (req, res, next) => {
  try {
    const offer = await prisma.offer.create({ data: req.body });
    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/offers/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(offer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offers/:id — only if not used in any sent emails
router.delete('/:id', async (req, res, next) => {
  try {
    const usedInEmail = await prisma.email.findFirst({
      where: { offerId: req.params.id },
    });
    if (usedInEmail) {
      return res.status(409).json({ error: 'Offer is linked to sent emails and cannot be deleted.' });
    }
    await prisma.offer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
