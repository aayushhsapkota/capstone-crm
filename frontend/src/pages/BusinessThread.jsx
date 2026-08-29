import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getBusiness, updateBusiness } from '../api/businesses.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ThreadView from '../components/ThreadView.jsx';
import EmailComposer from '../components/EmailComposer.jsx';

export default function BusinessThread({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusError, setStatusError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getBusiness(businessId);
      setBusiness(data);
      setLoadError(false);
    } catch {
      // Without this, a failed fetch left the page stuck on "Loading business…"
      // forever with no way out except navigating away and back.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    setStatusError('');
    try {
      const updated = await updateBusiness(business.id, { status: newStatus });
      setBusiness((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setStatusError(err.response?.data?.error || 'Failed to update status. Please try again.');
    }
  };

  const handleEmailSent = () => {
    load();
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading business…</p>;
  }

  if (loadError || !business) {
    return (
      <div>
        <p className="text-sm text-red-600">Failed to load this business.</p>
        <button
          onClick={load}
          className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] min-w-0 md:h-[calc(100vh-6rem)]">
      <Link to="/console" className="text-sm text-blue-600 hover:underline">
        ← Back to Businesses
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mt-2 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl font-semibold text-slate-800 truncate">{business.name}</h1>
          <Link to={`/businesses/${business.id}`} className="text-xs text-blue-600 hover:underline shrink-0">
            Edit profile
          </Link>
        </div>
        <StatusBadge status={business.status} onChange={handleStatusChange} />
      </div>

      {statusError && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {statusError}
        </div>
      )}

      <ThreadView emails={business.emails} />

      <EmailComposer businessId={business.id} businessEmail={business.email} onSent={handleEmailSent} />
    </div>
  );
}
