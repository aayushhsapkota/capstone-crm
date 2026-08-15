import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getBusiness, updateBusiness } from '../api/businesses.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ThreadView from '../components/ThreadView.jsx';
import EmailComposer from '../components/EmailComposer.jsx';

export default function BusinessThread({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getBusiness(businessId);
    setBusiness(data);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    const updated = await updateBusiness(business.id, { status: newStatus });
    setBusiness((prev) => ({ ...prev, ...updated }));
  };

  const handleEmailSent = () => {
    load();
  };

  if (loading || !business) {
    return <p className="text-slate-400 text-sm">Loading business…</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <Link to="/console" className="text-sm text-blue-600 hover:underline">
        ← Back to Businesses
      </Link>

      <div className="flex items-center justify-between pb-3 mt-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-800">{business.name}</h1>
          <Link to={`/businesses/${business.id}`} className="text-xs text-blue-600 hover:underline">
            Edit profile
          </Link>
          {business.unsubscribed && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              Unsubscribed
            </span>
          )}
        </div>
        <StatusBadge status={business.status} onChange={handleStatusChange} />
      </div>

      <ThreadView emails={business.emails} />

      <EmailComposer businessId={business.id} onSent={handleEmailSent} />
    </div>
  );
}
