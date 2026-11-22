import type { Metadata, Viewport } from 'next';
import '@/styles/theme.css';
import { ToastContainer } from '@/components/common/ToastContainer';
import { GlobalClientInit } from '@/components/common/GlobalClientInit';

export const metadata: Metadata = {
  title: 'FINAL OVERRIDE | Invictors Club VVCE',
  description: 'FINAL OVERRIDE — Timed Team Escape-Room Style Tech Challenge | Dept. of CSE, VVCE Mysuru',
  icons: {
    icon: '/assets/invictors-logo.jpg',
    shortcut: '/assets/invictors-logo.jpg',
    apple: '/assets/invictors-logo.jpg'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#030712'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GlobalClientInit />
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
