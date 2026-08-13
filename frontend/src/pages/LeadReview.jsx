import { useSearchParams } from 'react-router-dom';
import LeadReviewIndex from './LeadReviewIndex.jsx';
import LeadReviewDetail from './LeadReviewDetail.jsx';

export default function LeadReview() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('queryId');

  return queryId ? <LeadReviewDetail queryId={queryId} /> : <LeadReviewIndex />;
}
