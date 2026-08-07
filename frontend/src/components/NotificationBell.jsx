export default function NotificationBell() {
  // Wired up to useNotifications in a later phase.
  return (
    <button className="relative p-2 rounded-full hover:bg-slate-100" aria-label="Notifications">
      <span className="text-xl">🔔</span>
    </button>
  );
}
