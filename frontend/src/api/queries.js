import client from './client.js';

export async function getQueries() {
  const { data } = await client.get('/queries');
  return data;
}

export async function runQuery(text) {
  const { data } = await client.post('/queries/run', { text });
  return data;
}
