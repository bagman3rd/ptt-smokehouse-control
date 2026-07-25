// Build 10.0.0 — contact normalization for consent + notification routing.
// Phone numbers are normalized to E.164 (US default). Emails are lowercased/trimmed.

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase();
  // Minimal RFC-5322-ish sanity check; provider does the real validation.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

// Normalize North American numbers to E.164 (+1XXXXXXXXXX).
// International numbers already in +CC form are preserved.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const input = String(raw).trim();
  if (input.startsWith('+')) {
    const digits = input.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-***-${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const shown = local.slice(0, 1);
  return `${shown}***@${domain}`;
}
