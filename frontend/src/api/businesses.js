import client from './client.js';

export async function getBusinesses(params = {}) {
  const { data } = await client.get('/businesses', { params });
  return data;
}

export async function getBusiness(id) {
  const { data } = await client.get(`/businesses/${id}`);
  return data;
}

export async function updateBusiness(id, patch) {
  const { data } = await client.patch(`/businesses/${id}`, patch);
  return data;
}
