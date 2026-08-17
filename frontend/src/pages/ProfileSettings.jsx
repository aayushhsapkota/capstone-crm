import { useState, useEffect, useCallback, useRef } from 'react';
import { getOwnerProfile, saveOwnerProfile, scrapeOwnerProfileFromWebsite } from '../api/ownerProfile.js';
import ImageUrlField from '../components/ImageUrlField.jsx';
import { buildSignatureHtml } from '../lib/signatureTemplate.js';
import { useOwnerProfile } from '../context/OwnerProfileContext.jsx';

let rowKey = 0;

function toServiceRow(entry) {
  if (typeof entry === 'string') return { _id: rowKey++, service: entry, description: '' };
  return { _id: rowKey++, service: entry.service || '', description: entry.description || '' };
}

// A contentEditable div can render markup (tags, styling) with no leading/trailing
// text, so a plain .trim() on the raw HTML string isn't a reliable "is this actually
// empty" check.
function isHtmlEmpty(html) {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

export default function ProfileSettings() {
  const { setProfile: setSharedProfile } = useOwnerProfile();
  const [form, setForm] = useState(null);
  const [serviceRows, setServiceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [signatureMode, setSignatureMode] = useState('visual');
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const logoFieldRef = useRef(null);
  const heroFieldRef = useRef(null);
  const signatureEditorRef = useRef(null);
  const signatureMountedRef = useRef(false);

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
        logoUrl: profile.logoUrl || '',
        heroImageUrl: profile.heroImageUrl || '',
      });
      setServiceRows((profile.services || []).map(toServiceRow));
      setLoadError(false);
    } catch {
      // Without this, a failed fetch left the page stuck on "Loading…" forever.
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

  // Puts the loaded signature into the visual editor's DOM exactly once, the first
  // time the DOM node exists — a ref callback fires reliably when that happens, unlike
  // trying to do this during render (signatureEditorRef.current isn't guaranteed to
  // exist yet, and the div doesn't render at all until `form` is loaded). Wrapped in
  // useCallback so it's a stable function identity — an inline ref callback would get
  // called with null then the node again on every render.
  const handleSignatureEditorRef = useCallback(
    (node) => {
      signatureEditorRef.current = node;
      if (node && !signatureMountedRef.current && form) {
        signatureMountedRef.current = true;
        node.innerHTML = form.signatureHtml || '';
        setSignatureEmpty(isHtmlEmpty(form.signatureHtml));
      }
    },
    [form]
  );

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
    if (signatureEditorRef.current) signatureEditorRef.current.innerHTML = html;
    setSignatureEmpty(isHtmlEmpty(html));
  };

  const handleSignatureInput = (e) => {
    const html = e.currentTarget.innerHTML;
    handleFieldChange('signatureHtml', html);
    setSignatureEmpty(isHtmlEmpty(html));
  };

  const handleSignatureTextareaChange = (e) => {
    handleFieldChange('signatureHtml', e.target.value);
    setSignatureEmpty(isHtmlEmpty(e.target.value));
  };

  const handleSwitchSignatureMode = (next) => {
    // Coming back into visual mode, the editor's DOM may be stale against whatever was
    // typed into the raw-HTML textarea while it was the active mode — resync from state.
    if (next === 'visual' && signatureEditorRef.current) {
      signatureEditorRef.current.innerHTML = form.signatureHtml;
    }
    setSignatureMode(next);
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

  const handleFetchFromWebsite = async () => {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchError('');
    try {
      const draft = await scrapeOwnerProfileFromWebsite(fetchUrl.trim());
      // Website doesn't need extracting — it's exactly the URL just typed into the
      // fetch box above, stripped to match how this field is stored elsewhere (bare
      // domain, no protocol, e.g. "website.com" not "https://website.com").
      const website = fetchUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      // Pre-fills the form only — still requires clicking Save below, same as
      // reviewing an email draft before Send. LLM extraction can be wrong.
      setForm((prev) => ({
        ...prev,
        companyName: draft.companyName || prev.companyName,
        specialisation: draft.specialisation || prev.specialisation,
        phone: draft.phone || prev.phone,
        website: website || prev.website,
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
      // Excluded domains live on their own page now and manage themselves — omitting
      // the key here leaves that field untouched server-side (a partial update), it
      // doesn't wipe it out.
      const updated = await saveOwnerProfile({
        companyName: form.companyName,
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        specialisation: form.specialisation || null,
        slogan: form.slogan || null,
        website: form.website || null,
        phone: form.phone || null,
        signatureHtml: form.signatureHtml || null,
        logoUrl: logoUrl || null,
        heroImageUrl: heroImageUrl || null,
        services,
      });
      setForm((prev) => ({ ...prev, id: updated.id, logoUrl: logoUrl || '', heroImageUrl: heroImageUrl || '' }));
      // Pushes the fresh profile into the shared context so anything else reading it —
      // right now, just the header avatar/name in ProfileMenu — updates immediately
      // instead of staying stale until a full page reload re-runs its own fetch.
      setSharedProfile(updated);
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
    <div className="max-w-3xl pb-20">
      <h1 className="text-2xl font-semibold text-slate-800">Profile Settings</h1>
      <p className="text-slate-500 mt-1">Company info, services, and email signature used across every generated email.</p>

      {/* overflow-hidden + the absolutely-positioned sweep below are what make this
          "shiny" — a diagonal highlight animating across the card, same idea as the
          skeleton-loading shimmer effect but slower and decorative rather than a
          loading state. Gradient + colored border set it apart from every other
          plain white/slate card on this page, since it's the one action here that's
          genuinely a shortcut (AI-filled fields) rather than manual data entry. */}
      <div className="relative mt-6 max-w-xl overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 -skew-x-12 animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm text-white shadow-sm">
            ✦
          </span>
          <h3 className="text-sm font-semibold text-slate-800">Fetch from website</h3>
        </div>
        <p className="relative mt-1.5 text-xs text-slate-600">
          Have a company website? We'll pull in the name, specialisation, and services to
          save you typing them out — review and edit before saving.
        </p>
        {fetchError && (
          <div className="relative mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {fetchError}
          </div>
        )}
        <div className="relative mt-3 flex gap-2">
          <input
            type="text"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 border border-indigo-200 rounded-md px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={handleFetchFromWebsite}
            disabled={fetching || !fetchUrl.trim()}
            className="px-3 py-2 text-sm text-white rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 shrink-0"
          >
            {fetching ? 'Fetching…' : '✦ Fetch'}
          </button>
        </div>
      </div>

      <section className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-800">Company Information</h2>
        <p className="text-xs text-slate-500 mt-0.5">Shown in generated emails and your signature.</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sender Name</label>
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => handleFieldChange('senderName', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sender Email</label>
            <input
              type="email"
              value={form.senderEmail}
              onChange={(e) => handleFieldChange('senderEmail', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Specialisation</label>
            <input
              type="text"
              value={form.specialisation}
              onChange={(e) => handleFieldChange('specialisation', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Slogan</label>
            <input
              type="text"
              value={form.slogan}
              onChange={(e) => handleFieldChange('slogan', e.target.value)}
              placeholder={`e.g. "Care That Feels Like Family"`}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder="www.yourcompany.com"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="0400 000 000"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
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
      </section>

      <section className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Services</h2>
            <p className="text-xs text-slate-500 mt-0.5">Featured in generated emails.</p>
          </div>
          <button
            onClick={handleAddService}
            className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            + Add service
          </button>
        </div>

        <div className="mt-4 space-y-2">
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
                  className="w-1/3 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => handleServiceChange(row._id, 'description', e.target.value)}
                  placeholder="Short description shown in the email"
                  className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
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
      </section>

      <section className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Email Signature</h2>
            <p className="text-xs text-slate-500 mt-0.5">
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

        <div className="mt-4">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleSwitchSignatureMode('visual')}
              className={`px-2 py-1 rounded-md ${
                signatureMode === 'visual' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Edit visually
            </button>
            <button
              type="button"
              onClick={() => handleSwitchSignatureMode('html')}
              className={`px-2 py-1 rounded-md ${
                signatureMode === 'html' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Edit HTML
            </button>
          </div>

          {/* Both modes stay mounted — toggled with `hidden` rather than conditionally
              rendered, so the visual editor's DOM (and cursor position, if focused)
              never gets torn down and rebuilt by switching tabs. */}
          <div className={`mt-2 ${signatureMode === 'visual' ? '' : 'hidden'}`}>
            <p className={`text-xs text-slate-400 mb-1 ${signatureEmpty ? '' : 'hidden'}`}>
              Nothing yet — try "Generate from profile".
            </p>
            <div
              ref={handleSignatureEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleSignatureInput}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm prose-sm overflow-auto focus:outline-none focus:ring-1 focus:ring-slate-400"
              style={{ minHeight: '9.5rem', maxHeight: '24rem' }}
            />
          </div>
          <div className={`mt-2 ${signatureMode === 'html' ? '' : 'hidden'}`}>
            <textarea
              value={form.signatureHtml}
              onChange={handleSignatureTextareaChange}
              rows={8}
              placeholder="<p>Best regards,<br/>Your Name</p>"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Sticky so Save stays reachable without hunting for it at the bottom of a long
          page — this page's whole point is to hold more than a compact form comfortably. */}
      <div className="fixed bottom-0 left-56 right-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center gap-3 z-10">
        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
            {saveError}
          </div>
        )}
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
