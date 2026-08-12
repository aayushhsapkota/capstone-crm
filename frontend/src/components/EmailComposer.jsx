import { useState } from 'react';
import OfferSelector from './OfferSelector.jsx';
import { generateEmail, sendEmail } from '../api/emails.js';

export default function EmailComposer({ businessId, onSent }) {
  const [draft, setDraft] = useState({ subject: '', bodyHtml: '' });
  const [offerId, setOfferId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const generated = await generateEmail({ businessId, offerId });
      setDraft(generated);
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
    if (!draft.subject.trim() || !draft.bodyHtml.trim()) return;
    setSending(true);
    setError('');
    try {
      await sendEmail({ businessId, subject: draft.subject, bodyHtml: draft.bodyHtml, offerId });
      setDraft({ subject: '', bodyHtml: '' });
      onSent?.();
    } catch (err) {
      // Same pattern as handleGenerate — surfaces the real Gmail/n8n failure reason
      // (e.g. "Email send failed") instead of swallowing it silently.
      setError(err.response?.data?.error || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
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
      <textarea
        value={draft.bodyHtml}
        onChange={(e) => setDraft((prev) => ({ ...prev, bodyHtml: e.target.value }))}
        placeholder="Write your email…"
        rows={5}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <OfferSelector value={offerId} onChange={setOfferId} />
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
          disabled={sending || !draft.subject.trim() || !draft.bodyHtml.trim()}
          className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
