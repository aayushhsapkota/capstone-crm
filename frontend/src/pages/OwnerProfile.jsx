import { useState, useEffect, useCallback } from 'react';
import { getOwnerProfile, saveOwnerProfile } from '../api/ownerProfile.js';

let rowKey = 0;

export default function OwnerProfile() {
  const [form, setForm] = useState(null);
  const [serviceRows, setServiceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const profile = await getOwnerProfile();
    setForm({
      id: profile.id,
      companyName: profile.companyName || '',
      senderName: profile.senderName || '',
      senderEmail: profile.senderEmail || '',
      specialisation: profile.specialisation || '',
      signatureHtml: profile.signatureHtml || '',
    });
    setServiceRows((profile.services || []).map((value) => ({ _id: rowKey++, value })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleServiceChange = (rowId, value) => {
    setServiceRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, value } : r)));
  };

  const handleAddService = () => {
    setServiceRows((prev) => [...prev, { _id: rowKey++, value: '' }]);
  };

  const handleRemoveService = (rowId) => {
    setServiceRows((prev) => prev.filter((r) => r._id !== rowId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const services = serviceRows.map((r) => r.value.trim()).filter(Boolean);
      const updated = await saveOwnerProfile({
        companyName: form.companyName,
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        specialisation: form.specialisation || null,
        signatureHtml: form.signatureHtml || null,
        services,
      });
      setForm((prev) => ({ ...prev, id: updated.id }));
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <p className="text-slate-400 text-sm">Loading profile…</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800">Owner Profile</h1>
      <p className="text-slate-500 mt-1">Company info, services, and email signature.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Company Name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => handleFieldChange('companyName', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Sender Name</label>
          <input
            type="text"
            value={form.senderName}
            onChange={(e) => handleFieldChange('senderName', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Sender Email</label>
          <input
            type="email"
            value={form.senderEmail}
            onChange={(e) => handleFieldChange('senderEmail', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Specialisation</label>
          <input
            type="text"
            value={form.specialisation}
            onChange={(e) => handleFieldChange('specialisation', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Services</h3>
          <button
            onClick={handleAddService}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            + Add service
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {serviceRows.length === 0 ? (
            <p className="text-slate-400 text-xs">No services added.</p>
          ) : (
            serviceRows.map((row) => (
              <div key={row._id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => handleServiceChange(row._id, e.target.value)}
                  placeholder="e.g. Teeth Whitening"
                  className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleRemoveService(row._id)}
                  className="text-slate-400 hover:text-red-600 text-sm px-2"
                  aria-label="Remove service"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-700">Email Signature</h3>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">HTML</label>
            <textarea
              value={form.signatureHtml}
              onChange={(e) => handleFieldChange('signatureHtml', e.target.value)}
              rows={6}
              placeholder="<p>Best regards,<br/>Your Name</p>"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Preview</label>
            <div
              className="border border-slate-200 rounded-md px-3 py-2 text-sm min-h-[9.5rem] bg-slate-50"
              dangerouslySetInnerHTML={{ __html: form.signatureHtml }}
            />
          </div>
        </div>
      </div>

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
