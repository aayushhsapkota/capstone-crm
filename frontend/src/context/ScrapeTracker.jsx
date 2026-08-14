import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getQueryResultsStatus } from '../api/queryResults.js';

const ScrapeTrackerContext = createContext(null);
const POLL_INTERVAL_MS = 5000;

// Lives in Layout, above the router — a batch started from Lead Review Detail must
// keep polling and still be able to report completion (toast + badge refresh) even
// after the user navigates back to the Index or somewhere else entirely. Keyed by
// queryId since "Scrape Selected" always operates on one query's rows at a time.
// This is in-memory only: a hard refresh or new tab loses in-flight batches, same as
// any other client state — the query just falls back to whatever the backend already
// knows (NOT_STARTED until the batch resolves and updates scrapedAt/flagged).
export function ScrapeTrackerProvider({ children, onBatchComplete }) {
  const [batches, setBatches] = useState({});
  const batchesRef = useRef(batches);
  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);
  const onCompleteRef = useRef(onBatchComplete);
  useEffect(() => {
    onCompleteRef.current = onBatchComplete;
  }, [onBatchComplete]);

  const startBatch = useCallback((queryId, ids) => {
    setBatches((prev) => ({ ...prev, [queryId]: ids }));
  }, []);

  // The tracker itself is in-memory only, so a refresh/close mid-scrape silently
  // drops it with no other warning — this is the one guard against that. Browsers
  // ignore any custom message and show their own generic text, so returnValue only
  // needs to be truthy to trigger the native confirm dialog.
  useEffect(() => {
    if (Object.keys(batches).length === 0) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [batches]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = batchesRef.current;
      const queryIds = Object.keys(current);
      if (queryIds.length === 0) return;

      await Promise.all(
        queryIds.map(async (queryId) => {
          const ids = current[queryId];
          const rows = await getQueryResultsStatus(ids);
          const stillPending = rows.some((r) => !r.scrapedAt && !r.flagged);
          if (stillPending) return;

          setBatches((prev) => {
            const next = { ...prev };
            delete next[queryId];
            return next;
          });
          const failedCount = rows.filter((r) => r.flagged).length;
          onCompleteRef.current?.(queryId, failedCount);
        })
      );
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return <ScrapeTrackerContext.Provider value={{ batches, startBatch }}>{children}</ScrapeTrackerContext.Provider>;
}

export function useScrapeTracker() {
  const ctx = useContext(ScrapeTrackerContext);
  if (!ctx) throw new Error('useScrapeTracker must be used within ScrapeTrackerProvider');
  return ctx;
}
