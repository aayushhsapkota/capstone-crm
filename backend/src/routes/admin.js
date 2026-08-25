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

// Shared by /reset and /demo-reset — wipes every row in every table, including Owner
// Profile (company info, signature, Gmail connection) and any locally-uploaded images.
async function wipeAllData() {
  // Gathered before deletion — need these URLs to clean up local upload files after
  // the rows referencing them are gone.
  const [offers, profile] = await Promise.all([
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
    ...offers.map((o) => deleteUploadedFileIfLocal(o.imageUrl)),
    deleteUploadedFileIfLocal(profile?.logoUrl),
    deleteUploadedFileIfLocal(profile?.heroImageUrl),
  ]);
}

// POST /api/admin/reset — the private, secret-gated version. Deliberately not wired
// into the frontend anywhere — this is a "start fresh" tool you call directly
// (curl/Postman/etc.) with the secret header, not something safe to expose as a
// clickable button with no undo. Protected by a header secret rather than a body
// confirmation phrase, since anything written in a chat/README isn't secret.
router.post('/reset', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    await wipeAllData();
    res.json({ ok: true, message: 'All data deleted.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/demo-reset — the public, no-secret version, wired into the "start
// fresh?" modal on the Console page. Intentionally has NO auth check: this app has no
// login system, so there's no way to tell "the owner" apart from any other visitor —
// the whole point of this endpoint is that any visitor can reset the shared demo data.
// Gated behind PUBLIC_DEMO_RESET_ENABLED rather than being unconditionally live, so a
// real (non-demo) deployment of this app can disable it completely by never setting
// that var — same "unset means disabled" pattern as ADMIN_RESET_SECRET above.
router.post('/demo-reset', async (req, res, next) => {
  if (process.env.PUBLIC_DEMO_RESET_ENABLED !== 'true') {
    return res.status(403).json({ error: 'Demo reset is not enabled on this deployment.' });
  }
  try {
    await wipeAllData();
    res.json({ ok: true, message: 'All data deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
