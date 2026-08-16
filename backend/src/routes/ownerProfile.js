import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';
import { deleteUploadedFileIfLocal } from '../lib/uploads.js';
import { getOrCreateOwnerProfile } from '../lib/ownerProfile.js';

const router = Router();

// GET /api/owner-profile — creates default if none exists
router.get('/', async (req, res, next) => {
  try {
    const profile = await getOrCreateOwnerProfile();
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /api/owner-profile/scrape — extract companyName/specialisation/phone/services
// from a website via Firecrawl + Gemini. Returns a draft for the caller to review/edit — never
// writes to the profile directly, since LLM extraction can be wrong and this is
// foundational data (same reasoning as why email drafts require an explicit Send).
router.post('/scrape', async (req, res, next) => {
  try {
    const { websiteUrl } = req.body;
    const draft = await callN8n(process.env.N8N_WEBHOOK_OWNER_PROFILE_SCRAPE, { websiteUrl });

    if (draft?.error) {
      return res.status(502).json({ error: draft.error });
    }

    res.json(draft); // { companyName, specialisation, phone, services }
  } catch (err) {
    const n8nError = err.response?.data?.error;
    if (n8nError) {
      return res.status(502).json({ error: n8nError });
    }
    next(err);
  }
});

// PUT /api/owner-profile — upsert
router.put('/', async (req, res, next) => {
  try {
    const existing = await prisma.ownerProfile.findFirst();
    let profile;

    if (existing) {
      // Replacing an image (via ImageUrlField's "Replace") swaps in a brand new
      // uploaded file rather than overwriting the old one on disk — clean up the file
      // it's replacing so uploads don't accumulate forever in backend/uploads/.
      if (req.body.logoUrl !== undefined && req.body.logoUrl !== existing.logoUrl) {
        await deleteUploadedFileIfLocal(existing.logoUrl);
      }
      if (req.body.heroImageUrl !== undefined && req.body.heroImageUrl !== existing.heroImageUrl) {
        await deleteUploadedFileIfLocal(existing.heroImageUrl);
      }

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
