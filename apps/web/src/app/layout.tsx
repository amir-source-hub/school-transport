import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "سامانه سرویس مدرسه",
    template: "%s | سامانه سرویس مدرسه",
  },
  description: "ثبت‌نام و مدیریت خدمات سرویس مدرسه برای خانواده‌ها",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
