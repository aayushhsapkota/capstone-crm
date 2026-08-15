import { useState, useEffect, useCallback, useRef } from 'react';
import { getOwnerProfile, saveOwnerProfile, scrapeOwnerProfileFromWebsite } from '../api/ownerProfile.js';
import ImageUrlField from '../components/ImageUrlField.jsx';
import HtmlTemplateEditor from '../components/HtmlTemplateEditor.jsx';
import { buildSignatureHtml } from '../lib/signatureTemplate.js';
import {
  buildIntroTemplateHtml,
  buildOfferTemplateHtml,
  INTRO_PLACEHOLDERS,
  OFFER_PLACEHOLDERS,
} from '../lib/emailTemplate.js';

let rowKey = 0;

function toServiceRow(entry) {
  if (typeof entry === 'string') return { _id: rowKey++, service: entry, description: '' };
  return { _id: rowKey++, service: entry.service || '', description: entry.description || '' };
}

export default function OwnerProfile() {
  const [form, setForm] = useState(null);
  const [serviceRows, setServiceRows] = useState([]);
  const [excludeSites, setExcludeSites] = useState([]);
  const [newExcludeSite, setNewExcludeSite] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const logoFieldRef = useRef(null);
  const heroFieldRef = useRef(null);
  const signatureEditorRef = useRef(null);
  const introEditorRef = useRef(null);
  const offerEditorRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getOwnerProfile();
      setForm({
        id: profile.id,
        companyName: profile.companyName || '',
        senderName: profile.senderName || '',
        senderEmail: profile.senderEmail || '',
        specialisation: profile.specialisation || '',
        slogan: profile.slogan || '',
        website: profile.website || '',
        phone: profile.phone || '',
        signatureHtml: profile.signatureHtml || '',
        introTemplateHtml: profile.introTemplateHtml || '',
        offerTemplateHtml: profile.offerTemplateHtml || '',
        logoUrl: profile.logoUrl || '',
        heroImageUrl: profile.heroImageUrl || '',
      });
      setServiceRows((profile.services || []).map(toServiceRow));
      setExcludeSites(profile.excludeSites || []);
      setLoadError(false);
    } catch {
      // Without this, a failed fetch left the page stuck on "Loading profile…" forever.
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

  // Each of these both updates the saved form value and pushes the same html straight
  // into its editor's DOM (via the ref) — the editor doesn't watch the form value on
  // its own, so without the ref call "Generate" would update state but the visual view
  // wouldn't change until some unrelated re-render happened to remount it.
  const handleGenerateSignature = () => {
    const html = buildSignatureHtml({
      companyName: form.companyName,
      slogan: form.slogan,
      senderEmail: form.senderEmail,
      website: form.website,
      phone: form.phone,
      logoUrl: form.logoUrl,
    });
    handleFieldChange('signatureHtml', html);
    signatureEditorRef.current?.setContent(html);
  };

  const handleGenerateIntroTemplate = () => {
    const html = buildIntroTemplateHtml();
    handleFieldChange('introTemplateHtml', html);
    introEditorRef.current?.setContent(html);
  };

  const handleGenerateOfferTemplate = () => {
    const html = buildOfferTemplateHtml();
    handleFieldChange('offerTemplateHtml', html);
    offerEditorRef.current?.setContent(html);
  };

  const handleServiceChange = (rowId, field, value) => {
    setServiceRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, [field]: value } : r)));
  };

  const handleAddService = () => {
    setServiceRows((prev) => [...prev, { _id: rowKey++, service: '', description: '' }]);
  };

  const handleRemoveService = (rowId) => {
    setServiceRows((prev) => prev.filter((r) => r._id !== rowId));
  };

  const handleAddExcludeSite = () => {
    const site = newExcludeSite.trim().toLowerCase();
    if (!site || excludeSites.includes(site)) return;
    setExcludeSites((prev) => [...prev, site]);
    setNewExcludeSite('');
  };

  const handleRemoveExcludeSite = (site) => {
    setExcludeSites((prev) => prev.filter((s) => s !== site));
  };

  const handleFetchFromWebsite = async () => {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchError('');
    try {
      const draft = await scrapeOwnerProfileFromWebsite(fetchUrl.trim());
      // Pre-fills the form only — still requires clicking Save below, same as
      // reviewing an email draft before Send. LLM extraction can be wrong.
      setForm((prev) => ({
        ...prev,
        companyName: draft.companyName || prev.companyName,
        specialisation: draft.specialisation || prev.specialisation,
      }));
      if (draft.services?.length) {
        setServiceRows(draft.services.map(toServiceRow));
      }
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to fetch company info. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      // Any picked-but-not-yet-uploaded image gets uploaded now, right before the
      // profile itself is saved — not when the file was originally picked.
      const [logoUrl, heroImageUrl] = await Promise.all([
        logoFieldRef.current?.commitPendingUpload() ?? form.logoUrl,
        heroFieldRef.current?.commitPendingUpload() ?? form.heroImageUrl,
      ]);

      const services = serviceRows
        .map((r) => ({ service: r.service.trim(), description: r.description.trim() }))
        .filter((s) => s.service);
      const updated = await saveOwnerProfile({
        companyName: form.companyName,
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        specialisation: form.specialisation || null,
        slogan: form.slogan || null,
        website: form.website || null,
        phone: form.phone || null,
        signatureHtml: form.signatureHtml || null,
        introTemplateHtml: form.introTemplateHtml || null,
        offerTemplateHtml: form.offerTemplateHtml || null,
        logoUrl: logoUrl || null,
        heroImageUrl: heroImageUrl || null,
        services,
        excludeSites,
      });
      setForm((prev) => ({ ...prev, id: updated.id, logoUrl: logoUrl || '', heroImageUrl: heroImageUrl || '' }));
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading profile…</p>;
  }

  if (loadError || !form) {
    return (
      <div>
        <p className="text-sm text-red-600">Failed to load your profile.</p>
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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800">Owner Profile</h1>
      <p className="text-slate-500 mt-1">Company info, services, and email signature.</p>

      <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">✦ Fetch from website</h3>
        <p className="text-xs text-slate-500 mt-1">
          Have a company website? We'll pull in the name, specialisation, and services to
          save you typing them out — review and edit before saving.
        </p>
        {fetchError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {fetchError}
          </div>
        )}
        <div className="mt-3 flex gap-2 max-w-xl">
          <input
            type="text"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleFetchFromWebsite}
            disabled={fetching || !fetchUrl.trim()}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-white disabled:opacity-50"
          >
            {fetching ? 'Fetching…' : '✦ Fetch'}
          </button>
        </div>
      </div>

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
        <div>
          <label className="block text-xs text-slate-500 mb-1">Slogan</label>
          <input
            type="text"
            value={form.slogan}
            onChange={(e) => handleFieldChange('slogan', e.target.value)}
            placeholder={`e.g. "Care That Feels Like Family"`}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Website</label>
          <input
            type="text"
            value={form.website}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            placeholder="www.yourcompany.com"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="0400 000 000"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <ImageUrlField
            ref={logoFieldRef}
            label="Logo"
            value={form.logoUrl}
            onChange={(url) => handleFieldChange('logoUrl', url)}
            placeholder="https://example.com/logo.png"
          />
        </div>
        <div className="col-span-2">
          <ImageUrlField
            ref={heroFieldRef}
            label="Intro Email Header Image"
            value={form.heroImageUrl}
            onChange={(url) => handleFieldChange('heroImageUrl', url)}
            placeholder="https://example.com/intro-header.jpg"
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
              <div key={row._id} className="flex items-start gap-2">
                <input
                  type="text"
                  value={row.service}
                  onChange={(e) => handleServiceChange(row._id, 'service', e.target.value)}
                  placeholder="e.g. Teeth Whitening"
                  className="w-1/3 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => handleServiceChange(row._id, 'description', e.target.value)}
                  placeholder="Short description shown in the email"
                  className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleRemoveService(row._id)}
                  className="text-slate-400 hover:text-red-600 text-sm px-2 py-1.5"
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
        <h3 className="text-sm font-semibold text-slate-700">Excluded Sites</h3>
        <p className="text-xs text-slate-500 mt-1">
          Domains to exclude from every search query (e.g. directory sites). Add any
          industry-specific directories that clutter your results — these aren't
          assumed for you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {excludeSites.length === 0 ? (
            <p className="text-slate-400 text-xs">No excluded sites.</p>
          ) : (
            excludeSites.map((site) => (
              <span
                key={site}
                className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs rounded-full px-3 py-1"
              >
                {site}
                <button
                  onClick={() => handleRemoveExcludeSite(site)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${site}`}
                >
                  ✕
                </button>
              </span>
            ))
          )}
        </div>
        <div className="mt-3 flex gap-2 max-w-sm">
          <input
            type="text"
            value={newExcludeSite}
            onChange={(e) => setNewExcludeSite(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddExcludeSite();
              }
            }}
            placeholder="e.g. yelp.com"
            className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleAddExcludeSite}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Email Signature</h3>
            <p className="text-xs text-slate-500 mt-1">
              Used as the footer/sign-off in every generated email.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateSignature}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
          >
            ✦ Generate from profile
          </button>
        </div>

        <div className="mt-3">
          <HtmlTemplateEditor
            ref={signatureEditorRef}
            initialValue={form.signatureHtml}
            onChange={(html) => handleFieldChange('signatureHtml', html)}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Intro Email Design</h3>
            <p className="text-xs text-slate-500 mt-1">
              The layout used for plain outreach emails (no offer attached). AI still
              writes the subject and body — this controls how it's presented.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateIntroTemplate}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
          >
            ✦ Generate starter design
          </button>
        </div>

        <div className="mt-3">
          <HtmlTemplateEditor
            ref={introEditorRef}
            initialValue={form.introTemplateHtml}
            onChange={(html) => handleFieldChange('introTemplateHtml', html)}
            placeholderReference={INTRO_PLACEHOLDERS}
            rows={16}
            minHeight="16rem"
            maxHeight="34rem"
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Offer Email Design</h3>
            <p className="text-xs text-slate-500 mt-1">
              The layout used when an email includes a specific offer/discount.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateOfferTemplate}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
          >
            ✦ Generate starter design
          </button>
        </div>

        <div className="mt-3">
          <HtmlTemplateEditor
            ref={offerEditorRef}
            initialValue={form.offerTemplateHtml}
            onChange={(html) => handleFieldChange('offerTemplateHtml', html)}
            placeholderReference={OFFER_PLACEHOLDERS}
            rows={16}
            minHeight="16rem"
            maxHeight="34rem"
          />
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
