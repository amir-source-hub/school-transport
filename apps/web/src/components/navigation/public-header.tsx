import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

const links = [
  ['خدمات', '/services'],
  ['مراحل ثبت‌نام', '/registration-guide'],
  ['مدارس', '/schools'],
  ['نحوه قیمت‌گذاری', '/pricing'],
  ['پرسش‌های متداول', '/faq'],
  ['تماس با ما', '/contact'],
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <PageContainer className="flex min-h-18 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 font-black text-foreground"
          aria-label="صفحه اصلی سامانه سرویس مدرسه"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-primary text-xl text-white"
          >
            س
          </span>
          <span>سامانه سرویس مدرسه</span>
        </Link>
        <nav
          aria-label="ناوبری اصلی"
          className="hidden items-center gap-5 text-sm font-medium lg:flex"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-muted transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <ButtonLink href="/login" variant="ghost">
            ورود
          </ButtonLink>
          <ButtonLink href="/register">شروع ثبت‌نام</ButtonLink>
        </div>
        <details className="relative lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border px-3 font-bold">
            منو
          </summary>
          <div className="absolute end-0 top-14 w-72 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-md)]">
            <nav aria-label="ناوبری موبایل" className="flex flex-col">
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 hover:bg-surface-muted"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <ButtonLink href="/login" variant="secondary">
                ورود
              </ButtonLink>
              <ButtonLink href="/register">ثبت‌نام</ButtonLink>
            </div>
          </div>
        </details>
      </PageContainer>
    </header>
  );
}
