import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { deleteUploadedFileIfLocal } from '../lib/uploads.js';

const router = Router();

function validateSecret(req, res) {
  const secret = req.headers['x-admin-secret'];
  // Undefined ADMIN_RESET_SECRET means "disabled" — a deploy that never set this env
  // var can't have this endpoint tricked into running via a leaked/empty header match.
  if (!process.env.ADMIN_RESET_SECRET || secret !== process.env.ADMIN_RESET_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// POST /api/admin/reset — wipes every row in every table, including Owner Profile
// (company info, signature, Gmail connection) and any locally-uploaded images.
// Deliberately not wired into the frontend anywhere — this is a "start fresh" tool
// you call directly (curl/Postman/etc.) with the secret header, not something safe to
// expose as a clickable button with no undo. Protected by a header secret rather than
// a body confirmation phrase, since anything written in a chat/README isn't secret.
router.post('/reset', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    // Gathered before deletion — need these URLs to clean up local upload files
    // after the rows referencing them are gone.
    const [businesses, offers, profile] = await Promise.all([
      prisma.business.findMany({ select: { imageUrl: true } }),
      prisma.offer.findMany({ select: { imageUrl: true } }),
      prisma.ownerProfile.findFirst({ select: { logoUrl: true, heroImageUrl: true } }),
    ]);

    // Children first — every foreign key has to be gone before the row it points to,
    // same dependency order as the schema's relations (Notification/BulkCampaignJob/
    // Email/QueryResult all reference Business, Offer, Query, or BulkCampaign).
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.bulkCampaignJob.deleteMany(),
      prisma.email.deleteMany(),
      prisma.queryResult.deleteMany(),
      prisma.bulkCampaign.deleteMany(),
      prisma.business.deleteMany(),
      prisma.query.deleteMany(),
      prisma.offer.deleteMany(),
      prisma.ownerProfile.deleteMany(),
    ]);

    // Best-effort — deleteUploadedFileIfLocal already no-ops on external URLs and
    // already-missing files, so nothing here needs to block the response.
    await Promise.all([
      ...businesses.map((b) => deleteUploadedFileIfLocal(b.imageUrl)),
      ...offers.map((o) => deleteUploadedFileIfLocal(o.imageUrl)),
      deleteUploadedFileIfLocal(profile?.logoUrl),
      deleteUploadedFileIfLocal(profile?.heroImageUrl),
    ]);

    res.json({ ok: true, message: 'All data deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
