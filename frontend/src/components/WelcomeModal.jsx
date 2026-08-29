import { useState } from 'react';
import { useSetupStatus } from '../hooks/useSetupStatus.js';
import { useHasBusinessData } from '../hooks/useHasBusinessData.js';

const DISMISSED_KEY = 'capstone_welcome_dismissed';

// Self-contained rather than gated by its parent — Layout renders this unconditionally
// as a child of OwnerProfileProvider (it can't read the hook itself, since Layout is
// the component that renders the provider, not a descendant of it) and this decides on
// its own whether there's anything to show.
export default function WelcomeModal() {
  const { profileDone, gmailDone, loading } = useSetupStatus();
  const hasBusinessData = useHasBusinessData();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === 'true');

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  // Only for a genuinely blank-slate visitor: neither profile nor Gmail set up, and no
  // business data left behind either. That last check is what makes this mutually
  // exclusive with DemoResetModal (Console page, shown whenever business data exists,
  // regardless of profile/Gmail state) by construction, rather than just less likely to
  // overlap with it — someone can reach real business data via Query Manager/Lead
  // Review or "+ Add Business" without ever touching profile or Gmail, so that overlap
  // was a real path, not just a theoretical one. hasBusinessData starts `null` while its
  // own fetch is in flight, so it's folded into the same loading check rather than ever
  // treated as "false" prematurely.
  if (loading || hasBusinessData === null || dismissed || profileDone || gmailDone || hasBusinessData) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
