import { useState, useEffect, useCallback } from 'react';
import { getOwnerProfile, saveOwnerProfile } from '../api/ownerProfile.js';

export default function ExcludedDomains() {
  const [sites, setSites] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(false);
  const [newSite, setNewSite] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingSite, setRemovingSite] = useState(null);
  const [removeError, setRemoveError] = useState('');

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const profile = await getOwnerProfile();
      setSites(profile.excludeSites || []);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const site = newSite.trim().toLowerCase();
    if (!site) return;
    if (sites.includes(site)) {
      setAddError(`${site} is already excluded.`);
      return;
    }
    setAddError('');
    setAdding(true);
    const next = [...sites, site];
    try {
      // A partial save — only excludeSites is sent, so this can't clobber the rest of
      // the profile even though this page never loads any of those other fields.
      await saveOwnerProfile({ excludeSites: next });
      setSites(next);
      setNewSite('');
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add domain. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (site) => {
    setRemoveError('');
    setRemovingSite(site);
    const next = sites.filter((s) => s !== site);
    try {
      await saveOwnerProfile({ excludeSites: next });
      setSites(next);
    } catch (err) {
      setRemoveError(err.response?.data?.error || 'Failed to remove domain. Please try again.');
    } finally {
      setRemovingSite(null);
    }
  };

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-600">Failed to load excluded domains.</p>
        <button
          onClick={load}
          className="mt-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-800">Excluded Domains</h1>
      <p className="text-slate-500 mt-1">
        Domains to exclude from every search query — e.g. directory sites that clutter your
        results. Add any industry-specific directories; nothing is assumed for you.
      </p>

      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSite}
              onChange={(e) => {
                setNewSite(e.target.value);
                if (addError) setAddError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="e.g. yelp.com"
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newSite.trim() || sites === null}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 shrink-0"
            >
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
        </div>

        {removeError && (
          <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{removeError}</div>
        )}

        {sites === null ? (
          <p className="text-slate-400 text-sm px-4 py-8 text-center">Loading…</p>
        ) : sites.length === 0 ? (
          <p className="text-slate-400 text-sm px-4 py-8 text-center">No excluded domains yet.</p>
        ) : (
          <ul>
            {sites.map((site) => (
              <li
                key={site}
                className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 group"
              >
                <span className="text-sm text-slate-700">{site}</span>
                <button
                  onClick={() => handleRemove(site)}
                  disabled={removingSite === site}
                  className="text-xs text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                  aria-label={`Remove ${site}`}
                >
                  {removingSite === site ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
