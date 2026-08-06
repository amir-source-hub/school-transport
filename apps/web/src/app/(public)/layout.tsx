import { PublicFooter } from '@/components/navigation/public-footer';
import { PublicHeader } from '@/components/navigation/public-header';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        رفتن به محتوای اصلی
      </a>
      <PublicHeader />
      <main id="main-content" className="flex-1" style={{ minHeight: '100vh' }}>
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
