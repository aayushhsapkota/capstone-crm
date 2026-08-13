import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueries } from '../api/queries.js';

export default function LeadReviewIndex() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getQueries();
    setQueries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Only searches with something still actionable — a query where every lead has
  // already been scraped or flagged has nothing left to review, so it'd just be
  // clutter here. QueryManager remains the place to browse full search history.
  const needsReview = queries.filter((q) => q.pendingLeadsCount > 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Lead Review</h1>
      <p className="text-slate-500 mt-1">Searches with leads still waiting to be reviewed.</p>

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : needsReview.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Nothing to review right now — run a search in Query Manager to find new leads.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Query</th>
                <th className="py-2 pr-4 font-medium">Scraped</th>
                <th className="py-2 pr-4 font-medium">Leads to review</th>
              </tr>
            </thead>
            <tbody>
              {needsReview.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/leads?queryId=${q.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2 pr-4 text-slate-800">{q.text}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {new Date(q.ranAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {q.pendingLeadsCount}
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
