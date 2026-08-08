import client from './client.js';

export async function getEmails(businessId) {
  const { data } = await client.get(`/emails/${businessId}`);
  return data;
}

export async function generateEmail({ businessId, offerId }) {
  const { data } = await client.post('/emails/generate', { businessId, offerId });
  return data;
}

export async function sendEmail({ businessId, subject, bodyHtml, offerId }) {
  const { data } = await client.post('/emails/send', { businessId, subject, bodyHtml, offerId });
  return data;
}
