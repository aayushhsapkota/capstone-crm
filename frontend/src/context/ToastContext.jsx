import { createContext, useContext } from 'react';

const ToastContext = createContext(null);

// Layout owns the actual toast state/rendering (useToast + <Toast>) since it sits
// above the router and never unmounts — this just hands descendant pages a way to
// call the same showToast, so a toast triggered right before navigating (e.g. "Send
// Bulk" jumping to Campaigns) keeps showing on the page it lands on instead of being
// destroyed along with whatever component originally fired it.
export function ToastProvider({ showToast, children }) {
  return <ToastContext.Provider value={showToast}>{children}</ToastContext.Provider>;
}

export function useShowToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useShowToast must be used within ToastProvider');
  return ctx;
}
