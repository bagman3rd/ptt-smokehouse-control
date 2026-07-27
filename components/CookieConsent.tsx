'use client';

// Build 11.0.2 — cookie consent banner (GDPR / ePrivacy).
// Essential cookies are always on. Analytics/marketing are opt-in.
// Consent is stored client-side (cookie) and mirrored server-side for audit.

import { useEffect, useState } from 'react';

const CONSENT_COOKIE = 'shc_cookie_consent';

type Prefs = { essential: true; functional: boolean; analytics: boolean; marketing: boolean };

function readConsent(): Prefs | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1]));
  } catch {
    return null;
  }
}

function writeConsent(prefs: Prefs) {
  const value = encodeURIComponent(JSON.stringify(prefs));
  // 12-month expiry per ICO / CNIL guidance.
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  // Mirror to server for audit trail (best-effort).
  fetch('/api/cookie-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  }).catch(() => {});
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent({ essential: true, functional: true, analytics: true, marketing: true });
    setVisible(false);
  };
  const rejectNonEssential = () => {
    writeConsent({ essential: true, functional: false, analytics: false, marketing: false });
    setVisible(false);
  };
  const savePrefs = () => {
    writeConsent({ essential: true, functional, analytics, marketing });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: '#0f172a',
        color: '#f8fafc',
        padding: '16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.25)'
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {!showPrefs ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <p style={{ margin: 0, flex: '1 1 320px', fontSize: 14, lineHeight: 1.5 }}>
              We use essential cookies to run Smokehouse Control, and optional cookies for
              analytics. See our{' '}
              <a href="/privacy" style={{ color: '#fca5a5' }}>
                Privacy Policy
              </a>
              .
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setShowPrefs(true)} style={btnGhost} aria-label="Manage cookie preferences">
                Manage
              </button>
              <button onClick={rejectNonEssential} style={btnGhost}>
                Reject non-essential
              </button>
              <button onClick={acceptAll} style={btnPrimary}>
                Accept all
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Cookie preferences</h2>
            <label style={rowStyle}>
              <input type="checkbox" checked readOnly aria-label="Essential cookies (always on)" />
              <span>
                <strong>Essential</strong> — required for login and security. Always on.
              </span>
            </label>
            <label style={rowStyle}>
              <input
                type="checkbox"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
              />
              <span>
                <strong>Functional</strong> — remembers your preferences.
              </span>
            </label>
            <label style={rowStyle}>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>Analytics</strong> — helps us improve the product.
              </span>
            </label>
            <label style={rowStyle}>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>Marketing</strong> — measures campaign effectiveness.
              </span>
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowPrefs(false)} style={btnGhost}>
                Back
              </button>
              <button onClick={savePrefs} style={btnPrimary}>
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#b91c1c',
  color: '#fff',
  border: 0,
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer'
};
const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: '#e2e8f0',
  border: '1px solid #475569',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer'
};
const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  padding: '6px 0',
  fontSize: 14
};
