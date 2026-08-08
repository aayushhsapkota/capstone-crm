import client from './client.js';

export async function getOffers() {
  const { data } = await client.get('/offers');
  return data;
}
