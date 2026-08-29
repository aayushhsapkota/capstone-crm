import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueries } from '../api/queries.js';
import { SCRAPE_STATUS_LABELS, SCRAPE_STATUS_STYLES } from '../lib/scrapeStatus.js';
import { useScrapeTracker } from '../context/ScrapeTracker.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function LeadReviewIndex() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const { batches } = useScrapeTracker();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getQueries();
      setQueries(data);
      setLoadError(false);
    } catch {
      // A silent (background) refresh failing just leaves the table showing whatever
      // it last had — reasonable, no reason to disrupt the page for that. The initial
      // load failing is different: without this, it stayed stuck on "Loading…" forever.
      if (!silent) setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A batch resolving disappears from `batches` — that's the cue to silently refetch
  // so the badge moves from "Running in background" straight to the real outcome
  // (Completed / Completed with failures) instead of falling back to whatever the
  // status was before the scrape started. Silent so the table doesn't flash "Loading…"
  // for what's otherwise a background update.
  const prevBatchKeysRef = useRef(new Set());
  useEffect(() => {
    const currentKeys = new Set(Object.keys(batches));
    const hadCompletion = [...prevBatchKeysRef.current].some((k) => !currentKeys.has(k));
    if (hadCompletion) load(true);
    prevBatchKeysRef.current = currentKeys;
  }, [batches, load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Lead Review</h1>
      <p className="text-slate-500 mt-1">All your searches and where their scrape stands.</p>

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : loadError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load searches.</p>
            <button
              onClick={() => load()}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : queries.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No searches yet — run one in Query Manager to find new leads.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Query</th>
                <th className="py-2 pr-4 font-medium">Scrape Status</th>
                <th className="py-2 pr-4 font-medium">Leads to review</th>
                <th className="py-2 pr-4 font-medium">Failed</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr
                  key={q.id}
                  onClick={() =>
                    // Nothing pending means the default (unflagged) view would just be an
                    // empty "no leads to review" page — go straight to flagged instead of
                    // making the row click a dead end that still needs a manual toggle.
                    navigate(`/leads?queryId=${q.id}${q.pendingLeadsCount === 0 ? '&showFlagged=true' : ''}`)
                  }
                  className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <td className="py-2 pr-4 text-slate-800">{q.text}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-0.5">
                      {(batches[q.id]?.length || 0) > 0 ? (
                        <span className="w-fit flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <LoadingSpinner className="w-2.5 h-2.5" /> Running in background
                        </span>
                      ) : (
                        <>
                          <span
                            className={`w-fit px-2 py-0.5 rounded-full text-xs font-medium ${SCRAPE_STATUS_STYLES[q.scrapeStatus] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {SCRAPE_STATUS_LABELS[q.scrapeStatus] ?? q.scrapeStatus}
                          </span>
                          {q.lastScrapeActivityAt && (
                            <span className="text-xs text-slate-400">
                              {new Date(q.lastScrapeActivityAt).toLocaleString()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {q.pendingLeadsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {q.pendingLeadsCount}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {q.failedLeadsCount > 0 ? (
                      <button
                        onClick={(e) => {
                          // Otherwise the row's own onClick would also fire and navigate
                          // without the showFlagged param, undoing the deep link.
                          e.stopPropagation();
                          navigate(`/leads?queryId=${q.id}&showFlagged=true`);
                        }}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        {q.failedLeadsCount} failed — view
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
