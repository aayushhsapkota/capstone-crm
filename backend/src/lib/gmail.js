import { google } from 'googleapis';
import prisma from './prisma.js';
import { encrypt, decrypt } from './crypto.js';
import { getOrCreateOwnerProfile } from './ownerProfile.js';

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

export function getAuthUrl(state) {
  return getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    // Without forcing the consent screen, re-connecting an already-authorized account
    // won't return a refresh_token at all (Google only issues one on first consent).
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
    state,
  });
}

// Exchanges the OAuth code for tokens, looks up the connected address, and saves
// everything onto the (single) OwnerProfile row.
export async function connectGmail(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: userInfo } = await oauth2.userinfo.get();

  // Not findFirst() — this can be the very first thing anyone does (connecting Gmail
  // before ever touching Profile Settings), so there may be no row yet to update.
  const profile = await getOrCreateOwnerProfile();
  await prisma.ownerProfile.update({
    where: { id: profile.id },
    data: {
      gmailAccessToken: encrypt(tokens.access_token),
      gmailRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : profile.gmailRefreshToken,
      gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      gmailConnectedEmail: userInfo.email,
    },
  });

  return userInfo.email;
}

export async function disconnectGmail() {
  const profile = await prisma.ownerProfile.findFirst();
  if (!profile) return;
  await prisma.ownerProfile.update({
    where: { id: profile.id },
    data: {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailConnectedEmail: null,
    },
  });
}

export async function getGmailStatus() {
  const profile = await prisma.ownerProfile.findFirst();
  return {
    connected: !!profile?.gmailRefreshToken,
    email: profile?.gmailConnectedEmail || null,
  };
}

function buildRawMessage({ to, from, subject, bodyHtml }) {
  const lines = [
    `To: ${to}`,
    `From: ${from}`,
    // Base64-encoded per RFC 2047 so a subject with non-ASCII characters survives.
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    bodyHtml,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

/**
 * Sends an email through the Gmail account connected to the owner's profile.
 *
 * The Gmail OAuth tokens are stored encrypted in the database. The access token
 * is short-lived, while the refresh token allows Google's OAuth client to obtain
 * a new access token automatically when necessary.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address.
 * @param {string} params.subject - Email subject.
 * @param {string} params.bodyHtml - HTML content of the email.
 * @returns {Promise<{ gmailMessageId: string, gmailThreadId: string }>}
 */
export async function sendGmail({ to, subject, bodyHtml }) {
  // Load the owner's profile so we can retrieve the encrypted Gmail OAuth
  // credentials and the Gmail address that should be used as the sender.
  const profile = await prisma.ownerProfile.findFirst();

  // A refresh token is required for a persistent Gmail connection. If it is
  // missing, the user has not completed the Gmail OAuth connection flow yet.
  if (!profile?.gmailRefreshToken) {
    throw new Error(
      'Gmail is not connected. Connect it under Profile menu → Integrations first.'
    );
  }

  // Create the Google OAuth2 client using the application's Gmail OAuth
  // configuration (client ID, client secret, redirect URI, etc.).
  const client = getOAuthClient();

  // Restore the saved OAuth credentials.
  //
  // The tokens are encrypted in the database, so they must be decrypted before
  // being passed to Google's OAuth client.
  //
  // access_token:
  //   Short-lived credential used to make Gmail API requests.
  //
  // refresh_token:
  //   Long-lived credential that allows Google to issue a new access token
  //   without requiring the user to log in or authorize the app again.
  //
  // expiry_date:
  //   Tells the OAuth client when the current access token expires so it knows
  //   when a refresh may be necessary.
  client.setCredentials({
    access_token: profile.gmailAccessToken
      ? decrypt(profile.gmailAccessToken)
      : undefined,
    refresh_token: decrypt(profile.gmailRefreshToken),
    expiry_date: profile.gmailTokenExpiry?.getTime(),
  });

  // Google's OAuth client emits a "tokens" event whenever it obtains new
  // credentials, including when it refreshes an expired access token.
  //
  // Persisting the new credentials means future email sends can reuse the
  // refreshed access token instead of unnecessarily contacting Google's token
  // endpoint again.
  client.on('tokens', (tokens) => {
    const data = {};

    // Save the new access token in encrypted form.
    if (tokens.access_token) {
      data.gmailAccessToken = encrypt(tokens.access_token);
    }

    // Google may occasionally return a replacement refresh token.
    // Only overwrite the existing one when Google actually provides a new one.
    if (tokens.refresh_token) {
      data.gmailRefreshToken = encrypt(tokens.refresh_token);
    }

    // Store the new expiration time so the OAuth client knows when the access
    // token will become stale.
    if (tokens.expiry_date) {
      data.gmailTokenExpiry = new Date(tokens.expiry_date);
    }

    // Only update the database when Google actually returned new credentials.
    // The update is intentionally asynchronous so token persistence does not
    // unnecessarily delay the email-send operation.
    if (Object.keys(data).length) {
      prisma.ownerProfile
        .update({
          where: { id: profile.id },
          data,
        })
        .catch(console.error);
    }
  });

  // Create an authenticated Gmail API client using the OAuth credentials above.
  const gmail = google.gmail({
    version: 'v1',
    auth: client,
  });

  // Build the MIME email and encode it into the raw format required by the
  // Gmail API. The "From" address is the Gmail account connected through OAuth.
  const raw = buildRawMessage({
    to,
    from: profile.senderName
      ? `"${profile.senderName}" <${profile.gmailConnectedEmail}>`
      : profile.gmailConnectedEmail,
    subject,
    bodyHtml,
  });

  // Send the email through Gmail.
  //
  // userId: 'me' means "the currently authenticated Gmail account" rather
  // than a specific Gmail address.
  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  // Return Google's identifiers so the caller can track the sent message
  // and its Gmail conversation/thread if needed.
  return {
    gmailMessageId: data.id,
    gmailThreadId: data.threadId,
  };
}