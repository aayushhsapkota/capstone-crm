import { useState, useEffect } from 'react';
import { getOffers } from '../api/offers.js';

export default function OfferSelector({ value, onChange }) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    getOffers().then(setOffers);
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
