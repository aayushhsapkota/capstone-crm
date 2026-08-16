import client from './client.js';

export async function getIntegrationsStatus() {
  const { data } = await client.get('/integrations');
  return data; // { gmail: { connected, email } }
}

export async function disconnectGmail() {
  await client.post('/integrations/gmail/disconnect');
}

// A real URL to navigate the browser to (not a fetch) — the backend responds with a
// redirect to Google's consent screen, which only works as a top-level navigation.
export const GMAIL_CONNECT_URL = '/api/integrations/gmail/connect';
