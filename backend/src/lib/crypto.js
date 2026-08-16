import crypto from 'crypto';

// AES-256-GCM for secrets stored at rest (currently: Gmail OAuth tokens) — a Gmail
// refresh token grants the ability to send email as the connected account, so it's
// worth encrypting even though this app has no other users to protect it from.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('ENCRYPTION_KEY is not set');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  return key;
}

export function encrypt(text) {
  if (text == null) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv + authTag + ciphertext, all base64-packed together so there's a single column
  // to store rather than three.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(payload) {
  if (payload == null) return null;
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
