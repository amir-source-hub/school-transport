import type { Metadata } from 'next';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
