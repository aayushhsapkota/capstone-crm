import { useState } from 'react';
import { uploadImage } from '../api/uploads.js';

export default function ImageUrlField({ label, value, onChange, placeholder }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
        />
        <label className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap">
          {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-16 rounded border border-slate-200 object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
          onLoad={(e) => {
            e.target.style.display = 'block';
          }}
        />
      )}
    </div>
  );
}
