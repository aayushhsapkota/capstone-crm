import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Find leads',
    description: 'Search for businesses in your target market and pull structured details from their public websites automatically.',
  },
  {
    title: 'Review and organize',
    description: 'Review scraped leads, fix anything that needs a human eye, and track every business through your pipeline.',
  },
  {
    title: 'Send outreach from your own Gmail',
    description: "Generate personalized outreach emails and send them straight from your connected Gmail account — no separate mail server, no shared sending address.",
  },
  {
    title: 'Track replies and campaigns',
    description: 'See sent, replied, and bounced outreach in one place, and run bulk campaigns across many leads at once.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg" />
          <span className="text-base font-semibold text-slate-800">Capstone CRM</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mt-8">
          Find leads, and reach out to them — from your own inbox.
        </h1>
        <p className="text-slate-500 mt-3 text-base leading-relaxed max-w-xl">
          Capstone CRM is an outbound lead-generation and email outreach tool for small
          businesses. It finds prospects, gathers useful details about them from their public
          websites, and sends personalized outreach emails through the Gmail account you connect
          and control.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link
            to="/console"
            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
          >
            Open Capstone
          </Link>
          <Link
            to="/privacy"
            className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Privacy Policy
          </Link>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-slate-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-800">{f.title}</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
          <Link to="/privacy" className="hover:text-slate-600 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-600 hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
