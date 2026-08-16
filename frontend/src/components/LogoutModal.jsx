export default function LogoutModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-amber-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 0 0 3.4 20.5h17.2a1.5 1.5 0 0 0 1.29-2.46L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Logout isn't available yet</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Capstone CRM doesn't have user accounts or authentication set up yet — it's a
              single shared workspace right now, so there's nothing to log out of. This will
              work once accounts are added.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
