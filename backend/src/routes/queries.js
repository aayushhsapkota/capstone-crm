import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// Shared by GET / (list) and GET /:id (single, used by the Lead Review detail page) —
// covers each query's lead pipeline in one round trip: how many leads are still
// actionable, and what scraping has actually done so far — nothing yet, all clean, or
// some failed — plus when the most recent scrape activity happened. QueryResult has no
// "scrape attempted at" field, so scrapedAt (only ever set on success) and updatedAt
// (the only timestamp that also moves when a scrape-failure flag gets applied) are
// combined to approximate "last scrape activity", whichever of the two is later.
async function computeQueryStats(queryIds) {
  const [pendingCounts, scrapedCounts, failedCounts] = await Promise.all([
    // pendingLeadsCount = still-actionable leads (unscraped AND unflagged) — a
    // flagged-but-unscraped lead has already been reviewed and dismissed, so it
    // shouldn't count as something still needing attention.
    prisma.queryResult.groupBy({
      by: ['queryId'],
      where: { queryId: { in: queryIds }, scrapedAt: null, flagged: false },
      _count: { _all: true },
    }),
    prisma.queryResult.groupBy({
      by: ['queryId'],
      where: { queryId: { in: queryIds }, scrapedAt: { not: null } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    // Matches the SCRAPE_*_ERROR sentinel pattern (SCRAPE_ERROR_PATTERN in
    // webhooks.js) via startsWith+endsWith rather than a regex, since Prisma's
    // string filters don't support one — a manually-picked flag reason like
    // "Directory" never matches this shape, so it's not counted as a scrape failure.
    prisma.queryResult.groupBy({
      by: ['queryId'],
      where: { queryId: { in: queryIds }, flagged: true, flagReason: { startsWith: 'SCRAPE_', endsWith: '_ERROR' } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
  ]);

  const pendingByQuery = Object.fromEntries(pendingCounts.map((p) => [p.queryId, p._count._all]));
  const scrapedByQuery = Object.fromEntries(scrapedCounts.map((s) => [s.queryId, s]));
  const failedByQuery = Object.fromEntries(failedCounts.map((f) => [f.queryId, f]));

  const statsByQuery = {};
  for (const queryId of queryIds) {
    const scraped = scrapedByQuery[queryId];
    const failed = failedByQuery[queryId];
    const scrapedCount = scraped?._count._all || 0;
    const failedCount = failed?._count._all || 0;
    const pendingCount = pendingByQuery[queryId] || 0;

    let scrapeStatus;
    if (scrapedCount === 0 && failedCount === 0) {
      scrapeStatus = 'NOT_STARTED';
    } else if (pendingCount > 0) {
      // Some results were scraped/flagged, but others were never attempted at all —
      // e.g. "Scrape Selected" only targeted a subset. Checked before failedCount so
      // this takes priority over COMPLETED_WITH_FAILURES too: leads still pending
      // means the query isn't "done" in either sense yet, however the attempted ones
      // turned out.
      scrapeStatus = 'PARTIALLY_COMPLETED';
    } else if (failedCount === 0) {
      scrapeStatus = 'COMPLETED';
    } else {
      scrapeStatus = 'COMPLETED_WITH_FAILURES';
    }

    const scrapedMax = scraped?._max.updatedAt ? new Date(scraped._max.updatedAt) : null;
    const failedMax = failed?._max.updatedAt ? new Date(failed._max.updatedAt) : null;
    const lastScrapeActivityAt =
      scrapedMax && failedMax ? (scrapedMax > failedMax ? scrapedMax : failedMax) : scrapedMax || failedMax || null;

    statsByQuery[queryId] = {
      pendingLeadsCount: pendingByQuery[queryId] || 0,
      failedLeadsCount: failedCount,
      scrapeStatus,
      lastScrapeActivityAt,
    };
  }
  return statsByQuery;
}

// GET /api/queries
router.get('/', async (req, res, next) => {
  try {
    const queries = await prisma.query.findMany({ orderBy: { ranAt: 'desc' } });
    const stats = await computeQueryStats(queries.map((q) => q.id));
    res.json(queries.map((q) => ({ ...q, ...stats[q.id] })));
  } catch (err) {
    next(err);
  }
});

// GET /api/queries/:id — used by the Lead Review detail page for its header
router.get('/:id', async (req, res, next) => {
  try {
    const query = await prisma.query.findUniqueOrThrow({ where: { id: req.params.id } });
    const stats = await computeQueryStats([query.id]);
    res.json({ ...query, ...stats[query.id] });
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
