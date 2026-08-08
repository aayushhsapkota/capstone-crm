import client from './client.js';

export async function createCampaign({ name, businessIds, offerId, delaySeconds }) {
  const { data } = await client.post('/campaigns', { name, businessIds, offerId, delaySeconds });
  return data;
}
