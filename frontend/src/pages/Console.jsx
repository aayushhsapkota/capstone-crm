import { useSearchParams } from 'react-router-dom';
import BusinessesIndex from './BusinessesIndex.jsx';
import BusinessThread from './BusinessThread.jsx';

export default function Console() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId');

  return businessId ? <BusinessThread businessId={businessId} /> : <BusinessesIndex />;
}
