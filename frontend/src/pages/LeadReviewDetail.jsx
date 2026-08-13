import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getQueryResults, scrapeQueryResults, flagQueryResult, unflagQueryResult } from '../api/queryResults.js';
import { getOwnerProfile, saveOwnerProfile } from '../api/ownerProfile.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';

const FLAG_REASONS = ['Directory', 'Forum', 'Irrelevant', 'Duplicate', 'Other'];
const PAGE_SIZE = 50;

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function LeadReviewDetail({ queryId }) {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFlagged, setShowFlagged] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [excludingId, setExcludingId] = useState(null);
  const [toast, showToast] = useToast();

  const fetchResults = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      const data = await getQueryResults({ queryId, page: targetPage, pageSize: PAGE_SIZE, includeFlagged: showFlagged });
      setResults(data.results);
      setTotal(data.total);
      setPage(data.page);
      setSelectedIds(new Set());
      setLoading(false);
    },
    [queryId, showFlagged] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Reset to page 1 whenever the query or the flagged-visibility filter changes —
  // otherwise you could land on "page 3" of a filter that now only has 1 page.
  useEffect(() => {
    fetchResults(1);
  }, [queryId, showFlagged]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    fetchResults(clamped);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Scoped to the current page, same as everything else here now that results are
  // paginated — selecting "all" means all selectable rows actually loaded right now,
  // not every lead across every page for this query.
  const selectableRows = results.filter((r) => !r.flagged);
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableRows.forEach((r) => next.delete(r.id));
        return next;
      }
      return new Set([...prev, ...selectableRows.map((r) => r.id)]);
    });
  };

  const handleFlag = async (id, flagReason) => {
    await flagQueryResult(id, flagReason);
    // Re-fetch rather than patch locally — flagging can remove this row from the
    // current filtered/paginated view entirely (e.g. when "Show flagged" is off).
    await fetchResults(page);
  };

  const handleUnflag = async (id) => {
    await unflagQueryResult(id);
    await fetchResults(page);
  };

  const handleExcludeDomain = async (id, url) => {
    const domain = extractDomain(url);
    if (!domain) {
      showToast('Could not figure out a domain from that URL.', 'error');
      return;
    }
    setExcludingId(id);
    try {
      // Read-then-write against the current saved profile rather than any local
      // copy — this page has no other reason to hold owner profile state, and a
      // single-user tool doesn't need to worry about a concurrent edit racing this.
      const profile = await getOwnerProfile();
      const excludeSites = profile.excludeSites || [];
      if (excludeSites.includes(domain)) {
        showToast(`${domain} is already in your excluded sites.`);
        return;
      }
      await saveOwnerProfile({ excludeSites: [...excludeSites, domain] });
      showToast(`${domain} added to excluded sites — future searches won't surface it again.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update excluded sites. Please try again.', 'error');
    } finally {
      setExcludingId(null);
    }
  };

  const handleScrapeSelected = async () => {
    setScraping(true);
    try {
      const { count } = await scrapeQueryResults([...selectedIds]);
      showToast(`Scraping ${count} URL${count === 1 ? '' : 's'}…`);
      setSelectedIds(new Set());
    } catch (err) {
      // Same caveat as QueryManager's runQuery — the backend dispatches to n8n
      // fire-and-forget, so this only catches request-level failures. A failure inside
      // the scrape itself is flagged per-result later via scrape-complete's sentinel check.
      showToast(err.response?.data?.error || 'Failed to start scraping. Please try again.', 'error');
    } finally {
      setScraping(false);
    }
  };

  const queryInfo = results[0]?.query;

  return (
    <div>
      <Link to="/leads" className="text-sm text-blue-600 hover:underline">
        ← Back to Lead Review
      </Link>

      <h1 className="text-2xl font-semibold text-slate-800 mt-2">
        {queryInfo?.text || 'Query leads'}
      </h1>
      <p className="text-slate-500 mt-1 text-sm">
        {queryInfo?.ranAt ? `Searched ${new Date(queryInfo.ranAt).toLocaleString()}` : 'Reviewing leads for this query.'}
      </p>

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
          Show flagged
        </label>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading results…</p>
        ) : results.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {showFlagged ? 'No leads at all for this query.' : 'No leads to review — try "Show flagged".'}
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium w-8">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="py-2 pr-4 font-medium">Business Name</th>
                <th className="py-2 pr-4 font-medium">URL</th>
                <th className="py-2 pr-4 font-medium">Date Found</th>
                <th className="py-2 pr-4 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 ${r.flagged ? 'opacity-40' : ''}`}
                >
                  <td className="py-2 pr-4">
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
        )}
      </div>

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {total} {showFlagged ? `lead${total === 1 ? '' : 's'}` : 'selectable for scraping'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
