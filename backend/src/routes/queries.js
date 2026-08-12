import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// GET /api/queries
router.get('/', async (req, res, next) => {
  try {
    const queries = await prisma.query.findMany({ orderBy: { ranAt: 'desc' } });
    res.json(queries);
  } catch (err) {
    next(err);
  }
});

// POST /api/queries/run
router.post('/run', async (req, res, next) => {
  try {
    const { text, limit } = req.body;

    // Clamp to a sane range rather than trusting the client value outright — Firecrawl
    // still gets a default of 3 on the n8n side if this comes through as undefined.
    const parsedLimit = Number(limit);
    const safeLimit = parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 20) : undefined;

    const query = await prisma.query.create({
      data: { text, status: 'RUNNING' },
    });

    // excludeSites is a standing preference (which directory sites are noise for this
    // business's industry), not something to retype per search — pulled from the
    // owner's saved profile rather than the request body.
    const ownerProfile = await prisma.ownerProfile.findFirst();

    // Fire-and-forget — n8n will callback to /api/webhooks/query-results, which is
    // where the real success/FAILED outcome gets recorded. .catch(console.error) only
    // guards against the dispatch request itself failing to reach n8n (e.g. n8n down);
    // it can't distinguish that from a failure inside the search, so it's logged
    // server-side rather than surfaced to the caller — the query would just stay
    // RUNNING with no callback in that case.
    callN8n(process.env.N8N_WEBHOOK_SCRAPE_SEARCH, {
      queryId: query.id,
      text,
      limit: safeLimit,
      excludeSites: ownerProfile?.excludeSites || [],
    }).catch(console.error);

    res.status(201).json(query);
  } catch (err) {
    next(err);
  }
});

export default router;
