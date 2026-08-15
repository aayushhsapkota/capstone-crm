import { useState, useEffect } from 'react';
import { getOffers } from '../api/offers.js';

export default function OfferSelector({ value, onChange }) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    // Degrades gracefully either way — the dropdown just stays at "No offer" — so this
    // only needs to stop it from being an unhandled rejection in the console.
    getOffers()
      .then(setOffers)
      .catch((err) => console.error('Failed to load offers for selector:', err));
  }, []);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-sm border border-slate-300 rounded-md px-2 py-1.5"
    >
      <option value="">No offer (intro email)</option>
      {offers.map((offer) => (
        <option key={offer.id} value={offer.id}>
          {offer.name}
        </option>
      ))}
    </select>
  );
}
