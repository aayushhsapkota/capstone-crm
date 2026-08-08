import { useState } from 'react';

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
    <div className="flex-1 overflow-y-auto py-4 space-y-3">
      {emails.map((email) => {
        const isSent = email.direction === 'SENT';
        const expanded = expandedIds.has(email.id);
        return (
          <div key={email.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
            <div
              onClick={() => toggleExpanded(email.id)}
              className={`max-w-md rounded-lg px-4 py-2 cursor-pointer ${
                isSent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-xs opacity-75">
                <span>{isSent ? 'You' : 'Them'}</span>
                <span>{new Date(email.sentAt).toLocaleString()}</span>
              </div>
              <div className="text-sm font-medium mt-1">{email.subject}</div>
              {expanded && (
                <div
                  className="text-sm mt-2 prose-sm"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
