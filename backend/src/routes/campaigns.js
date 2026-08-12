import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callN8n } from '../lib/n8n.js';

const router = Router();

// GET /api/campaigns
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await prisma.bulkCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { offer: { select: { id: true, name: true } } },
    });
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.bulkCampaign.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        offer: true,
        jobs: {
          include: { business: { select: { id: true, name: true, email: true } } },
          orderBy: { processedAt: 'asc' },
        },
      },
    });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns — create and immediately start
router.post('/', async (req, res, next) => {
  try {
    const { name, businessIds, offerId, delaySeconds = 30 } = req.body;

    const campaign = await prisma.bulkCampaign.create({
      data: {
        name,
        offerId: offerId || null,
        status: 'RUNNING',
        totalCount: businessIds.length,
        delaySeconds,
        jobs: {
          create: businessIds.map((bid) => ({ businessId: bid })),
        },
      },
    });

    res.status(201).json({
      campaignId: campaign.id,
      totalCount: campaign.totalCount,
      message: 'Campaign started',
    });

    // Process in background — don't await
    processCampaign(campaign.id, offerId, delaySeconds).catch(console.error);
  } catch (err) {
    next(err);
  }
});

async function processCampaign(campaignId, offerId, delaySeconds) {
  const jobs = await prisma.bulkCampaignJob.findMany({
    where: { campaignId },
    include: { business: true },
  });

  const offer = offerId ? await prisma.offer.findUnique({ where: { id: offerId } }) : null;
  const ownerProfile = await prisma.ownerProfile.findFirst();

  for (const job of jobs) {
    const { business } = job;

    if (business.unsubscribed || !business.email) {
      await prisma.bulkCampaignJob.update({
        where: { id: job.id },
        data: { status: 'SKIPPED', processedAt: new Date() },
      });
      await prisma.bulkCampaign.update({
        where: { id: campaignId },
        data: { skippedCount: { increment: 1 } },
      });
      continue;
    }

    try {
      const draft = await callN8n(process.env.N8N_WEBHOOK_GENERATE_EMAIL, { business, offer, ownerProfile });

      // Same generate-email failure shape as emails.js /generate — turn a 200-with-error
      // body into a thrown error so it's caught below with the other n8n failure modes.
      if (draft?.error) {
        throw new Error(draft.error);
      }

      const result = await callN8n(process.env.N8N_WEBHOOK_SEND_EMAIL, {
        business,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
      });

      // send-email always responds 200, so a failed send has to be detected via
      // {ok: false} rather than a caught exception — same as emails.js /send.
      if (result?.ok !== true) {
        throw new Error(result?.error || 'Email send failed');
      }

      await prisma.email.create({
        data: {
          businessId: business.id,
          direction: 'SENT',
          subject: draft.subject,
          bodyHtml: draft.bodyHtml,
          offerId: offerId || null,
          gmailMessageId: result?.gmailMessageId || null,
          gmailThreadId: result?.gmailThreadId || null,
        },
      });

      await prisma.business.update({
        where: { id: business.id },
        data: { status: 'EMAIL_SENT' },
      });

      await prisma.bulkCampaignJob.update({
        where: { id: job.id },
        data: { status: 'SENT', processedAt: new Date() },
      });

      await prisma.bulkCampaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 } },
      });
    } catch (err) {
      // err.response?.data?.error carries the real n8n/Gemini/Gmail failure message
      // when callN8n's axios call threw (e.g. generate-email's 500); err.message is
      // the fallback for errors thrown manually above (e.g. the {ok: false} case).
      const errorMessage = err.response?.data?.error || err.message;
      await prisma.bulkCampaignJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage, processedAt: new Date() },
      });
      await prisma.bulkCampaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }

  const final = await prisma.bulkCampaign.findUnique({ where: { id: campaignId } });
  const finalStatus = final.failedCount > 0 ? 'PARTIAL_FAIL' : 'COMPLETE';

  await prisma.bulkCampaign.update({
    where: { id: campaignId },
    data: { status: finalStatus, completedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      type: 'CAMPAIGN_COMPLETE',
      message: `Campaign "${final.name || campaignId}" finished — ${final.sentCount} sent, ${final.failedCount} failed, ${final.skippedCount} skipped.`,
    },
  });
}

export default router;
