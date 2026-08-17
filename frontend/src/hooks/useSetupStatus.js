import { useState, useEffect } from 'react';
import { useOwnerProfile } from '../context/OwnerProfileContext.jsx';
import { getIntegrationsStatus } from '../api/integrations.js';

// Shared by the welcome modal and the setup checklist card — both need the same
// answer to "is onboarding done," derived from real server state rather than a
// client-only flag, so it stays correct regardless of which browser is looking (this
// app has no accounts — a fresh browser on an already-configured instance shouldn't
// see "finish setup" any more than the original one should).
export function useSetupStatus() {
  const { profile } = useOwnerProfile();
  const [gmailConnected, setGmailConnected] = useState(null); // null = not loaded yet

  useEffect(() => {
    getIntegrationsStatus()
      .then((status) => setGmailConnected(status.gmail.connected))
      // Best-effort, same reasoning as OwnerProfileContext's own fetch — falls back to
      // "not connected" rather than leaving the checklist stuck loading forever.
      .catch(() => setGmailConnected(false));
  }, []);

  // "My Company" is the literal placeholder getOrCreateOwnerProfile() seeds a brand
  // new profile with — a real save from Profile Settings always sends something else.
  const profileDone = !!profile && profile.companyName !== 'My Company';
  const gmailDone = gmailConnected === true;
  const loading = !profile || gmailConnected === null;
  const doneCount = (profileDone ? 1 : 0) + (gmailDone ? 1 : 0);

  return { profileDone, gmailDone, loading, doneCount };
}
