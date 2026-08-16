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

export async function sendGmail({ to, subject, bodyHtml }) {
  const profile = await prisma.ownerProfile.findFirst();
  if (!profile?.gmailRefreshToken) {
    throw new Error('Gmail is not connected. Connect it under Profile menu → Integrations first.');
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: profile.gmailAccessToken ? decrypt(profile.gmailAccessToken) : undefined,
    refresh_token: decrypt(profile.gmailRefreshToken),
    expiry_date: profile.gmailTokenExpiry?.getTime(),
  });

  // googleapis refreshes the access token behind the scenes when it's stale — without
  // persisting that back, every subsequent send re-hits Google's token endpoint instead
  // of reusing the fresh one this call just obtained.
  client.on('tokens', (tokens) => {
    const data = {};
    if (tokens.access_token) data.gmailAccessToken = encrypt(tokens.access_token);
    if (tokens.refresh_token) data.gmailRefreshToken = encrypt(tokens.refresh_token);
    if (tokens.expiry_date) data.gmailTokenExpiry = new Date(tokens.expiry_date);
    if (Object.keys(data).length) {
      prisma.ownerProfile.update({ where: { id: profile.id }, data }).catch(console.error);
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const raw = buildRawMessage({
    to,
    from: profile.senderName ? `"${profile.senderName}" <${profile.gmailConnectedEmail}>` : profile.gmailConnectedEmail,
    subject,
    bodyHtml,
  });

  const { data } = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return { gmailMessageId: data.id, gmailThreadId: data.threadId };
}
