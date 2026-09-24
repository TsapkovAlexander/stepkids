import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/nunito';
import './globals.css';

export const metadata: Metadata = {
  title: 'Шаг за шагом',
  description: 'Детский конструктор программирования: собери программу из блоков и помоги герою.',
  applicationName: 'Шаг за шагом',
  appleWebApp: { capable: true, title: 'Шаг за шагом', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#dff4ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
