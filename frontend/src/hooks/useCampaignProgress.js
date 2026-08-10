import { useState, useEffect } from 'react';
import { getCampaign } from '../api/campaigns.js';

export function useCampaignProgress(campaignId) {
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    if (!campaignId) return;

    const fetch = async () => {
      const data = await getCampaign(campaignId);
      setCampaign(data);
    };

    fetch();

    // Poll every 5 seconds while running
    const interval = setInterval(async () => {
      const data = await getCampaign(campaignId);
      setCampaign(data);
      if (data.status !== 'RUNNING') clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignId]);

  return campaign;
}
