import { useState } from 'react';
import { uploadImage } from '../api/uploads.js';

// Must match the backend's multer limits.fileSize (backend/src/routes/uploads.js) and
// nginx's client_max_body_size on the host. Checked client-side because server-side
// rejection of an oversized upload is inconsistent — nginx sometimes returns a clean
// 413, but for larger overages it tears down the connection mid-upload instead
// (net::ERR_CONNECTION_RESET), which axios reports with no `.response` at all to
// inspect. Catching it before the request ever goes out sidesteps that entirely.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ImageUrlField({ label, value, onChange, placeholder }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      // A 413 from a reverse proxy (nginx, etc.) arrives as an HTML error page, not
      // JSON — err.response.data.error won't exist even though the cause (file too
      // large) is knowable from the status code alone. Kept as a backstop in case the
      // client-side check above ever drifts from the server's actual configured limit.
      if (err.response?.status === 413) {
        setError('Image is too large for the server to accept.');
      } else {
        setError(err.response?.data?.error || 'Upload failed.');
      }
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
