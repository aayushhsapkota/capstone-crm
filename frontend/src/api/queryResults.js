import client from './client.js';

// Returns { results, total, page, pageSize } — queryId is required now that this is
// purely the paginated per-query leads view (the cross-query overview lives on
// GET /api/queries's pendingLeadsCount instead).
export async function getQueryResults({ queryId, page = 1, pageSize = 50, includeFlagged = false }) {
  const { data } = await client.get('/query-results', {
    params: { queryId, page, pageSize, includeFlagged },
  });
  return data;
}

export async function scrapeQueryResults(ids) {
  const { data } = await client.post('/query-results/scrape', { ids });
  return data;
}

// Polled by the frontend after submitting a scrape batch, to detect when each
// submitted lead has resolved (scraped into a Business, or flagged as a failure).
export async function getQueryResultsStatus(ids) {
  const { data } = await client.get('/query-results/status', {
    params: { ids: ids.join(',') },
  });
  return data;
}

export async function flagQueryResult(id, flagReason) {
  const { data } = await client.patch(`/query-results/${id}/flag`, {
    flagged: true,
    flagReason,
  });
  return data;
}

export async function unflagQueryResult(id) {
  const { data } = await client.patch(`/query-results/${id}/flag`, {
    flagged: false,
  });
  return data;
}
