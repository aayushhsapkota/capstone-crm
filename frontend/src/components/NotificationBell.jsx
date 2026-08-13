import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications.js';

const TYPE_ICONS = {
  SEND_FAILED: '⚠️',
  QUERY_FAILED: '⚠️',
  SCRAPE_COMPLETE: '🔍',
  CAMPAIGN_COMPLETE: '📣',
  UNSUBSCRIBED: '🚫',
  REPLY_RECEIVED: '↩️',
};

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = (n) => {
    if (!n.read) markAsRead([n.id]);
    if (n.businessId) {
      navigate(`/console?businessId=${n.businessId}`);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-slate-100"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center bg-red-600 text-white text-[10px] font-semibold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] flex flex-col bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-700">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-slate-400 text-sm px-4 py-6 text-center">No notifications.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-2.5 px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                    n.read ? '' : 'bg-blue-50/50'
                  }`}
                >
                  <span className="text-base leading-5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
