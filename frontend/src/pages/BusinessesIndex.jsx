import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinesses } from '../api/businesses.js';
import BulkSendModal from '../components/BulkSendModal.jsx';
import { STATUS_STYLES } from '../components/StatusBadge.jsx';

const STATUS_FILTERS = [
  '',
  'NEW',
  'EMAIL_SENT',
  'AWAITING_REPLY',
  'FOLLOW_UP_SENT',
  'REPLIED',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const PAGE_SIZE = 50;

export default function BusinessesIndex() {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const navigate = useNavigate();

  const fetchBusinesses = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const params = { page: targetPage, limit: PAGE_SIZE };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        const data = await getBusinesses(params);
        setBusinesses(data.businesses);
        setTotal(data.total);
        setPage(data.page);
        // Scoped to the page actually loaded — a business checked before changing page
        // or filter shouldn't silently carry into a bulk send it's no longer visible in.
        setCheckedIds(new Set());
        setLoadError(false);
      } catch {
        // Without this, a failed fetch (initial load or Previous/Next) left the table
        // stuck on "Loading…" forever with no way out except navigating away and back.
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Reset to page 1 whenever the search or status filter changes — otherwise you
  // could land on "page 3" of a filter that now only has 1 page.
  useEffect(() => {
    fetchBusinesses(1);
  }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    fetchBusinesses(clamped);
  };

  const toggleChecked = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCampaignStarted = (result) => {
    setShowBulkModal(false);
    setCheckedIds(new Set());
    setCampaignMessage(`Campaign started — ${result.totalCount} businesses queued.`);
    setTimeout(() => setCampaignMessage(''), 4000);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Businesses</h1>
      <p className="text-slate-500 mt-1">Every business you've scraped or added, in one place.</p>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses…"
          className="w-64 border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace(/_/g, ' ') : 'All statuses'}
            </option>
          ))}
        </select>

        {checkedIds.size >= 2 && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="ml-auto px-3 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700"
          >
            Send Bulk ({checkedIds.size})
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : loadError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load businesses.</p>
            <button
              onClick={() => fetchBusinesses(page)}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : businesses.length === 0 ? (
          <p className="text-slate-400 text-sm">No businesses found.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium w-8"></th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Specialisation</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => navigate(`/console?businessId=${b.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(b.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleChecked(b.id)}
                    />
                  </td>
                  <td className="py-2 pr-4 text-slate-800">
                    <div className="flex items-center gap-2">
                      <span>{b.name}</span>
                      {b.unsubscribed && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full whitespace-nowrap">
                          Unsubscribed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${
                        STATUS_STYLES[b.status] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{b.location || '—'}</td>
                  <td className="py-2 pr-4 text-slate-600">{b.specialisation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">{total} business{total === 1 ? '' : 'es'}</p>
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

      {showBulkModal && (
        <BulkSendModal
          businessIds={[...checkedIds]}
          onStart={handleCampaignStarted}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {campaignMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm px-4 py-2 rounded-md shadow-lg">
          {campaignMessage}
        </div>
      )}
    </div>
  );
}
