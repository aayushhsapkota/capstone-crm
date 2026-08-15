import { useState } from 'react';
import OfferSelector from './OfferSelector.jsx';
import { createCampaign } from '../api/campaigns.js';

const DELAY_OPTIONS = [15, 30, 60];

export default function BulkSendModal({ businessIds, onStart, onClose }) {
  const [name, setName] = useState('');
  const [offerId, setOfferId] = useState(null);
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await createCampaign({ name, businessIds, offerId, delaySeconds });
      onStart(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">New Bulk Campaign</h2>
        <p className="text-sm text-slate-500">{businessIds.length} businesses selected</p>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Campaign name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. May Dental Offer"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Offer</label>
          <OfferSelector value={offerId} onChange={setOfferId} />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Delay between sends</label>
          <select
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          >
            {DELAY_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}s
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Starting…' : 'Start Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
