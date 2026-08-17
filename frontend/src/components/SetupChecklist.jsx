import { Link } from 'react-router-dom';
import { GMAIL_CONNECT_URL } from '../api/integrations.js';
import { useSetupStatus } from '../hooks/useSetupStatus.js';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function StepCard({ number, title, description, done, actionLabel, actionHref, actionTo }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-lg">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={`shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${
            done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {done ? <CheckIcon /> : number}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        </div>
      </div>

      {done ? (
        <span className="shrink-0 text-xs font-medium text-green-600">Done</span>
      ) : actionTo ? (
        <Link
          to={actionTo}
          className="shrink-0 px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
        >
          {actionLabel}
        </Link>
      ) : (
        <a
          href={actionHref}
          className="shrink-0 px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}

// Self-contained, same reasoning as WelcomeModal — the page that renders this doesn't
// need to know anything about onboarding state, just that this exists at the top.
export default function SetupChecklist() {
  const { profileDone, gmailDone, loading, doneCount } = useSetupStatus();

  if (loading || (profileDone && gmailDone)) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Finish setting up your account</h2>
        <span className="text-xs text-slate-400">{doneCount} of 2 done</span>
      </div>

      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-800 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / 2) * 100}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <StepCard
          number={1}
          title="Complete your profile"
          description="Company information like name, logo, email signature."
          done={profileDone}
          actionLabel="Complete"
          actionTo="/settings/profile"
        />
        <StepCard
          number={2}
          title="Connect Gmail"
          description="Send campaigns from your inbox."
          done={gmailDone}
          actionLabel="Connect"
          actionHref={GMAIL_CONNECT_URL}
        />
      </div>
    </div>
  );
}
