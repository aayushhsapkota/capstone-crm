import client from './client.js';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/uploads', formData);
  return data.url;
}
