import './globals.css';
import type { Metadata } from 'next';
import CookieConsent from '@/components/CookieConsent';
import WebVitalsReporter from '@/components/WebVitalsReporter';

export const metadata: Metadata = {
  title: 'Smokehouse Control',
  description: 'BBQ production planning, cook plans, and end-of-day control for smokehouse operations.',
  robots: { index: false, follow: false } // app is behind auth; marketing site is separate
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Skip link for keyboard/screen-reader users (WCAG 2.4.1) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <CookieConsent />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
