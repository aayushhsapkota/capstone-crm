import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// Starting point for a new profile's excludeSites — these are just a seed, not a fixed
// list. Edit them on the Owner Profile page once you know which directory sites are
// actually noise for your industry (health-specific entries won't be relevant to
// everyone).
const DEFAULT_EXCLUDE_SITES = [
  'yelp.com',
  'healthgrades.com',
  'yellowpages.com',
  'facebook.com',
  'hotdoc.com.au',
  'healthengine.com.au',
  'yellowpages.ca',
  'ratemds.com',
];

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
          excludeSites: DEFAULT_EXCLUDE_SITES,
        },
      });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /api/owner-profile/scrape — extract companyName/specialisation/services from a
// website via Firecrawl + Gemini. Returns a draft for the caller to review/edit — never
// writes to the profile directly, since LLM extraction can be wrong and this is
// foundational data (same reasoning as why email drafts require an explicit Send).
router.post('/scrape', async (req, res, next) => {
  try {
    const { websiteUrl } = req.body;
    const draft = await callN8n(process.env.N8N_WEBHOOK_OWNER_PROFILE_SCRAPE, { websiteUrl });

    if (draft?.error) {
      return res.status(502).json({ error: draft.error });
    }

    res.json(draft); // { companyName, specialisation, services }
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
