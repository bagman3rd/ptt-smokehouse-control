import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PTT Smokehouse Control',
  description: 'Pigeon Toed Tavern BBQ production planning dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
