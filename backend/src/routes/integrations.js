import { Router } from 'express';
import crypto from 'crypto';
import { getAuthUrl, connectGmail, disconnectGmail, getGmailStatus } from '../lib/gmail.js';

const router = Router();

// Single-slot pending state — this app has exactly one operator connecting exactly
// one Gmail account at a time, so there's no need for a session store or DB table
// just to hold a short-lived CSRF token between the redirect out and the callback in.
let pendingState = null;

// GET /api/integrations — connection status for every integration on this page.
router.get('/', async (req, res, next) => {
  try {
    const gmail = await getGmailStatus();
    res.json({ gmail });
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/gmail/connect — kicks off the OAuth flow. A real browser
// redirect, not a fetch, since it has to land the user on Google's consent screen.
router.get('/gmail/connect', (req, res) => {
  pendingState = crypto.randomBytes(16).toString('hex');
  res.redirect(getAuthUrl(pendingState));
});

// GET /api/integrations/gmail/callback — Google redirects here after consent.
router.get('/gmail/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const redirectBase = `${process.env.FRONTEND_PUBLIC_URL}/settings/integrations`;
  const expectedState = pendingState;
  pendingState = null;

  if (error) {
    return res.redirect(`${redirectBase}?gmail=error&reason=${encodeURIComponent(error)}`);
  }
  if (!state || state !== expectedState) {
    return res.redirect(`${redirectBase}?gmail=error&reason=invalid_state`);
  }

  try {
    await connectGmail(code);
    res.redirect(`${redirectBase}?gmail=connected`);
  } catch (err) {
    console.error('Gmail OAuth callback failed:', err);
    res.redirect(`${redirectBase}?gmail=error&reason=exchange_failed`);
  }
});

// POST /api/integrations/gmail/disconnect
router.post('/gmail/disconnect', async (req, res, next) => {
  try {
    await disconnectGmail();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
