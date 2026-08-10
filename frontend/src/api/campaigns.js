import client from './client.js';

export async function getCampaigns() {
  const { data } = await client.get('/campaigns');
  return data;
}

export async function getCampaign(id) {
  const { data } = await client.get(`/campaigns/${id}`);
  return data;
}

export async function createCampaign({ name, businessIds, offerId, delaySeconds }) {
  const { data } = await client.post('/campaigns', { name, businessIds, offerId, delaySeconds });
  return data;
}
