import { useState, useEffect } from 'react';
import { getBusinesses } from '../api/businesses.js';

// limit: 1 — only the real total count is needed, not the rows themselves.
export function useHasBusinessData() {
  const [hasData, setHasData] = useState(null);

  useEffect(() => {
    getBusinesses({ limit: 1 })
      .then((data) => setHasData(data.total > 0))
      .catch(() => setHasData(false));
  }, []);

  return hasData;
}
