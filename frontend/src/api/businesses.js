import client from './client.js';

export async function getBusinesses(params = {}) {
  const { data } = await client.get('/businesses', { params });
  return data;
}

// Every id matching a filter, unpaginated — for "select all N matching" rather than
// fetching every column of every row just to read off its id.
export async function getBusinessIds(params = {}) {
  const { data } = await client.get('/businesses', { params: { ...params, idsOnly: true } });
  return data.ids;
}

export async function getBusiness(id) {
  const { data } = await client.get(`/businesses/${id}`);
  return data;
}

export async function updateBusiness(id, patch) {
  const { data } = await client.patch(`/businesses/${id}`, patch);
  return data;
}
