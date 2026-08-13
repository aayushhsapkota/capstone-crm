import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getQueryResults, scrapeQueryResults, flagQueryResult, unflagQueryResult } from '../api/queryResults.js';
import { getOwnerProfile, saveOwnerProfile } from '../api/ownerProfile.js';

const FLAG_REASONS = ['Directory', 'Forum', 'Irrelevant', 'Duplicate', 'Other'];

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function LeadReview() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('queryId');

  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [excludingId, setExcludingId] = useState(null);
  const [showFlagged, setShowFlagged] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const data = await getQueryResults(queryId);
    setResults(data);
    setSelectedIds(new Set());
    setLoading(false);
  }, [queryId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFlag = async (id, flagReason) => {
    const updated = await flagQueryResult(id, flagReason);
    setResults((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUnflag = async (id) => {
    const updated = await unflagQueryResult(id);
    setResults((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const handleExcludeDomain = async (id, url) => {
    const domain = extractDomain(url);
    if (!domain) {
      setError('Could not figure out a domain from that URL.');
      return;
    }
    setExcludingId(id);
    setError('');
    try {
      // Read-then-write against the current saved profile rather than any local
      // copy — this page has no other reason to hold owner profile state, and a
      // single-user tool doesn't need to worry about a concurrent edit racing this.
      const profile = await getOwnerProfile();
      const excludeSites = profile.excludeSites || [];
      if (excludeSites.includes(domain)) {
        setMessage(`${domain} is already in your excluded sites.`);
        return;
      }
      await saveOwnerProfile({ excludeSites: [...excludeSites, domain] });
      setMessage(`${domain} added to excluded sites — future searches won't surface it again.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update excluded sites. Please try again.');
    } finally {
      setExcludingId(null);
    }
  };

  const handleScrapeSelected = async () => {
    setScraping(true);
    setError('');
    try {
      const { count } = await scrapeQueryResults([...selectedIds]);
      setMessage(`Scraping ${count} URL${count === 1 ? '' : 's'}…`);
      setSelectedIds(new Set());
    } catch (err) {
      // Same caveat as QueryManager's runQuery — the backend dispatches to n8n
      // fire-and-forget, so this only catches request-level failures. A failure inside
      // the scrape itself is flagged per-result later via scrape-complete's sentinel check.
      setError(err.response?.data?.error || 'Failed to start scraping. Please try again.');
    } finally {
      setScraping(false);
    }
  };

  const selectableCount = results.filter((r) => !r.flagged).length;
  const flaggedCount = results.length - selectableCount;

  // Grouped by source query so it's clear which search each lead came from and when
  // that search ran — a flat list across multiple searches otherwise loses that
  // context entirely. showFlagged is applied here rather than in the fetch itself:
  // the backend now always returns flagged results too (see queryResults.js), since
  // hiding them server-side meant there was no way to review or undo a flag later.
  const groups = useMemo(() => {
    const visible = showFlagged ? results : results.filter((r) => !r.flagged);
    const byQuery = new Map();
    for (const r of visible) {
      if (!byQuery.has(r.queryId)) {
        byQuery.set(r.queryId, {
          queryId: r.queryId,
          queryText: r.query?.text || 'Unknown query',
          ranAt: r.query?.ranAt,
          rows: [],
        });
      }
      byQuery.get(r.queryId).rows.push(r);
    }
    return [...byQuery.values()].sort((a, b) => new Date(b.ranAt) - new Date(a.ranAt));
  }, [results, showFlagged]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Lead Review</h1>
      <p className="text-slate-500 mt-1">
        {queryId ? 'Reviewing results for the selected query.' : 'Reviewing all unscraped leads.'}
      </p>

      {message && (
        <div className="mt-4 px-3 py-2 bg-green-50 text-green-700 text-sm rounded-md">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 px-3 py-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-md">
        <span className="text-sm text-slate-600">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select leads to scrape'}
        </span>
        <button
          onClick={handleScrapeSelected}
          disabled={scraping || selectedIds.size === 0}
          className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50"
        >
          {scraping ? 'Scraping…' : 'Scrape Selected'}
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showFlagged}
            onChange={(e) => setShowFlagged(e.target.checked)}
          />
          Show flagged ({flaggedCount})
        </label>
      </div>

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading results…</p>
        ) : groups.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {results.length === 0 ? 'No unscraped leads found.' : 'No leads to show — try "Show flagged".'}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.queryId} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">{group.queryText}</span>
                <span className="text-xs text-slate-400">
                  {group.ranAt ? new Date(group.ranAt).toLocaleString() : ''} · {group.rows.length} lead
                  {group.rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pl-3 pr-4 font-medium w-8"></th>
                    <th className="py-2 pr-4 font-medium">Business Name</th>
                    <th className="py-2 pr-4 font-medium">URL</th>
                    <th className="py-2 pr-4 font-medium">Date Found</th>
                    <th className="py-2 pr-4 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-100 last:border-b-0 ${r.flagged ? 'opacity-40' : ''}`}
                    >
                      <td className="py-2 pl-3 pr-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          disabled={r.flagged}
                          onChange={() => toggleSelected(r.id)}
                        />
                      </td>
                      <td className="py-2 pr-4 text-slate-800">{r.businessName || '—'}</td>
                      <td className="py-2 pr-4">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {r.url}
                        </a>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">
                        {r.flagged ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{r.flagReason}</span>
                            <button
                              onClick={() => handleExcludeDomain(r.id, r.url)}
                              disabled={excludingId === r.id}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                            >
                              {excludingId === r.id ? 'Excluding…' : '+ Exclude domain'}
                            </button>
                            <button
                              onClick={() => handleUnflag(r.id)}
                              className="text-xs text-slate-400 hover:text-slate-700 hover:underline"
                            >
                              Unflag
                            </button>
                          </div>
                        ) : (
                          <select
                            defaultValue=""
                            onChange={(e) => e.target.value && handleFlag(r.id, e.target.value)}
                            className="text-xs border border-slate-300 rounded px-1.5 py-1"
                          >
                            <option value="" disabled>
                              Flag…
                            </option>
                            {FLAG_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {!loading && results.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">{selectableCount} selectable for scraping.</p>
      )}
    </div>
  );
}
