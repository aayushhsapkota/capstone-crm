import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';
import { sendGmail } from '../lib/gmail.js';

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
    const { businessId, offerId, selectedServices } = req.body;

    const [business, offer, ownerProfile] = await Promise.all([
      prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
      offerId ? prisma.offer.findUnique({ where: { id: offerId } }) : null,
      prisma.ownerProfile.findFirst(),
    ]);

    const draft = await callN8n(process.env.N8N_WEBHOOK_GENERATE_EMAIL, {
      business,
      offer,
      ownerProfile,
      // Which of ownerProfile.services (by name) to actually feature in this specific
      // email — lets the workflow build the services section from a subset rather than
      // always every service on file. Omitted/undefined means "use all of them".
      selectedServices,
    });

    // The generate-email workflow responds 200 with {subject, bodyHtml} on success,
    // but 500 with {error} when the LLM node itself fails (bad credential, rate limit,
    // etc). draft?.error covers the case where n8n still answers 200 with an error body;
    // the catch below covers the more common 500 case, which axios throws on.
    if (draft?.error) {
      return res.status(502).json({ error: draft.error });
    }

    res.json(draft); // { subject, bodyHtml }
  } catch (err) {
    const n8nError = err.response?.data?.error;
    if (n8nError) {
      return res.status(502).json({ error: n8nError });
    }
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

    // Sent directly via the Gmail account connected in Integrations settings — this
    // used to go through an n8n workflow, but Gmail is one of the few integrations a
    // user configures themselves rather than through n8n (which they don't have UI
    // access to), so it's simpler for the backend to own sending outright.
    let result;
    try {
      result = await sendGmail({ to: business.email, subject, bodyHtml });
    } catch (err) {
      await prisma.notification.create({
        data: {
          type: 'SEND_FAILED',
          businessId,
          message: `Failed to send "${subject}" to ${business.name}: ${err.message}`,
        },
      });
      return res.status(502).json({ error: err.message });
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
