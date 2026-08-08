import client from './client.js';

export async function getQueryResults(queryId) {
  const { data } = await client.get('/query-results', {
    params: queryId ? { queryId } : {},
  });
  return data;
}

export async function scrapeQueryResults(ids) {
  const { data } = await client.post('/query-results/scrape', { ids });
  return data;
}

export async function flagQueryResult(id, flagReason) {
  const { data } = await client.patch(`/query-results/${id}/flag`, {
    flagged: true,
    flagReason,
  });
  return data;
}
