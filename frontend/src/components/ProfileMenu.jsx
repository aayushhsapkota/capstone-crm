import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOwnerProfile } from '../api/ownerProfile.js';
import LogoutModal from './LogoutModal.jsx';

function getInitials(name) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.85.128 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.39.44.998.12 1.45l-.527.737a1.125 1.125 0 0 0-.108 1.204c.166.397.506.71.93.78l.894.15c.542.09.94.56.94 1.109v1.094c0 .55-.398 1.02-.94 1.11l-.894.149a1.125 1.125 0 0 0-.78.93 1.125 1.125 0 0 0 .108 1.204l.527.738c.32.45.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527a1.125 1.125 0 0 0-1.203-.108 1.125 1.125 0 0 0-.931.78l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894a1.125 1.125 0 0 0-.931-.78 1.125 1.125 0 0 0-1.204.108l-.738.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737a1.125 1.125 0 0 0 .108-1.204 1.125 1.125 0 0 0-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.166-.398.13-.85-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.354.236.806.272 1.204.108.397-.166.71-.506.78-.93l.15-.894Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 3.5 9 15 15 0 0 1-3.5 9 15 15 0 0 1-3.5-9A15 15 0 0 1 12 3Z" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4m6-4v4M6 7h12l-.6 6.6a5.4 5.4 0 0 1-10.8 0L6 7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.5V21" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 15l3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}


export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // The avatar just falls back to a generic icon if this fails — nothing here is
    // load-bearing enough to need a retry or error state of its own.
    getOwnerProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initials = useMemo(
    () => getInitials(profile?.senderName) || getInitials(profile?.companyName),
    [profile]
  );

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="w-9 h-9 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center hover:ring-2 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
          aria-label="Profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {initials || <UserIcon />}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1.5 overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">
                {profile?.senderName || 'Your Name'}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {profile?.senderEmail || 'you@example.com'}
              </p>
            </div>

            <div className="py-1">
              <button
                role="menuitem"
                onClick={() => goTo('/settings/profile')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <SettingsIcon />
                Profile Settings
              </button>
              <button
                role="menuitem"
                onClick={() => goTo('/settings/excluded-domains')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <GlobeIcon />
                Excluded Domains
              </button>
              <button
                role="menuitem"
                onClick={() => goTo('/settings/integrations')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <PlugIcon />
                Integrations
              </button>
            </div>

            <div className="border-t border-slate-100 py-1">
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setLogoutOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
              >
                <LogoutIcon />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}
