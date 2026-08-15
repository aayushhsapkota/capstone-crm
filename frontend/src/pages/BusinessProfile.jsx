import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBusiness, updateBusiness } from '../api/businesses.js';

const FIELDS = [
  { key: 'name', label: 'Business Name' },
  { key: 'specialisation', label: 'Specialisation' },
  { key: 'location', label: 'Location' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'contactFirstName', label: 'Contact First Name' },
  { key: 'contactLastName', label: 'Contact Last Name' },
  { key: 'services', label: 'Services' },
  { key: 'awards', label: 'Awards' },
  { key: 'yearsExperience', label: 'Years Experience' },
];

let rowKey = 0;

// The backend forwards Prisma's own error message verbatim (e.g. "Unique constraint
// failed on the fields: (`email`)") — readable enough to debug, not to show a user.
// This is currently the only case that can realistically happen here (email is the
// only unique field on Business), so it's translated specifically rather than
// generically parsed.
function friendlySaveError(message) {
  if (message?.includes('Unique constraint') && message?.includes('email')) {
    return 'That email is already used by another business — each business needs a unique email.';
  }
  return message || 'Failed to save. Please try again.';
}

export default function BusinessProfile() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [attrRows, setAttrRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      // silent=true is for the refetch right after a successful save — toggling
      // `loading` there replaces the whole form with a one-line "Loading business…"
      // paragraph for a moment, which collapses the page's height and makes the
      // browser snap the scroll position to the top. Not needed for a page that's
      // already fully loaded and just needs its data refreshed in place.
      if (!silent) setLoading(true);
      try {
        const business = await getBusiness(id);
        const initialForm = {};
        FIELDS.forEach(({ key }) => {
          initialForm[key] = business[key] ?? '';
        });
        setForm({ ...initialForm, id: business.id, imageUrl: business.imageUrl, scrapedAt: business.scrapedAt });
        setAttrRows(
          Object.entries(business.customAttrs || {}).map(([key, value]) => ({
            _id: rowKey++,
            key,
            value: value ?? '',
          }))
        );
        setLoadError(false);
      } catch {
        // Without this, a failed fetch left the page stuck on "Loading business…"
        // forever with no way out except navigating away and back.
        if (!silent) setLoadError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAttrChange = (rowId, field, value) => {
    setAttrRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, [field]: value } : r)));
  };

  const handleAddAttr = () => {
    setAttrRows((prev) => [...prev, { _id: rowKey++, key: '', value: '' }]);
  };

  const handleRemoveAttr = (rowId) => {
    setAttrRows((prev) =>
      prev.map((r) => (r._id === rowId ? { ...r, _removed: true } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const customAttrs = {};
      attrRows.forEach((row) => {
        if (!row.key.trim()) return;
        customAttrs[row.key.trim()] = row._removed ? null : row.value;
      });

      const patch = {};
      FIELDS.forEach(({ key }) => {
        patch[key] = form[key] || null;
      });
      patch.customAttrs = customAttrs;

      await updateBusiness(id, patch);
      setMessage('Saved.');
      await load(true);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      // Previously uncaught — a failed save (e.g. a duplicate email hitting the
      // unique constraint) looked exactly like "nothing happens": no error shown,
      // the form just sat there with your edits still in it.
      setSaveError(friendlySaveError(err.response?.data?.error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading business…</p>;
  }

  if (loadError || !form) {
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

  const visibleAttrRows = attrRows.filter((r) => !r._removed);

  return (
    <div className="max-w-3xl">
      <Link to={`/console?businessId=${id}`} className="text-sm text-blue-600 hover:underline">
        ← Back to email composer
      </Link>

      <div className="flex items-center gap-4 mt-3">
        {form.imageUrl ? (
          <img
            src={form.imageUrl}
            alt={form.name}
            className="w-16 h-16 rounded-lg object-cover bg-slate-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-semibold">
            {form.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{form.name || 'Business Profile'}</h1>
          {form.scrapedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Scraped {new Date(form.scrapedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Custom Attributes</h3>
          <button
            onClick={handleAddAttr}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            + Add field
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {visibleAttrRows.length === 0 ? (
            <p className="text-slate-400 text-xs">No custom fields.</p>
          ) : (
            visibleAttrRows.map((row) => (
              <div key={row._id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => handleAttrChange(row._id, 'key', e.target.value)}
                  placeholder="Field name"
                  className="w-1/3 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => handleAttrChange(row._id, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleRemoveAttr(row._id)}
                  className="text-slate-400 hover:text-red-600 text-sm px-2"
                  aria-label="Remove field"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {saveError && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {saveError}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {message && <span className="text-sm text-green-600">{message}</span>}
      </div>
    </div>
  );
}
