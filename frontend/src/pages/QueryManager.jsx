import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueries, runQuery } from '../api/queries.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const STATUS_STYLES = {
  PENDING: 'bg-slate-100 text-slate-600',
  RUNNING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const IN_PROGRESS_STATUSES = new Set(['PENDING', 'RUNNING']);

export default function QueryManager() {
  const [text, setText] = useState('');
  const [limit, setLimit] = useState(3);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const pollIntervalRef = useRef(null);

  // Never throws — used by both the initial mount load and the 5s poll, which need to
  // react to a failure very differently (see call sites below). Returns null on failure
  // so callers can tell the two cases apart without a try/catch of their own.
  const fetchQueries = async () => {
    try {
      const data = await getQueries();
      setQueries(data);
      return data;
    } catch {
      return null;
    }
  };

  // n8n reports a query's real outcome (COMPLETE/FAILED) back to the server
  // asynchronously, well after this page's initial load — nothing pushes that update
  // to the browser on its own, so without polling a RUNNING query would look stuck
  // forever until a manual refresh. Only polls while something's actually in flight,
  // same pattern as useCampaignProgress.
  const startPolling = () => {
    // Guard against a second interval stacking up if this gets called again while one
    // is already running (e.g. mount finds a pending query, then handleSubmit calls
    // this too right after) — only one poll loop should ever be active at a time.
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      const data = await fetchQueries();
      // A transient failure here just means this tick didn't update anything — leave
      // the interval running rather than getting stuck one way or the other, same as
      // useNotifications' background poll.
      if (!data) return;
      const stillPending = data.some((q) => q.status === 'RUNNING' || q.status === 'PENDING');
      // Self-stopping: once nothing is left to wait on, clear the interval rather than
      // polling forever in the background for no reason.
      if (!stillPending) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 5000);
  };

  const loadInitial = async () => {
    setLoading(true);
    const data = await fetchQueries();
    setLoading(false);
    if (!data) {
      // Unlike the poll above, this is the very first load — without this, the page
      // was stuck on "Loading history…" forever with no indication anything failed.
      setLoadError(true);
      return;
    }
    setLoadError(false);
    // Only start polling if the list we just loaded actually has something in
    // flight — e.g. a query kicked off in a previous session/tab that hasn't
    // resolved yet. A page full of COMPLETE/FAILED queries has nothing to wait on.
    const hasPending = data.some((q) => q.status === 'RUNNING' || q.status === 'PENDING');
    if (hasPending) startPolling();
  };

  useEffect(() => {
    loadInitial();

    // Stop polling if the user navigates away mid-search, so it doesn't keep firing
    // requests for a component that's no longer on screen.
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const query = await runQuery(text.trim(), limit);
      setQueries((prev) => [query, ...prev]);
      setText('');
      // Polling may have already stopped (e.g. all earlier queries had finished) —
      // this new query is RUNNING, so make sure the poll loop is active again.
      startPolling();
    } catch (err) {
      // Backend dispatches to n8n fire-and-forget, so this only catches request-level
      // failures (network error, DB error creating the Query row) — not a failure
      // inside the search itself, which surfaces later via the query's FAILED status.
      setError(err.response?.data?.error || 'Failed to start query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Query Manager</h1>
      <p className="text-slate-500 mt-1">Run search queries and view history.</p>

      {error && (
        <div className="mt-4 max-w-xl text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2 max-w-xl">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. dental clinics in Sydney NSW"
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <input
          type="number"
          min={1}
          max={20}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          title="Number of results to fetch"
          className="w-16 border border-slate-300 rounded-md px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Running…' : 'Run Query'}
        </button>
      </form>

      <div className="mt-8">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading history…</p>
        ) : loadError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load query history.</p>
            <button
              onClick={loadInitial}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : queries.length === 0 ? (
          <p className="text-slate-400 text-sm">No queries yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Query</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Results</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/leads?queryId=${q.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <td className="py-2 pr-4 text-slate-800">{q.text}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {new Date(q.ranAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{q.resultsCount}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[q.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {IN_PROGRESS_STATUSES.has(q.status) && <LoadingSpinner />}
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
