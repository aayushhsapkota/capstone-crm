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
    const { text } = req.body;

    const query = await prisma.query.create({
      data: { text, status: 'RUNNING' },
    });

    // Fire-and-forget — n8n will callback to /api/webhooks/query-results
    callN8n(process.env.N8N_WEBHOOK_SCRAPE_SEARCH, {
      queryId: query.id,
      text,
    }).catch(console.error);

    res.status(201).json(query);
  } catch (err) {
    next(err);
  }
});

export default router;
