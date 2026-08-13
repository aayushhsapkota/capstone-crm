import client from './client.js';

export async function getNotifications({ unreadOnly } = {}) {
  const { data } = await client.get('/notifications', {
    params: unreadOnly ? { unreadOnly: true } : {},
  });
  return data;
}

export async function markNotificationsRead({ ids, all } = {}) {
  const { data } = await client.patch('/notifications/read', all ? { all: true } : { ids });
  return data;
}
