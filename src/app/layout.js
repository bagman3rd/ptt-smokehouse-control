import './globals.css';

export const metadata = {
  title: 'PTT Smokehouse Control',
  description: 'Smokehouse operations control dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
