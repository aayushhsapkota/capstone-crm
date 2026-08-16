import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getOwnerProfile } from '../api/ownerProfile.js';

const OwnerProfileContext = createContext(null);

// A single shared copy of the owner profile, fetched once here rather than separately
// by every consumer (ProfileMenu, Profile Settings, EmailComposer's service picker,
// etc). The point isn't just avoiding duplicate fetches — it's that a save anywhere
// (setProfile below) is instantly visible everywhere else, e.g. the header avatar
// updates the moment Profile Settings saves a new name, instead of staying stale until
// a full page reload re-runs everyone's own fetch.
export function OwnerProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  const refresh = useCallback(async () => {
    const data = await getOwnerProfile();
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    // Best-effort — consumers that actually need to know about a load failure (like
    // Profile Settings) do their own fetch/error state for that; this shared copy is
    // read-mostly convenience for things like the header avatar, which should just
    // fall back to its default display rather than surfacing an error of its own.
    refresh().catch(() => {});
  }, [refresh]);

  return (
    <OwnerProfileContext.Provider value={{ profile, setProfile, refresh }}>
      {children}
    </OwnerProfileContext.Provider>
  );
}

export function useOwnerProfile() {
  const ctx = useContext(OwnerProfileContext);
  if (!ctx) throw new Error('useOwnerProfile must be used within OwnerProfileProvider');
  return ctx;
}
