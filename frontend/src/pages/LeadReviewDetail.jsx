import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getQueryResults,
  scrapeQueryResults,
  flagQueryResult,
  unflagQueryResult,
} from '../api/queryResults.js';
import { getOwnerProfile, saveOwnerProfile } from '../api/ownerProfile.js';
import { getQuery } from '../api/queries.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { SCRAPE_STATUS_LABELS, SCRAPE_STATUS_STYLES } from '../lib/scrapeStatus.js';
import { useScrapeTracker } from '../context/ScrapeTracker.jsx';

const FLAG_REASONS = ['Directory', 'Forum', 'Irrelevant', 'Duplicate', 'Other'];
const PAGE_SIZE = 50;

// These sentinel values come from the scrape workflow's own error handling
// (website-scrape.json / webhooks.js's SCRAPE_ERROR_PATTERN), not from the FLAG_REASONS
// dropdown a human picks from — a lead gets auto-flagged this way when scraping itself
// failed, before there was ever a chance to review it. Shown with friendly labels
// instead of the raw sentinel string so they read like the rest of the Flag column
// rather than leaking an internal error code into the UI.
const AUTO_FLAG_LABELS = {
  SCRAPE_EXTRACTION_ERROR: 'Scrape Failed (AI extraction)',
  SCRAPE_FIRECRAWL_REQUEST_ERROR: 'Scrape Failed (site unreachable)',
};

const SCRAPE_ERROR_PATTERN = /^SCRAPE_.*_ERROR$/;

// True for a flag the scrape workflow applied itself (before a human ever saw the
// lead), false for one a person picked from FLAG_REASONS.
function isAutoFlag(flagReason) {
  return SCRAPE_ERROR_PATTERN.test(flagReason);
}

function formatFlagReason(flagReason) {
  if (AUTO_FLAG_LABELS[flagReason]) return AUTO_FLAG_LABELS[flagReason];
  // Generic fallback for any future SCRAPE_*_ERROR sentinel that isn't explicitly
  // mapped above yet — still reads as "a scrape failure", not a raw error code.
  if (isAutoFlag(flagReason)) return 'Scrape Failed';
  return flagReason;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function LeadReviewDetail({ queryId }) {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Lets the Lead Review index deep-link straight to the failed leads for a query
  // (?showFlagged=true) instead of landing here and making you toggle it yourself.
  const [showFlagged, setShowFlagged] = useState(searchParams.get('showFlagged') === 'true');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [resultsError, setResultsError] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [excludingId, setExcludingId] = useState(null);
  const [toast, showToast] = useToast();
  const [queryStats, setQueryStats] = useState(null);
  const { batches, startBatch } = useScrapeTracker();
  const scrapingIds = batches[queryId] || [];

  const fetchQueryStats = useCallback(async () => {
    // Best-effort — this only drives the status badge, so a failure here (e.g. a
    // stale queryId) shouldn't break the rest of the page, which still works fine
    // via the results[0]?.query?.text fallback below.
    try {
      const data = await getQuery(queryId);
      setQueryStats(data);
    } catch {
      setQueryStats(null);
    }
  }, [queryId]);

  useEffect(() => {
    fetchQueryStats();
  }, [fetchQueryStats]);

  const fetchResults = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const data = await getQueryResults({ queryId, page: targetPage, pageSize: PAGE_SIZE, includeFlagged: showFlagged });
        setResults(data.results);
        setTotal(data.total);
        setPage(data.page);
        setSelectedIds(new Set());
        setResultsError(false);
      } catch {
        // Without this, a failed fetch left the table stuck on "Loading results…"
        // forever with no way out except navigating away and back.
        setResultsError(true);
      } finally {
        setLoading(false);
      }
    },
    [queryId, showFlagged] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Reset to page 1 whenever the query or the flagged-visibility filter changes —
  // otherwise you could land on "page 3" of a filter that now only has 1 page.
  useEffect(() => {
    fetchResults(1);
  }, [queryId, showFlagged]); // eslint-disable-line react-hooks/exhaustive-deps

  // The scrape-status poll interval below is created once per batch and can run for
  // a while — it must always act on the *current* page/fetchResults, not whatever
  // they were when the batch started, otherwise finishing a scrape after the user
  // has since changed page or toggled "Show flagged" would refetch stale state.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  const fetchResultsRef = useRef(fetchResults);
  useEffect(() => {
    fetchResultsRef.current = fetchResults;
  }, [fetchResults]);
  const fetchQueryStatsRef = useRef(fetchQueryStats);
  useEffect(() => {
    fetchQueryStatsRef.current = fetchQueryStats;
  }, [fetchQueryStats]);

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
    try {
      await flagQueryResult(id, flagReason);
      // Re-fetch rather than patch locally — flagging can remove this row from the
      // current filtered/paginated view entirely (e.g. when "Show flagged" is off).
      await fetchResults(page);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to flag this lead. Please try again.', 'error');
    }
  };

  const handleUnflag = async (id) => {
    try {
      await unflagQueryResult(id);
      await fetchResults(page);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to unflag this lead. Please try again.', 'error');
    }
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

  // The actual polling now lives in ScrapeTrackerProvider (mounted in Layout, above
  // the router) so it — and the completion toast — survive navigating away from this
  // page. This just watches for *this* query's batch going from in-flight to resolved
  // while we're still mounted here, to refresh the visible table and status badge live.
  const wasScrapingRef = useRef(scrapingIds.length > 0);
  useEffect(() => {
    const isScraping = scrapingIds.length > 0;
    if (wasScrapingRef.current && !isScraping) {
      fetchResultsRef.current(pageRef.current);
      fetchQueryStatsRef.current();
    }
    wasScrapingRef.current = isScraping;
  }, [scrapingIds.length]);

  const handleScrapeSelected = async () => {
    setScraping(true);
    try {
      const ids = [...selectedIds];
      const { count } = await scrapeQueryResults(ids);
      startBatch(queryId, ids);
      setSelectedIds(new Set());
      showToast(`Scraping ${count} URL${count === 1 ? '' : 's'} started…`);
    } catch (err) {
      // Same caveat as QueryManager's runQuery — the backend dispatches to n8n
      // fire-and-forget, so this only catches request-level failures. A failure inside
      // the scrape itself is flagged per-result later via scrape-complete's sentinel check.
      showToast(err.response?.data?.error || 'Failed to start scraping. Please try again.', 'error');
    } finally {
      setScraping(false);
    }
  };

  // queryStats is the source of truth for the scrape status/date — falling back to
  // the text embedded in a result row only covers the brief window before queryStats
  // has loaded, since QueryManager already shows when this query was searched and
  // that's not what this page needs to communicate.
  const queryText = queryStats?.text || results[0]?.query?.text;

  return (
    <div>
      <Link to="/leads" className="text-sm text-blue-600 hover:underline">
        ← Back to Lead Review
      </Link>

      <h1 className="text-2xl font-semibold text-slate-800 mt-2">
        {queryText || 'Query leads'}
      </h1>
      <div className="mt-1 flex items-center gap-2">
        {scrapingIds.length > 0 ? (
          // Overrides the queryStats-derived badge below — otherwise it'd sit right
          // above the "scraping in the background" banner still saying "Not started".
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Running in background
          </span>
        ) : (
          <>
            {queryStats?.scrapeStatus && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${SCRAPE_STATUS_STYLES[queryStats.scrapeStatus] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {SCRAPE_STATUS_LABELS[queryStats.scrapeStatus] ?? queryStats.scrapeStatus}
              </span>
            )}
            {queryStats?.lastScrapeActivityAt && (
              <span className="text-xs text-slate-500">
                {new Date(queryStats.lastScrapeActivityAt).toLocaleString()}
              </span>
            )}
          </>
        )}
      </div>

      {scrapingIds.length > 0 ? (
        // Persistent for as long as the batch is unresolved — unlike the toast, this
        // doesn't auto-dismiss, so it stays visible the whole time scraping is
        // actually happening in the background instead of just flashing briefly.
        <div className="mt-4 flex items-center gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <LoadingSpinner className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Scraping {scrapingIds.length} lead{scrapingIds.length === 1 ? '' : 's'} in the background…
          </span>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showFlagged}
              onChange={(e) => setShowFlagged(e.target.checked)}
            />
            Show flagged
          </label>
        </div>
      ) : (
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
      )}

      {showFlagged && (
        <p className="mt-2 text-xs text-slate-500">Showing all leads, including flagged ones.</p>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading results…</p>
        ) : resultsError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load leads.</p>
            <button
              onClick={() => fetchResults(page)}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
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
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                  {/* Dimming lives on these individual cells rather than the whole row —
                      opacity on the <tr> would cap the Flag column's action buttons at
                      the same faded brightness, since a child can't render brighter than
                      an ancestor's opacity allows. */}
                  <td className={`py-2 pr-4 ${r.flagged ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      disabled={r.flagged}
                      onChange={() => toggleSelected(r.id)}
                    />
                  </td>
                  <td className={`py-2 pr-4 text-slate-800 ${r.flagged ? 'opacity-40' : ''}`}>
                    {r.businessName || '—'}
                  </td>
                  <td className={`py-2 pr-4 ${r.flagged ? 'opacity-40' : ''}`}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {r.url}
                    </a>
                  </td>
                  <td className={`py-2 pr-4 text-slate-500 ${r.flagged ? 'opacity-40' : ''}`}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    {r.flagged ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isAutoFlag(r.flagReason) ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {formatFlagReason(r.flagReason)}
                        </span>
                        <button
                          onClick={() => handleExcludeDomain(r.id, r.url)}
                          disabled={excludingId === r.id}
                          className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                        >
                          {excludingId === r.id ? 'Excluding…' : '+ Exclude domain'}
                        </button>
                        {/* Auto-flags come from the scrape itself failing, not a human
                            judgment call — there's nothing to "undo" here, unlike a
                            manually-picked reason like Directory or Forum. */}
                        {!isAutoFlag(r.flagReason) && (
                          <button
                            onClick={() => handleUnflag(r.id)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            Unflag
                          </button>
                        )}
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
