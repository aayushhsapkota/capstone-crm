import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

// Deletes a file previously returned by POST /api/uploads, but only if the URL actually
// points into our own uploads dir — image fields also accept a hand-typed external URL,
// and we must never touch those. Best-effort: a missing/already-gone file is not an
// error, and a failure here should never block the caller's actual save/delete.
export async function deleteUploadedFileIfLocal(url) {
  if (!url) return;

  const base = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  const prefix = `${base}/uploads/`;
  if (!url.startsWith(prefix)) return;

  const filename = url.slice(prefix.length);
  // Guard against path traversal — an uploaded filename is always flat (no slashes).
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) return;

  try {
    await fs.unlink(path.join(uploadsDir, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to delete replaced upload:', filename, err);
  }
}
