import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

function validateSecret(req, res) {
  const secret = req.headers['x-n8n-secret'];
  if (secret !== process.env.N8N_CALLBACK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// POST /api/webhooks/query-results — n8n calls after search completes
router.post('/query-results', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    const { queryId, results, error } = req.body;

    // insertedCount, not results.length: QueryResult.url is globally unique (the same
    // business url found by an earlier, different search is still a duplicate), so
    // skipDuplicates can silently drop some of these rows. createMany's return value is
    // the only place that knows how many actually landed — n8n has no DB visibility to
    // compute this itself, it only ever sees Firecrawl's raw results.
    let insertedCount = 0;
    if (results?.length) {
      const created = await prisma.queryResult.createMany({
        data: results.map((r) => ({
          queryId,
          url: r.url,
          businessName: r.businessName || null,
        })),
        skipDuplicates: true,
      });
      insertedCount = created.count;
    }

    // Query Search sends an explicit `error` field on failure (its Firecrawl node has
    // "continue using error output" wired to a separate branch). Must check it here
    // rather than always marking COMPLETE, since n8n still calls back with 200 either way.
    if (error) {
      await prisma.query.update({
        where: { id: queryId },
        data: { status: 'FAILED', resultsCount: insertedCount },
      });
      await prisma.notification.create({
        data: {
          type: 'QUERY_FAILED',
          message: `Search query failed: ${error}`,
        },
      });
    } else {
      await prisma.query.update({
        where: { id: queryId },
        data: { status: 'COMPLETE', resultsCount: insertedCount },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Sentinel value the scrape workflow writes into `name` (and every other field) when
// its Firecrawl node errors — this endpoint receives a flat array of per-business
// results with no wrapping success/error flag, so a failure has to be smuggled through
// as data rather than a top-level `error` field like /query-results uses.
const SCRAPE_ERROR_PATTERN = /^SCRAPE_.*_ERROR$/;

// POST /api/webhooks/scrape-complete — n8n calls after scraping + Gemini extraction.
// n8n's "Aggregate Results" node collects every item from the whole batch into one
// array before calling this — so a single call here already represents "this entire
// scrape batch has finished", not just one business. That's what makes a single
// summary notification possible without any extra batch-tracking.
router.post('/scrape-complete', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    const { results } = req.body;

    let failedCount = 0;

    for (const r of results) {
      // Each item is isolated — the frontend polls every queryResultId it submitted
      // until each one is either scraped or flagged, so one malformed item (e.g. Gemini
      // returning an empty extraction with no name and no error sentinel) must not throw
      // and abort the rest of the loop, or every item after it is silently abandoned
      // mid-batch, stuck "pending" forever with no error surfaced anywhere.
      try {
        // Flag instead of creating a business — trusts the sentinel over blindly
        // treating LLM/scrape garbage as a real business name. A missing/blank name
        // (no sentinel, just nothing) is its own failure mode — Business.name is
        // required, so this would otherwise throw deeper in the try below.
        if (SCRAPE_ERROR_PATTERN.test(r.name) || !r.name) {
          await prisma.queryResult.update({
            where: { id: r.queryResultId },
            data: { flagged: true, flagReason: SCRAPE_ERROR_PATTERN.test(r.name) ? r.name : 'SCRAPE_EXTRACTION_ERROR' },
          });
          failedCount++;
          continue;
        }

        const business = await prisma.business.create({
          data: {
            name: r.name,
            specialisation: r.specialisation || null,
            location: r.location || null,
            email: r.email || null,
            phone: r.phone || null,
            website: r.url || null,
            services: r.services || null,
            awards: r.awards || null,
            yearsExperience: r.yearsExperience || null,
            scrapedAt: new Date(),
          },
        });

        await prisma.queryResult.update({
          where: { id: r.queryResultId },
          data: { businessId: business.id, scrapedAt: new Date() },
        });
      } catch (itemErr) {
        console.error(`scrape-complete: failed to process queryResult ${r.queryResultId}:`, itemErr);
        await prisma.queryResult
          .update({
            where: { id: r.queryResultId },
            data: { flagged: true, flagReason: 'SCRAPE_PROCESSING_ERROR' },
          })
          .catch((flagErr) => console.error(`scrape-complete: also failed to flag ${r.queryResultId}:`, flagErr));
        failedCount++;
      }
    }

    // One notification for the whole batch, not one per business — the frontend's own
    // polling (LeadReviewDetail) already gives real-time feedback while you're still on
    // the page; this is what lets you find out it finished even after navigating away,
    // via the bell instead of a page-scoped toast that can't survive navigation.
    if (results.length > 0) {
      const firstQueryResult = await prisma.queryResult.findUnique({
        where: { id: results[0].queryResultId },
        include: { query: { select: { text: true } } },
      });
      const queryText = firstQueryResult?.query?.text || 'your search';
      const message =
        failedCount === 0
          ? `Scraping completed for "${queryText}" successfully.`
          : `Scraping completed for "${queryText}" with ${failedCount} failed lead${failedCount === 1 ? '' : 's'}.`;

      await prisma.notification.create({
        data: { type: 'SCRAPE_COMPLETE', message },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/gmail-reply — n8n Gmail watch trigger
router.post('/gmail-reply', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    const { gmailThreadId, fromEmail, subject, bodyHtml, receivedAt } = req.body;

    const business = await prisma.business.findUnique({ where: { email: fromEmail } });
    if (!business) return res.json({ ok: true, note: 'Business not found' });

    const email = await prisma.email.create({
      data: {
        businessId: business.id,
        direction: 'RECEIVED',
        subject,
        bodyHtml,
        gmailThreadId,
        sentAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    await prisma.business.update({
      where: { id: business.id },
      data: { status: 'AWAITING_REPLY' },
    });

    await prisma.notification.create({
      data: {
        type: 'REPLY_RECEIVED',
        businessId: business.id,
        emailId: email.id,
        message: `Reply from ${business.name}: "${subject}"`,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/unsubscribe
router.post('/unsubscribe', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    const { email } = req.body;

    const business = await prisma.business.findUnique({ where: { email } });
    if (!business) return res.json({ ok: true, note: 'Business not found' });

    await prisma.business.update({
      where: { id: business.id },
      data: { unsubscribed: true },
    });

    await prisma.notification.create({
      data: {
        type: 'UNSUBSCRIBED',
        businessId: business.id,
        message: `${business.name} unsubscribed.`,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
