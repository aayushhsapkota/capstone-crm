import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// GET /api/emails/:businessId
router.get('/:businessId', async (req, res, next) => {
  try {
    const emails = await prisma.email.findMany({
      where: { businessId: req.params.businessId },
      orderBy: { sentAt: 'asc' },
      include: { offer: true },
    });
    res.json(emails);
  } catch (err) {
    next(err);
  }
});

// POST /api/emails/generate — returns draft, does NOT send
router.post('/generate', async (req, res, next) => {
  try {
    const { businessId, offerId } = req.body;

    const [business, offer, ownerProfile] = await Promise.all([
      prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
      offerId ? prisma.offer.findUnique({ where: { id: offerId } }) : null,
      prisma.ownerProfile.findFirst(),
    ]);

    const draft = await callN8n(process.env.N8N_WEBHOOK_GENERATE_EMAIL, {
      business,
      offer,
      ownerProfile,
    });

    res.json(draft); // { subject, bodyHtml }
  } catch (err) {
    next(err);
  }
});

// POST /api/emails/send
router.post('/send', async (req, res, next) => {
  try {
    const { businessId, subject, bodyHtml, offerId } = req.body;

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const result = await callN8n(process.env.N8N_WEBHOOK_SEND_EMAIL, {
      business,
      subject,
      bodyHtml,
    });

    if (result?.ok !== true) {
      await prisma.notification.create({
        data: {
          type: 'SEND_FAILED',
          businessId,
          message: `Failed to send "${subject}" to ${business.name}: ${result?.error || 'unknown error'}`,
        },
      });
      return res.status(502).json({ error: result?.error || 'Email send failed' });
    }

    const email = await prisma.email.create({
      data: {
        businessId,
        direction: 'SENT',
        subject,
        bodyHtml,
        offerId: offerId || null,
        gmailMessageId: result?.gmailMessageId || null,
        gmailThreadId: result?.gmailThreadId || null,
      },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { status: 'EMAIL_SENT' },
    });

    res.json(email);
  } catch (err) {
    next(err);
  }
});

export default router;
