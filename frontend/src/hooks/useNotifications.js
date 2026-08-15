import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationsRead } from '../api/notifications.js';

const POLL_INTERVAL_MS = 30000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      // Polling in the background — log and let the next cycle retry rather than
      // surfacing a disruptive error for a transient failure.
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (ids) => {
      setActionError('');
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      try {
        await markNotificationsRead({ ids });
      } catch {
        // The optimistic update above already marked it read locally — without this,
        // a failed request left the UI lying about server state until the next 30s
        // poll silently corrected it. Re-fetching resyncs immediately instead.
        setActionError('Failed to update — try again.');
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    setActionError('');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markNotificationsRead({ all: true });
    } catch {
      setActionError('Failed to update — try again.');
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    actionError,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
