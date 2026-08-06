import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/providers/app-providers';
import { SITE_NAME, SITE_URL } from '@/lib/route-metadata';
import '@fontsource-variable/vazirmatn/wght.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'ثبت‌نام و مدیریت خدمات سرویس مدرسه برای خانواده‌ها',
};

export const viewport: Viewport = {
  themeColor: '#fafaf7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
