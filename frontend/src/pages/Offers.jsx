import { useState, useEffect, useCallback, useRef } from 'react';
import { getOffers, createOffer, updateOffer, deleteOffer } from '../api/offers.js';
import ImageUrlField from '../components/ImageUrlField.jsx';

const EMPTY_FORM = {
  name: '',
  headline: '',
  discountPercent: '',
  durationLabel: '',
  ctaText: '',
  bodyNotes: '',
  imageUrl: '',
};

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const imageFieldRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOffers();
      setOffers(data);
      setLoadError(false);
    } catch {
      // Without this, a failed fetch left the page stuck on "Loading offers…" forever.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (offer) => {
    setEditingId(offer.id);
    setForm({
      name: offer.name || '',
      headline: offer.headline || '',
      discountPercent: offer.discountPercent ?? '',
      durationLabel: offer.durationLabel || '',
      ctaText: offer.ctaText || '',
      bodyNotes: offer.bodyNotes || '',
      imageUrl: offer.imageUrl || '',
    });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Any picked-but-not-yet-uploaded image gets uploaded now, right before the
      // offer itself is saved — not when the file was originally picked.
      const imageUrl = (await imageFieldRef.current?.commitPendingUpload()) ?? form.imageUrl;

      const payload = {
        name: form.name.trim(),
        headline: form.headline.trim(),
        discountPercent: form.discountPercent === '' ? null : Number(form.discountPercent),
        durationLabel: form.durationLabel.trim() || null,
        ctaText: form.ctaText.trim() || null,
        bodyNotes: form.bodyNotes.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      };

      if (editingId) {
        await updateOffer(editingId, payload);
      } else {
        await createOffer(payload);
      }

      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save offer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteOffer(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete offer.');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Offers</h1>
          <p className="text-slate-500 mt-1">Discounts and promotions used in offer emails.</p>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700"
        >
          + New Offer
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <div className="mt-6 border border-slate-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-semibold text-slate-700">
            {editingId ? 'Edit Offer' : 'New Offer'}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g. First Placement Discount"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Headline</label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => handleFieldChange('headline', e.target.value)}
                placeholder="e.g. 15% off your first month"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Discount %</label>
              <input
                type="number"
                value={form.discountPercent}
                onChange={(e) => handleFieldChange('discountPercent', e.target.value)}
                placeholder="15"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Duration Label</label>
              <input
                type="text"
                value={form.durationLabel}
                onChange={(e) => handleFieldChange('durationLabel', e.target.value)}
                placeholder="e.g. the first month"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">CTA Text</label>
              <input
                type="text"
                value={form.ctaText}
                onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                placeholder="e.g. Book a Free Consultation"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <ImageUrlField
                ref={imageFieldRef}
                label="Header Image"
                value={form.imageUrl}
                onChange={(url) => handleFieldChange('imageUrl', url)}
                placeholder="https://example.com/offer-header.jpg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Extra Notes for AI</label>
              <textarea
                value={form.bodyNotes}
                onChange={(e) => handleFieldChange('bodyNotes', e.target.value)}
                rows={3}
                placeholder="Extra context passed to the AI when generating offer emails"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.headline.trim()}
              className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 border border-slate-300 text-sm rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading offers…</p>
        ) : loadError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load offers.</p>
            <button
              onClick={load}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : offers.length === 0 ? (
          <p className="text-slate-400 text-sm">No offers yet.</p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-white"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">{offer.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {offer.headline}
                    {offer.discountPercent != null && ` — ${offer.discountPercent}%`}
                    {offer.durationLabel && ` for ${offer.durationLabel}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditForm(offer)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded-md text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
