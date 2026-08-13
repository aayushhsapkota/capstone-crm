import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { deleteUploadedFileIfLocal } from '../lib/uploads.js';

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
    const existing = await prisma.offer.findUniqueOrThrow({ where: { id: req.params.id } });

    // Replacing an image swaps in a brand new uploaded file rather than overwriting
    // the old one on disk — clean up the file it's replacing so uploads don't
    // accumulate forever in backend/uploads/.
    if (req.body.imageUrl !== undefined && req.body.imageUrl !== existing.imageUrl) {
      await deleteUploadedFileIfLocal(existing.imageUrl);
    }

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
    const offer = await prisma.offer.delete({ where: { id: req.params.id } });
    await deleteUploadedFileIfLocal(offer.imageUrl);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
