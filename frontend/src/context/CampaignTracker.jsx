import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCampaign } from '../api/campaigns.js';

const CampaignTrackerContext = createContext(null);
const POLL_INTERVAL_MS = 5000;

// Lives in Layout, above the router — mirrors ScrapeTracker's shape: a campaign
// started from BulkSendModal keeps being tracked (and can still report completion via
// toast) even after navigating away from wherever it was started. In-memory only,
// same tradeoff as ScrapeTracker — a hard refresh loses tracking of an
// already-running campaign, but the bell notification (created server-side
// regardless) and CampaignDetail's own poll are unaffected either way.
export function CampaignTrackerProvider({ children, onCampaignComplete }) {
  const [runningIds, setRunningIds] = useState(new Set());
  const runningIdsRef = useRef(runningIds);
  useEffect(() => {
    runningIdsRef.current = runningIds;
  }, [runningIds]);
  const onCompleteRef = useRef(onCampaignComplete);
  useEffect(() => {
    onCompleteRef.current = onCampaignComplete;
  }, [onCampaignComplete]);

  const trackCampaign = useCallback((campaignId) => {
    setRunningIds((prev) => new Set(prev).add(campaignId));
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const ids = [...runningIdsRef.current];
      if (ids.length === 0) return;

      await Promise.all(
        ids.map(async (campaignId) => {
          try {
            const campaign = await getCampaign(campaignId);
            if (campaign.status === 'RUNNING') return;

            setRunningIds((prev) => {
              const next = new Set(prev);
              next.delete(campaignId);
              return next;
            });
            onCompleteRef.current?.(campaign);
          } catch {
            // A transient failure just leaves this campaign tracked for another tick —
            // same self-healing pattern as the other background polls in this app.
          }
        })
      );
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <CampaignTrackerContext.Provider value={{ runningIds, trackCampaign }}>
      {children}
    </CampaignTrackerContext.Provider>
  );
}

export function useCampaignTracker() {
  const ctx = useContext(CampaignTrackerContext);
  if (!ctx) throw new Error('useCampaignTracker must be used within CampaignTrackerProvider');
  return ctx;
}
