import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCampaigns } from '../api/campaigns.js';
import CampaignProgress from '../components/CampaignProgress.jsx';
import { useCampaignTracker } from '../context/CampaignTracker.jsx';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const { runningIds } = useCampaignTracker();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
      setLoadError(false);
    } catch {
      // Without this, a failed fetch left the page stuck on "Loading campaigns…"
      // forever with no way out except navigating away and back.
      if (!silent) setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A tracked campaign leaving runningIds is the cue that it just finished — refetch
  // so this list updates while you're actually looking at it, instead of only ever
  // refreshing on mount (previously you had to navigate away and back to see it).
  // Silent so the list doesn't collapse to "Loading campaigns…" for what's otherwise
  // a background update — same reasoning as the scroll-jump fix on BusinessProfile.
  const prevRunningIdsRef = useRef(new Set());
  useEffect(() => {
    const hadCompletion = [...prevRunningIdsRef.current].some((id) => !runningIds.has(id));
    if (hadCompletion) load(true);
    prevRunningIdsRef.current = runningIds;
  }, [runningIds, load]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Campaigns</h1>
          <p className="text-slate-500 mt-1">Bulk campaign list and progress.</p>
        </div>
        <button
          onClick={() => navigate('/console')}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700"
        >
          + New Campaign
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        New campaigns are started from Console — select businesses there, then "Send Bulk".
      </p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading campaigns…</p>
        ) : loadError ? (
          <div>
            <p className="text-sm text-red-600">Failed to load campaigns.</p>
            <button
              onClick={() => load()}
              className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-slate-400 text-sm">No campaigns yet.</p>
        ) : (
          campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              to={`/campaigns/${campaign.id}`}
              className="block border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-100 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {campaign.name || 'Untitled Campaign'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {campaign.offer ? campaign.offer.name : 'Intro email'} ·{' '}
                    {new Date(campaign.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <CampaignProgress campaign={campaign} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
