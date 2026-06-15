import type { Metadata } from 'next';
import '../styles/globals.css';
import { AppShell } from '@ui/compositions/AppShell';

export const metadata: Metadata = {
  title: 'Nocturne React POC',
  description: 'React frontend proof of concept for Nocturne glucose data.',
  icons: {
    icon: '/favicon.svg'
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="theme-dark" suppressHydrationWarning>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
