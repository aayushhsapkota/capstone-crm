import client from './client.js';

export async function getOffers() {
  const { data } = await client.get('/offers');
  return data;
}

export async function createOffer(offer) {
  const { data } = await client.post('/offers', offer);
  return data;
}

export async function updateOffer(id, patch) {
  const { data } = await client.patch(`/offers/${id}`, patch);
  return data;
}

export async function deleteOffer(id) {
  await client.delete(`/offers/${id}`);
}
