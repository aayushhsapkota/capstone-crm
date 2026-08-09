import client from './client.js';

export async function getOwnerProfile() {
  const { data } = await client.get('/owner-profile');
  return data;
}

export async function saveOwnerProfile(profile) {
  const { data } = await client.put('/owner-profile', profile);
  return data;
}
