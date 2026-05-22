import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// GET /api/query-results — unscraped, unflagged. Optional ?queryId=
router.get('/', async (req, res, next) => {
  try {
    const { queryId } = req.query;
    const where = { scrapedAt: null, flagged: false };
    if (queryId) where.queryId = queryId;

    const results = await prisma.queryResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { query: { select: { text: true } } },
    });
    res.json(results);
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

    // Fire-and-forget — n8n calls back to /api/webhooks/scrape-complete
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
