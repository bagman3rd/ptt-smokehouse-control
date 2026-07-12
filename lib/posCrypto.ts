import crypto from 'crypto';

function key() {
  const secret = process.env.POS_ENCRYPTION_KEY || process.env.AUTH_SECRET || '';
  if (!secret) throw new Error('POS_ENCRYPTION_KEY or AUTH_SECRET is required before storing live POS credentials.');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(value?: string | null) {
  if (!value) return null;
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8');
}
