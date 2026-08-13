import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

// GET /api/query-results?queryId=X&page=1&pageSize=50&includeFlagged=false
// queryId is required — this endpoint is now purely "paginated leads for one query".
// The cross-query overview lives on GET /api/queries (pendingLeadsCount) instead, so a
// query has to be picked first rather than this endpoint doubling as both a per-query
// and an all-queries view.
//
// Flagged results are excluded by default (includeFlagged=true to include them) rather
// than always excluded outright — otherwise there's no way to review or undo a flag
// (e.g. an accidental one) without going straight to the database.
router.get('/', async (req, res, next) => {
  try {
    const { queryId, page = '1', pageSize = String(DEFAULT_PAGE_SIZE), includeFlagged } = req.query;
    if (!queryId) {
      return res.status(400).json({ error: 'queryId is required.' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));

    const where = { queryId, scrapedAt: null };
    if (includeFlagged !== 'true') where.flagged = false;

    const [results, total] = await Promise.all([
      prisma.queryResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { query: { select: { text: true, ranAt: true } } },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.queryResult.count({ where }),
    ]);

    res.json({ results, total, page: pageNum, pageSize: size });
  } catch (err) {
    next(err);
  }
});

// POST /api/query-results/scrape
router.post('/scrape', async (req, res, next) => {
  try {
    const { ids } = req.body;

    const results = await prisma.queryResult.findMany({
      where: { id: { in: ids } },
    });

    // Fire-and-forget, same shape as /queries/run — /api/webhooks/scrape-complete is
    // where per-result success/flagged outcomes actually land. .catch(console.error)
    // only covers the dispatch call itself failing to reach n8n; it's logged
    // server-side rather than surfaced, since the caller already got a 200 with a count.
    callN8n(process.env.N8N_WEBHOOK_SCRAPE_WEBSITES, { results }).catch(console.error);

    res.json({ message: `Scraping ${results.length} URLs`, count: results.length });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/query-results/:id/flag
router.patch('/:id/flag', async (req, res, next) => {
  try {
    const { flagged, flagReason } = req.body;
    const result = await prisma.queryResult.update({
      where: { id: req.params.id },
      data: { flagged, flagReason: flagReason || null },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
