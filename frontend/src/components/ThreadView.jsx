import { useState } from 'react';

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ThreadView({ emails }) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!emails || emails.length === 0) {
    return <p className="text-slate-400 text-sm py-4">No emails yet.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto min-w-0 py-4 space-y-2">
      {emails.map((email) => {
        const isSent = email.direction === 'SENT';
        const expanded = expandedIds.has(email.id);
        // Replies never have an offer selection to label — that's only meaningful for
        // what we actually sent, not what came back.
        const typeLabel = isSent ? (email.offer ? email.offer.name : 'Intro email') : null;

        return (
          <div key={email.id} className="min-w-0 border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleExpanded(email.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 transition-colors"
            >
              <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{email.subject}</span>
              <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
                {typeLabel && `${typeLabel} · `}
                {formatDateTime(email.sentAt)}
              </span>
            </button>

            {expanded && (
              <div className="border-t border-slate-100 px-4 py-4">
                {/* Email bodies can carry fixed-width HTML (our own templates use
                    600px-wide tables) — overflow-x-auto keeps any overflow scoped to
                    this one message's body instead of ever widening the thread or page. */}
                <div className="text-sm max-w-full overflow-x-auto">
                  <div className="prose-sm" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
