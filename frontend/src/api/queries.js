import client from './client.js';

export async function getQueries() {
  const { data } = await client.get('/queries');
  return data;
}

export async function getQuery(id) {
  const { data } = await client.get(`/queries/${id}`);
  return data;
}

export async function runQuery(text, limit) {
  const { data } = await client.post('/queries/run', { text, limit });
  return data;
}
