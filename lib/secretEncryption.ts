import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function key() {
  const raw = process.env.TOTP_ENCRYPTION_KEY || '';
  if (process.env.NODE_ENV === 'production' && raw.length < 32) throw new Error('TOTP_ENCRYPTION_KEY must be at least 32 characters in production.');
  return createHash('sha256').update(raw || 'development-only-totp-key').digest();
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}
export function decryptSecret(value: string | null | undefined) {
  if (!value) return ''; if (!value.startsWith('enc:v1:')) return value;
  const [, , iv64, tag64, data64] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv64, 'base64'));
  decipher.setAuthTag(Buffer.from(tag64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data64, 'base64')), decipher.final()]).toString('utf8');
}
