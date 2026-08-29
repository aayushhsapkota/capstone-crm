import { useState, useEffect } from 'react';
import { resetDemoData } from '../api/admin.js';

const CHECKED_KEY = 'capstone_demo_reset_checked';

// Offers to wipe leftover data — but only ever asks ONCE per browser, the very first
// time it can honestly answer "is there anything here yet?". localStorage rather than
// sessionStorage: this has to survive across sessions, not just the current tab, or a
// visitor who set up their OWN profile/Gmail/businesses and later reopens the app would
// get asked to reset data that's now genuinely theirs, not a previous visitor's leftovers.
export default function DemoResetModal({ hasData, loading }) {
  const [dismissed, setDismissed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  // Has this browser's one-time check already happened — on an earlier visit (read
  // from localStorage), or, once `loading` first resolves, right now.
  const [checked, setChecked] = useState(() => localStorage.getItem(CHECKED_KEY) === 'true');
  // Frozen the instant `checked` flips, capturing whatever hasData was AT THAT exact
  // moment — so hasData changing afterward (the visitor adding their own data,
  // without ever navigating away) can't retroactively make this eligible again.
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (checked || loading) return;
    localStorage.setItem(CHECKED_KEY, 'true');
    setEligible(hasData);
    setChecked(true);
  }, [checked, loading, hasData]);

  if (!eligible || dismissed) return null;

  const handleDismiss = () => setDismissed(true);

  const handleReset = async () => {
    setResetting(true);
    setError('');
    try {
      await resetDemoData();
      // A full reload rather than manually refetching — the wipe touches everything
      // (owner profile, businesses, Gmail connection), and every context/page that
      // holds state needs to see the clean slate, not just this one component.
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset. Please try again.');
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg" />
          <span className="text-base font-semibold text-slate-800">Capstone CRM</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mt-5">Start fresh?</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          This demo already has test data left over from a previous visitor. You can clear it
          out and try the app from a clean slate, or keep exploring what's already here.
        </p>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {resetting ? 'Starting fresh…' : 'Yes, start fresh'}
            {!resetting && (
              <span className="text-[10px] font-semibold bg-white/15 text-white px-1.5 py-0.5 rounded">
                RECOMMENDED
              </span>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={resetting}
            className="w-full py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            No, keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}
