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
// Built from the same base as the axios client — a hardcoded '/api/...' string here
// would resolve against whatever origin this app happens to be deployed on (e.g.
// Cloudflare Pages), not the actual backend, which is exactly what broke this before.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const GMAIL_CONNECT_URL = `${API_BASE_URL}/integrations/gmail/connect`;
