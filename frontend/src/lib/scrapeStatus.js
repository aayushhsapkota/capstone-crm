// Mirrors the scrapeStatus values computed by backend/src/routes/queries.js's
// computeQueryStats — kept in one place since both LeadReviewIndex and
// LeadReviewDetail need to render the exact same three states identically.
export const SCRAPE_STATUS_LABELS = {
  NOT_STARTED: 'Not started',
  COMPLETED: 'Completed',
  COMPLETED_WITH_FAILURES: 'Completed with failures',
};

export const SCRAPE_STATUS_STYLES = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-green-100 text-green-700',
  COMPLETED_WITH_FAILURES: 'bg-red-100 text-red-700',
};
