import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { uploadImage } from '../api/uploads.js';

// Must match the backend's multer limits.fileSize (backend/src/routes/uploads.js) and
// nginx's client_max_body_size on the host. Checked client-side because server-side
// rejection of an oversized upload is inconsistent — nginx sometimes returns a clean
// 413, but for larger overages it tears down the connection mid-upload instead
// (net::ERR_CONNECTION_RESET), which axios reports with no `.response` at all to
// inspect. Catching it before the request ever goes out sidesteps that entirely.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Picking a file no longer uploads it right away — it's held locally (with a preview
// via a local blob URL) until the parent form calls commitPendingUpload() via ref,
// which the parent does at Save time. This avoids orphaned files on disk from picking
// an image and then never saving the form.
const ImageUrlField = forwardRef(function ImageUrlField({ label, value, onChange, placeholder }, ref) {
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const objectUrlRef = useRef(null);

  const clearPendingPreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl('');
    setPendingFile(null);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      e.target.value = '';
      return;
    }

    setError('');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewUrl(localUrl);
    setPendingFile(file);
    e.target.value = '';
  };

  useImperativeHandle(ref, () => ({
    // Called by the parent form at Save time. Returns the URL to persist — either the
    // freshly uploaded one, or the existing `value` unchanged if nothing is pending.
    async commitPendingUpload() {
      if (!pendingFile) return value;
      setUploading(true);
      setError('');
      try {
        const url = await uploadImage(pendingFile);
        clearPendingPreview();
        onChange(url);
        return url;
      } catch (err) {
        setError(err.response?.data?.error || 'Upload failed.');
        throw err;
      } finally {
        setUploading(false);
      }
    },
    hasPendingUpload() {
      return !!pendingFile;
    },
  }));

  const displayValue = previewUrl || value;
  const hasImage = !!displayValue;

  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>

      {hasImage && (
        <img
          src={displayValue}
          alt=""
          className="h-20 w-20 object-cover rounded-lg border border-slate-200 mb-2"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
          onLoad={(e) => {
            e.target.style.display = 'block';
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            // Typing a URL directly cancels any pending file selection — the two are
            // mutually exclusive ways of setting this field.
            if (pendingFile) clearPendingPreview();
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
        />
        <label className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap">
          {uploading ? 'Uploading…' : hasImage ? 'Replace' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      {pendingFile && !uploading && (
        <p className="text-xs text-slate-500 mt-1">Selected — will upload when you click Save.</p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});

export default ImageUrlField;
