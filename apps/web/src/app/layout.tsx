import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/providers/app-providers';
import '@fontsource-variable/vazirmatn/wght.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'سامانه سرویس مدرسه',
    template: '%s | سامانه سرویس مدرسه',
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
