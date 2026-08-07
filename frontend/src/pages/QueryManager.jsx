import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueries, runQuery } from '../api/queries.js';

const STATUS_STYLES = {
  PENDING: 'bg-slate-100 text-slate-600',
  RUNNING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function QueryManager() {
  const [text, setText] = useState('');
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchQueries = async () => {
    setLoading(true);
    const data = await getQueries();
    setQueries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const query = await runQuery(text.trim());
      setQueries((prev) => [query, ...prev]);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Query Manager</h1>
      <p className="text-slate-500 mt-1">Run search queries and view history.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2 max-w-xl">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. dental clinics in Sydney NSW"
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2 pr-4 text-slate-800">{q.text}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {new Date(q.ranAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{q.resultsCount}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[q.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
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
