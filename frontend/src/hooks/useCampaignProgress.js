import { useState, useEffect, useCallback, useRef } from 'react';
import { getCampaign } from '../api/campaigns.js';

export function useCampaignProgress(campaignId) {
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const loadInitial = useCallback(async () => {
    if (!campaignId) return;
    setError(false);
    try {
      const data = await getCampaign(campaignId);
      setCampaign(data);
      if (data.status === 'RUNNING' && !intervalRef.current) {
        intervalRef.current = setInterval(async () => {
          try {
            const polled = await getCampaign(campaignId);
            setCampaign(polled);
            if (polled.status !== 'RUNNING') {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          } catch {
            // A poll-tick failure just leaves the last known state on screen and
            // retries next tick — same pattern as QueryManager/useNotifications'
            // background polling. Only the initial fetch failing blocks the page.
          }
        }, 5000);
      }
    } catch {
      // Without this, CampaignDetail was stuck on "Loading campaign…" forever with
      // no indication anything failed.
      setError(true);
    }
  }, [campaignId]);

  useEffect(() => {
    loadInitial();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadInitial]);

  return { campaign, error, retry: loadInitial };
}
