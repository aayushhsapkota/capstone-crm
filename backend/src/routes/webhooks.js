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
    const { queryId, results } = req.body;

    await prisma.queryResult.createMany({
      data: results.map((r) => ({
        queryId,
        url: r.url,
        businessName: r.businessName || null,
      })),
      skipDuplicates: true,
    });

    await prisma.query.update({
      where: { id: queryId },
      data: { status: 'COMPLETE', resultsCount: results.length },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/scrape-complete — n8n calls after scraping + Gemini extraction
router.post('/scrape-complete', async (req, res, next) => {
  if (!validateSecret(req, res)) return;
  try {
    const { results } = req.body;

    for (const r of results) {
      const business = await prisma.business.create({
        data: {
          name: r.name,
          specialisation: r.specialisation || null,
          location: r.location || null,
          email: r.email || null,
          phone: r.phone || null,
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

      await prisma.notification.create({
        data: {
          type: 'SCRAPE_COMPLETE',
          businessId: business.id,
          message: `${business.name} scraped and added.`,
        },
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
