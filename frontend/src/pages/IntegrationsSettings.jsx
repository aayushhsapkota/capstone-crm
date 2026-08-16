import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getIntegrationsStatus, disconnectGmail, GMAIL_CONNECT_URL } from '../api/integrations.js';

const ERROR_MESSAGES = {
  access_denied: 'Google sign-in was cancelled.',
  invalid_state: 'That connection attempt expired or was tampered with — please try again.',
  exchange_failed: 'Google did not accept that connection — please try again.',
};

export default function IntegrationsSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [gmail, setGmail] = useState(null); // { connected, email }
  const [loadError, setLoadError] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', text }

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const status = await getIntegrationsStatus();
      setGmail(status.gmail);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reads the ?gmail=connected|error result of the OAuth redirect exactly once, then
  // strips it from the URL so refreshing the page doesn't keep re-showing the banner.
  useEffect(() => {
    const result = searchParams.get('gmail');
    if (!result) return;

    if (result === 'connected') {
      setBanner({ type: 'success', text: 'Gmail connected.' });
    } else if (result === 'error') {
      const reason = searchParams.get('reason');
      setBanner({ type: 'error', text: ERROR_MESSAGES[reason] || 'Failed to connect Gmail. Please try again.' });
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setBanner(null);
    try {
      await disconnectGmail();
      setGmail({ connected: false, email: null });
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error || 'Failed to disconnect Gmail. Please try again.' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-600">Failed to load integrations.</p>
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
      <h1 className="text-2xl font-semibold text-slate-800">Integrations</h1>
      <p className="text-slate-500 mt-1">Connect the external services this CRM sends email through.</p>

      {banner && (
        <div
          className={`mt-4 text-sm rounded-md px-3 py-2 border ${
            banner.type === 'success'
              ? 'text-green-700 bg-green-50 border-green-200'
              : 'text-red-600 bg-red-50 border-red-200'
          }`}
        >
          {banner.text}
        </div>
      )}

      <section className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11Z" fill="#EA4335" fillOpacity="0.12" stroke="#EA4335" strokeWidth="1.3" />
                <path d="m3 6 9 6.5L21 6" stroke="#EA4335" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Gmail</h2>
              {gmail === null ? (
                <p className="text-xs text-slate-400 mt-1">Loading…</p>
              ) : gmail.connected ? (
                <p className="text-xs text-slate-500 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
                  Connected as <span className="font-medium text-slate-700">{gmail.email}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Not connected — emails can't be sent until a Gmail account is connected.
                </p>
              )}
            </div>
          </div>

          {gmail?.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href={GMAIL_CONNECT_URL}
              className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 shrink-0"
            >
              Connect Gmail
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
