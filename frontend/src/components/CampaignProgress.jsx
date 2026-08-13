import LoadingSpinner from './LoadingSpinner.jsx';

const STATUS_STYLES = {
  QUEUED: 'bg-slate-100 text-slate-600',
  RUNNING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-green-100 text-green-700',
  PARTIAL_FAIL: 'bg-red-100 text-red-700',
};

const IN_PROGRESS_STATUSES = new Set(['QUEUED', 'RUNNING']);

export default function CampaignProgress({ campaign }) {
  const { totalCount, sentCount, failedCount, skippedCount, status } = campaign;
  const processed = sentCount + failedCount + skippedCount;
  const pct = totalCount > 0 ? Math.round((processed / totalCount) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>
          {processed} / {totalCount} processed
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
          {IN_PROGRESS_STATUSES.has(status) && <LoadingSpinner />}
          {status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-800 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
        <span className="text-green-700">{sentCount} sent</span>
        <span className="text-red-700">{failedCount} failed</span>
        <span className="text-slate-500">{skippedCount} skipped</span>
      </div>
    </div>
  );
}
