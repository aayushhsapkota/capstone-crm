import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// GET /api/businesses
router.get('/', async (req, res, next) => {
  try {
    //test deployment again
    const { status, unsubscribed, hasEmail, search, page = 1, limit = 50, idsOnly } = req.query;
    const where = {};

    if (status) where.status = status;
    if (unsubscribed !== undefined) where.unsubscribed = unsubscribed === 'true';
    // email is unique-when-set, so "no email" is only ever represented as null, never
    // an empty string (two businesses both saved with "" would violate the unique
    // constraint) — a plain equals/not-null check is enough, no OR needed.
    if (hasEmail !== undefined) where.email = hasEmail === 'false' ? null : { not: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // For "select all N matching" — every id matching the filter, unpaginated, and
    // without pulling every column for rows that are only ever going to be used as a
    // businessId in a campaign. Shares the same `where` as the normal list above so
    // the filter logic can't drift between the two.
    if (idsOnly === 'true') {
      const rows = await prisma.business.findMany({ where, select: { id: true } });
      return res.json({ ids: rows.map((r) => r.id) });
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

// POST /api/businesses/scrape — extract business info from a single website via
// Firecrawl + Gemini. Returns a draft for the caller to review/edit — never creates
// the business directly, same reasoning as owner-profile's /scrape (LLM extraction
// can be wrong, and this is a one-off manual add rather than a batch where flagging
// bad extractions for later review is the more practical option).
router.post('/scrape', async (req, res, next) => {
  try {
    const { websiteUrl } = req.body;
    const draft = await callN8n(process.env.N8N_WEBHOOK_BUSINESS_SCRAPE, { websiteUrl });

    if (draft?.error) {
      return res.status(502).json({ error: draft.error });
    }

    res.json(draft); // { name, specialisation, location, phone, email, website, yearsExperience, services, awards }
  } catch (err) {
    const n8nError = err.response?.data?.error;
    if (n8nError) {
      return res.status(502).json({ error: n8nError });
    }
    next(err);
  }
});

// POST /api/businesses — manual add, e.g. from the "Add Business" scrape-and-review
// flow. status/unsubscribed keep their schema defaults (NEW/false) since this isn't
// data returning from an existing thread.
router.post('/', async (req, res, next) => {
  try {
    const business = await prisma.business.create({ data: req.body });
    res.status(201).json(business);
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
        // offer name lets the thread show what kind of email each SENT message was
        // (a specific offer vs. a plain intro) — offerId alone isn't enough to render
        // that without a second round trip.
        emails: { orderBy: { sentAt: 'asc' }, include: { offer: { select: { name: true } } } },
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
