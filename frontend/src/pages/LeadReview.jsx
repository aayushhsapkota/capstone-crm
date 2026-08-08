import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getQueryResults, scrapeQueryResults, flagQueryResult } from '../api/queryResults.js';

const FLAG_REASONS = ['Directory', 'Irrelevant', 'Duplicate'];

export default function LeadReview() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('queryId');

  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleScrapeSelected = async () => {
    setScraping(true);
    try {
      const { count } = await scrapeQueryResults([...selectedIds]);
      setMessage(`Scraping ${count} URL${count === 1 ? '' : 's'}…`);
      setSelectedIds(new Set());
    } finally {
      setScraping(false);
    }
  };

  const selectableCount = results.filter((r) => !r.flagged).length;

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

      {selectedIds.size > 0 && (
        <div className="mt-4 flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-md">
          <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
          <button
            onClick={handleScrapeSelected}
            disabled={scraping}
            className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50"
          >
            {scraping ? 'Scraping…' : 'Scrape Selected'}
          </button>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading results…</p>
        ) : results.length === 0 ? (
          <p className="text-slate-400 text-sm">No unscraped leads found.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium w-8"></th>
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
                      <span className="text-xs text-slate-500">{r.flagReason}</span>
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

      {!loading && results.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">{selectableCount} selectable for scraping.</p>
      )}
    </div>
  );
}
