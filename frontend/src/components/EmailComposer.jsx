import { useState, useRef, useEffect } from 'react';
import OfferSelector from './OfferSelector.jsx';
import { generateEmail, sendEmail } from '../api/emails.js';
import { getOwnerProfile } from '../api/ownerProfile.js';

// A contentEditable div can render markup (tags, styling) with no leading/trailing
// text, so a plain .trim() on the raw HTML string isn't a reliable "is this actually
// empty" check — e.g. deleting everything typed often leaves the browser with
// `<br>` or `<div><br></div>` behind rather than a true empty string.
function isBodyEmpty(html) {
  if (!html) return true;
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length === 0;
}

export default function EmailComposer({ businessId, businessEmail, onSent }) {
  const [draft, setDraft] = useState({ subject: '', bodyHtml: '' });
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [offerId, setOfferId] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [servicesOpen, setServicesOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef(null);
  const servicesRef = useRef(null);

  // Loaded once — which services are on file at all, so they can be picked from when
  // generating. All selected by default; unchecking one just leaves it out of this
  // particular email rather than removing it from the owner profile.
  useEffect(() => {
    getOwnerProfile()
      .then((profile) => {
        const names = (profile.services || [])
          .map((s) => (typeof s === 'string' ? s : s.service))
          .filter(Boolean);
        setServices(names);
        setSelectedServices(new Set(names));
      })
      // Degrades gracefully either way — the picker just doesn't show — so this only
      // needs to stop it from being an unhandled rejection in the console.
      .catch((err) => console.error('Failed to load services for picker:', err));
  }, []);

  useEffect(() => {
    if (!servicesOpen) return;
    const handleClickOutside = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) setServicesOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [servicesOpen]);

  const toggleService = (name) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // The editable div's DOM content is deliberately NOT synced from draft.bodyHtml via
  // a useEffect on every render — contentEditable's DOM is mutated directly by the
  // browser as you type, outside React's knowledge, and an effect racing that on every
  // keystroke is what caused a real crash (React reconciling a ref mid-render). Instead,
  // .innerHTML is only ever set imperatively at the two moments content should actually
  // be replaced wholesale: right after generating, and clearing after a send.
  const setEditorContent = (html) => {
    if (editorRef.current) editorRef.current.innerHTML = html;
    setBodyEmpty(isBodyEmpty(html));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const generated = await generateEmail({
        businessId,
        offerId,
        selectedServices: [...selectedServices],
      });
      // Trust the shape, not the values — a malformed workflow response (e.g. a
      // node edit that drops a field) should show a blank field, not crash the page.
      const subject = generated.subject || '';
      const bodyHtml = generated.bodyHtml || '';
      setDraft({ subject, bodyHtml });
      setEditorContent(bodyHtml);
    } catch (err) {
      // err.response.data.error is the real message the backend forwarded from n8n
      // (e.g. an LLM auth/rate-limit failure) — fall back to a generic message for
      // anything else (network error, backend down, etc).
      setError(err.response?.data?.error || 'Failed to generate email. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!draft.subject.trim() || bodyEmpty) return;
    if (!businessEmail?.trim()) {
      setError("Business don't have email address, please set address before sending email");
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendEmail({ businessId, subject: draft.subject, bodyHtml: draft.bodyHtml, offerId });
      setDraft({ subject: '', bodyHtml: '' });
      setEditorContent('');
      onSent?.();
    } catch (err) {
      // Same pattern as handleGenerate — surfaces the real Gmail/n8n failure reason
      // (e.g. "Email send failed") instead of swallowing it silently.
      setError(err.response?.data?.error || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setDraft((prev) => ({ ...prev, bodyHtml: html }));
    setBodyEmpty(isBodyEmpty(html));
  };

  return (
    <div className="border-t border-slate-200 pt-3 space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <input
        type="text"
        value={draft.subject}
        onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
        placeholder="Subject"
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
      />
      <div className="relative">
        {/* Always mounted — toggled with a CSS class rather than conditional JSX, so the
            sibling contentEditable div's position in the tree never shifts on typing. */}
        <p
          className={`absolute top-2 left-3 text-sm text-slate-400 pointer-events-none ${
            bodyEmpty ? '' : 'hidden'
          }`}
        >
          Write your email…
        </p>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm prose-sm overflow-auto focus:outline-none focus:ring-1 focus:ring-slate-400"
          style={{ minHeight: '7.5rem', maxHeight: '20rem' }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <OfferSelector value={offerId} onChange={setOfferId} />
          {services.length > 0 && (
            <div className="relative" ref={servicesRef}>
              <button
                type="button"
                onClick={() => setServicesOpen((prev) => !prev)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Services ({selectedServices.size}/{services.length})
              </button>
              {servicesOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto">
                  {services.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.has(name)}
                        onChange={() => toggleService(name)}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            {generating ? 'Generating…' : '✦ Generate'}
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !draft.subject.trim() || bodyEmpty}
          className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
