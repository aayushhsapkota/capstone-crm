import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_DURATION_MS = 3000;

// A fixed-position notification that doesn't require scrolling to see, unlike a
// banner rendered at the top of a page — useful on pages with a long or paginated
// list, where the action that triggers the message can happen far below the fold.
export function useToast(duration = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showToast = useCallback(
    (message, type = 'success') => {
      clearTimeout(timeoutRef.current);
      setToast({ message, type });
      timeoutRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return [toast, showToast];
}
