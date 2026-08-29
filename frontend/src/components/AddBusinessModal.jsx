import { useState } from 'react';
import { scrapeBusinessFromWebsite, createBusiness } from '../api/businesses.js';
import { BUSINESS_FIELDS, friendlySaveError } from '../lib/businessFields.js';

const EMPTY_FORM = BUSINESS_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: '' }), {});

export default function AddBusinessModal({ onAdded, onClose }) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  // null until a scrape succeeds — the review/edit form only appears once there's
  // something to review, same "draft, then explicit save" shape as Owner Profile's
  // "Fetch from website" and the signature/template generators elsewhere in this app.
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleScrape = async () => {
    if (!websiteUrl.trim()) return;
    setFetching(true);
    setFetchError('');
    try {
      const draft = await scrapeBusinessFromWebsite(websiteUrl.trim());
      // Website doesn't need extracting — it's exactly the URL just typed above,
      // stripped to match how this field is stored elsewhere (bare domain, no
      // protocol) — same fix applied to Owner Profile's own "Fetch from website".
      const website = websiteUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      setForm({
        ...EMPTY_FORM,
        ...draft,
        website: website || draft.website || '',
      });
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to fetch business info. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = {};
      BUSINESS_FIELDS.forEach(({ key }) => {
        payload[key] = form[key]?.trim() || null;
      });
      const business = await createBusiness(payload);
      onAdded(business);
    } catch (err) {
      setSaveError(friendlySaveError(err.response?.data?.error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Add Business</h2>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Website URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScrape();
                }
              }}
              placeholder="https://theirbusiness.com"
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              onClick={handleScrape}
              disabled={fetching || !websiteUrl.trim()}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 shrink-0"
            >
              {fetching ? 'Scraping…' : form ? '✦ Re-scrape' : '✦ Scrape'}
            </button>
          </div>
          {fetchError && <p className="mt-2 text-xs text-red-600">{fetchError}</p>}
        </div>

        {form && (
          <>
            <p className="text-xs text-slate-500">Review and edit before adding — extraction can be wrong.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUSINESS_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {saveError}
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
            onClick={handleAdd}
            disabled={!form || saving || !form.name?.trim()}
            className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add Business'}
          </button>
        </div>
      </div>
    </div>
  );
}
