import { useParams, Link } from 'react-router-dom';
import { useCampaignProgress } from '../hooks/useCampaignProgress.js';
import CampaignProgress from '../components/CampaignProgress.jsx';

const JOB_STATUS_STYLES = {
  PENDING: 'bg-slate-100 text-slate-600',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-slate-100 text-slate-500',
};

export default function CampaignDetail() {
  const { id } = useParams();
  const campaign = useCampaignProgress(id);

  if (!campaign) {
    return <p className="text-slate-400 text-sm">Loading campaign…</p>;
  }

  return (
    <div className="max-w-3xl">
      <Link to="/campaigns" className="text-sm text-blue-600 hover:underline">
        ← Back to Campaigns
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            {campaign.name || 'Untitled Campaign'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {campaign.offer ? `Offer: ${campaign.offer.name}` : 'Intro email'} · Delay:{' '}
            {campaign.delaySeconds}s · Started {new Date(campaign.createdAt).toLocaleString()}
            {campaign.completedAt &&
              ` · Completed ${new Date(campaign.completedAt).toLocaleString()}`}
          </p>
        </div>
      </div>

      <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-white">
        <CampaignProgress campaign={campaign} />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Jobs</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Business</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Processed</th>
              <th className="py-2 pr-4 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {campaign.jobs.map((job) => (
              <tr key={job.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-800">
                  <Link to={`/businesses/${job.business.id}`} className="hover:underline">
                    {job.business.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-slate-500">{job.business.email || '—'}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_STYLES[job.status] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-500">
                  {job.processedAt ? new Date(job.processedAt).toLocaleString() : '—'}
                </td>
                <td className="py-2 pr-4 text-red-600 text-xs">{job.errorMessage || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
