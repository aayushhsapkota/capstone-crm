import { useState } from 'react';
import { useSetupStatus } from '../hooks/useSetupStatus.js';

const DISMISSED_KEY = 'capstone_welcome_dismissed';

// Self-contained rather than gated by its parent — Layout renders this unconditionally
// as a child of OwnerProfileProvider (it can't read the hook itself, since Layout is
// the component that renders the provider, not a descendant of it) and this decides on
// its own whether there's anything to show.
export default function WelcomeModal() {
  const { profileDone, gmailDone, loading } = useSetupStatus();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === 'true');

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  // Real, derived completion (not just "dismissed once") is what actually gates this —
  // a fresh browser opening an already-configured instance shouldn't see a welcome
  // screen for a setup that's already done, and loading avoids a flash of the modal
  // before the first profile/integrations fetch resolves.
  if (loading || dismissed || (profileDone && gmailDone)) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg" />
          <span className="text-base font-semibold text-slate-800">Capstone CRM</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mt-5">Welcome to Capstone</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Capstone finds your leads, scrapes their websites, and extracts useful information to
          send outreach campaigns from your own inbox — all in one place. Two quick steps and
          you're ready to go.
        </p>

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center">
              1
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">Set up your profile</div>
              <div className="text-xs text-slate-500 mt-0.5">Tell us who's sending your campaigns.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center">
              2
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">Connect Gmail</div>
              <div className="text-xs text-slate-500 mt-0.5">So outreach emails send from your own address.</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="mt-6 w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          Get started
        </button>
      </div>
    </div>
  );
}
