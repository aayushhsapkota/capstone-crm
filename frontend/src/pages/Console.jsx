import { useState, useEffect, useCallback } from 'react';
import { getBusinesses, getBusiness, updateBusiness } from '../api/businesses.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ThreadView from '../components/ThreadView.jsx';
import EmailComposer from '../components/EmailComposer.jsx';
import BulkSendModal from '../components/BulkSendModal.jsx';

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

export default function Console() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');

  const fetchBusinesses = useCallback(async () => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    const data = await getBusinesses(params);
    setBusinesses(data.businesses);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const loadBusinessDetail = useCallback(async (id) => {
    const data = await getBusiness(id);
    setSelectedBusiness(data);
  }, []);

  useEffect(() => {
    if (selectedId) loadBusinessDetail(selectedId);
  }, [selectedId, loadBusinessDetail]);

  const toggleChecked = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (newStatus) => {
    const updated = await updateBusiness(selectedBusiness.id, { status: newStatus });
    setSelectedBusiness((prev) => ({ ...prev, ...updated }));
    setBusinesses((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, status: updated.status } : b))
    );
  };

  const handleEmailSent = () => {
    loadBusinessDetail(selectedBusiness.id);
    fetchBusinesses();
  };

  const handleCampaignStarted = (result) => {
    setShowBulkModal(false);
    setCheckedIds(new Set());
    setCampaignMessage(`Campaign started — ${result.totalCount} businesses queued.`);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className="w-80 shrink-0 flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses…"
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace(/_/g, ' ') : 'All statuses'}
              </option>
            ))}
          </select>
        </div>

        {checkedIds.size >= 2 && (
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">{checkedIds.size} selected</span>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700"
            >
              Send Bulk
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {businesses.length === 0 ? (
            <p className="text-slate-400 text-sm p-4">No businesses found.</p>
          ) : (
            businesses.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                  selectedId === b.id ? 'bg-slate-100' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(b.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleChecked(b.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{b.name}</div>
                  <div className="text-xs text-slate-500 truncate">{b.email || 'no email'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-4 overflow-hidden">
        {!selectedBusiness ? (
          <p className="text-slate-400 text-sm">Select a business to view the conversation.</p>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-800">{selectedBusiness.name}</h2>
                {selectedBusiness.unsubscribed && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    Unsubscribed
                  </span>
                )}
              </div>
              <StatusBadge status={selectedBusiness.status} onChange={handleStatusChange} />
            </div>

            <ThreadView emails={selectedBusiness.emails} />

            <EmailComposer businessId={selectedBusiness.id} onSent={handleEmailSent} />
          </>
        )}
      </div>

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
