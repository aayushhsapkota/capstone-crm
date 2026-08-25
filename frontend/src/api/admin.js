import client from './client.js';

export async function resetDemoData() {
  const { data } = await client.post('/admin/demo-reset');
  return data;
}
