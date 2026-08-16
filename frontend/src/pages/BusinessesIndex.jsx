import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinesses, getBusinessIds } from '../api/businesses.js';
import BulkSendModal from '../components/BulkSendModal.jsx';
import AddBusinessModal from '../components/AddBusinessModal.jsx';
import { STATUS_STYLES } from '../components/StatusBadge.jsx';
import { useShowToast } from '../context/ToastContext.jsx';

// A single dropdown mixing three different underlying filters (status, unsubscribed,
// and "no email") — the value's prefix says which one a given option maps to, decoded
// by filterToParams() below. Kept to a short, commonly-needed subset of statuses
// rather than the full BusinessStatus enum, since this list is meant to stay scannable.
const FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'status:NEW', label: 'NEW' },
  { value: 'status:EMAIL_SENT', label: 'EMAIL SENT' },
  { value: 'status:CLOSED_WON', label: 'CLOSED WON' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'no_email', label: 'No email' },
];

function filterToParams(filter) {
  if (!filter) return {};
  if (filter.startsWith('status:')) return { status: filter.slice(7) };
  if (filter === 'unsubscribed') return { unsubscribed: true };
  if (filter === 'no_email') return { hasEmail: false };
  return {};
}

const PAGE_SIZE = 50;

export default function BusinessesIndex() {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  // True once "Select all N businesses" (across every page) has been used — distinct
  // from just having every row on the current page checked, since that's still only
  // this page's worth of ids.
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();
  const showToast = useShowToast();
  const selectAllRef = useRef(null);

  const fetchBusinesses = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const params = { page: targetPage, limit: PAGE_SIZE, ...filterToParams(filter) };
        if (search) params.search = search;
        const data = await getBusinesses(params);
        setBusinesses(data.businesses);
        setTotal(data.total);
        setPage(data.page);
        // Scoped to the page actually loaded — a business checked before changing page
        // or filter shouldn't silently carry into a bulk send it's no longer visible in.
        setCheckedIds(new Set());
        setSelectAllMatching(false);
        setLoadError(false);
      } catch {
        // Without this, a failed fetch (initial load or Previous/Next) left the table
        // stuck on "Loading…" forever with no way out except navigating away and back.
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [search, filter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Reset to page 1 whenever the search or filter changes — otherwise you could land
  // on "page 3" of a filter that now only has 1 page.
  useEffect(() => {
    fetchBusinesses(1);
  }, [search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    fetchBusinesses(clamped);
  };

  const toggleChecked = (id) => {
    // Unchecking any single row means the selection is no longer "every matching
    // business" — fall back to plain per-id tracking rather than pretending the
    // rest of the matches are still included.
    setSelectAllMatching(false);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageChecked = businesses.length > 0 && businesses.every((b) => checkedIds.has(b.id));
  const someOnPageChecked = checkedIds.size > 0 && !allOnPageChecked;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPageChecked;
  }, [someOnPageChecked]);

  const toggleSelectAllOnPage = () => {
    setSelectAllMatching(false);
    setCheckedIds((prev) => {
      if (allOnPageChecked) {
        const next = new Set(prev);
        businesses.forEach((b) => next.delete(b.id));
        return next;
      }
      return new Set([...prev, ...businesses.map((b) => b.id)]);
    });
  };

  // Fetches every id matching the current search/status filter, not just the page
  // that's currently loaded — ids only, not full rows, since all a bulk send ever
  // needs from this is the id list.
  const handleSelectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const params = { ...filterToParams(filter) };
      if (search) params.search = search;
      const ids = await getBusinessIds(params);
      setCheckedIds(new Set(ids));
      setSelectAllMatching(true);
    } catch {
      // Leaves the current page-scoped selection intact — the user can just try
      // again, same as any other retryable action in this app.
    } finally {
      setSelectingAll(false);
    }
  };

  const clearSelection = () => {
    setCheckedIds(new Set());
    setSelectAllMatching(false);
  };

  const handleCampaignStarted = (result) => {
    setShowBulkModal(false);
    clearSelection();
    showToast(`Campaign started — ${result.totalCount} businesses queued.`);
    // Uses the global toast (not local state) specifically so it survives this
    // navigation — going straight to Campaigns is more useful than staying here to
    // watch a list of businesses you just finished selecting.
    navigate('/campaigns');
  };

  const handleBusinessAdded = (business) => {
    setShowAddModal(false);
    // Newly added shows up at the top (list is ordered by createdAt desc) — jump back
    // to page 1 so it's actually visible rather than wherever the list happened to be
    // scrolled/paged to.
    fetchBusinesses(1);
    showToast(`${business.name} added.`);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Businesses</h1>
      <p className="text-slate-500 mt-1">Every business you've scraped or added, in one place.</p>

      <div className="mt-4 flex items-center gap-2">
        {/* h-9 on every control in this row — items-center alone leaves them at the
            mercy of each element's own natural sizing, and a native <select>'s height
            doesn't always match an <input>/<button> pixel-for-pixel across browsers
            (OS-drawn dropdown chrome), even with identical padding. An explicit shared
            height sidesteps that instead of just centering around the mismatch. */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses…"
          className="w-64 h-9 border border-slate-300 rounded-md px-3 text-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 border border-slate-300 rounded-md px-2 text-sm"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowAddModal(true)}
          className="ml-auto h-9 px-3 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
        >
          + Add Business
        </button>

        {checkedIds.size >= 2 && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="h-9 px-3 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            Send Bulk ({checkedIds.size})
          </button>
        )}
      </div>

      {/* Only worth offering once every row on the page is checked and there's
          actually more elsewhere — otherwise "select all" already means all of it. */}
      {allOnPageChecked && total > businesses.length && !selectAllMatching && (
        <p className="mt-2 text-xs text-slate-500">
          All {businesses.length} on this page are selected.{' '}
          <button
            onClick={handleSelectAllMatching}
            disabled={selectingAll}
            className="text-blue-600 hover:underline disabled:opacity-50"
          >
            {selectingAll ? 'Selecting…' : `Select all ${total} matching businesses`}
          </button>
        </p>
      )}
      {selectAllMatching && (
        <p className="mt-2 text-xs text-slate-500">
          All {checkedIds.size} matching businesses are selected.{' '}
          <button onClick={clearSelection} className="text-blue-600 hover:underline">
            Clear selection
          </button>
        </p>
      )}

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
                <th className="py-2 pr-4 font-medium w-8">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageChecked}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all on this page"
                  />
                </th>
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
                  className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
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
                      {!b.email && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">
                          No email
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

      {showAddModal && (
        <AddBusinessModal onAdded={handleBusinessAdded} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
