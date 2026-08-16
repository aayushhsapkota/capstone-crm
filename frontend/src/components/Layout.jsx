import { useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import NotificationBell from './NotificationBell.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import Toast from './Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { ScrapeTrackerProvider } from '../context/ScrapeTracker.jsx';
import { CampaignTrackerProvider } from '../context/CampaignTracker.jsx';
import { OwnerProfileProvider } from '../context/OwnerProfileContext.jsx';

export default function Layout({ children }) {
  const [toast, showToast] = useToast();

  // The completion toast for a scrape batch is fired from here, not from Lead Review
  // Detail, specifically so it still shows up if the user has since navigated away —
  // the bell notification is there for later, but the toast is the immediate signal.
  const handleBatchComplete = useCallback(
    (queryId, failedCount) => {
      if (failedCount === 0) {
        showToast('Scraping completed successfully.');
      } else {
        showToast(`Scraping completed with ${failedCount} failed lead${failedCount === 1 ? '' : 's'}.`, 'error');
      }
    },
    [showToast]
  );

  // Same reasoning as scrape batches — fired globally so it still shows up after
  // navigating away from wherever the campaign was started.
  const handleCampaignComplete = useCallback(
    (campaign) => {
      const label = campaign.name || 'Campaign';
      if (campaign.status === 'PARTIAL_FAIL') {
        showToast(
          `${label} finished — ${campaign.sentCount} sent, ${campaign.failedCount} failed.`,
          'error'
        );
      } else {
        showToast(`${label} finished — ${campaign.sentCount} sent.`);
      }
    },
    [showToast]
  );

  return (
    <OwnerProfileProvider>
      <ScrapeTrackerProvider onBatchComplete={handleBatchComplete}>
        <CampaignTrackerProvider onCampaignComplete={handleCampaignComplete}>
          <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            {/* min-h-0 overrides flex's default min-height:auto on this column — without
                it, main's overflow-y-auto can't actually kick in, since the column would
                just grow to fit its content instead of clipping to the viewport height. */}
            <div className="flex-1 flex flex-col min-h-0">
              <header className="shrink-0 flex items-center justify-end gap-3 px-6 py-3 bg-white border-b border-slate-200">
                <NotificationBell />
                <div className="w-px h-6 bg-slate-200" />
                <ProfileMenu />
              </header>
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
          <Toast toast={toast} />
        </CampaignTrackerProvider>
      </ScrapeTrackerProvider>
    </OwnerProfileProvider>
  );
}
