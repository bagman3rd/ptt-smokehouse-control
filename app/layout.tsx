import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smokehouse Control',
  description: 'BBQ production planning dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
