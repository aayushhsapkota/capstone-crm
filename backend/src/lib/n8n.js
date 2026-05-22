import axios from 'axios';

const base = process.env.N8N_BASE_URL;

export async function callN8n(webhookPath, payload) {
  const url = `${base}/${webhookPath}`;
  const { data } = await axios.post(url, payload, { timeout: 30000 });
  return data;
}
