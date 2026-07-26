'use client';

import { ChevronDown, HelpCircle, Search, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const questions = [
  { q: 'آیا یک خانواده می‌تواند چند دانش‌آموز ثبت کند؟', a: 'بله. یک حساب خانوادگی می‌تواند چند دانش‌آموز را مدیریت کند و اطلاعات، درخواست، قرارداد و پرداخت‌های هر دانش‌آموز جداگانه نگهداری می‌شود.', cat: 'حساب' },
  { q: 'قیمت سرویس چه زمانی مشخص می‌شود؟', a: 'قیمت ثابت عمومی در زمان ثبت‌نام وجود ندارد. مدیریت پس از بررسی درخواست و جزئیات خدمت، قیمت دوره کامل را تعیین می‌کند.', cat: 'قیمت' },
  { q: 'آیا ثبت درخواست به معنی تأیید سرویس است؟', a: 'خیر. درخواست پس از ارسال نیاز به بررسی مدیریت دارد و وضعیت تأیید، رد یا درخواست اصلاح در سامانه نمایش داده می‌شود.', cat: 'ثبت‌نام' },
  { q: 'چه روش‌های پرداختی وجود دارد؟', a: 'پرداخت آنلاین و پرداخت آفلاین با بررسی مدیریت پشتیبانی می‌شوند. گزینه پرداخت کامل یا اقساطی طبق اطلاعات اعلام‌شده برای قرارداد نمایش داده خواهد شد.', cat: 'پرداخت' },
  { q: 'آیا می‌توان اطلاعات ثبت‌شده را ویرایش کرد؟', a: 'اطلاعات ساده و غیرعملیاتی در محدوده مجاز قابل ویرایش‌اند. اطلاعات حساس مانند مدرسه، خدمت تأییدشده، قیمت و وضعیت پرداخت تحت کنترل مدیریت باقی می‌مانند.', cat: 'ثبت‌نام' },
  { q: 'مدت زمان بررسی درخواست چقدر است؟', a: 'مدت زمان بررسی به حجم درخواست‌های مدیریت بستگی دارد و در اسرع وقت انجام می‌شود. وضعیت درخواست از طریق پنل خانواده قابل پیگیری است.', cat: 'ثبت‌نام' },
  { q: 'آیا امکان انصراف و استرداد وجه وجود دارد؟', a: 'شرایط انصراف و استرداد وجه بر اساس توافقات منعقدشده در قرارداد تعیین می‌شود. برای اطلاعات دقیق به متن قرارداد مراجعه کنید.', cat: 'پرداخت' },
];

const categories = ['همه', 'ثبت‌نام', 'قیمت', 'پرداخت', 'حساب'];

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('همه');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return questions.filter(item => {
      const matchCat = activeCat === 'همه' || item.cat === activeCat;
      const matchSearch = !search || item.q.includes(search) || item.a.includes(search);
      return matchCat && matchSearch;
    });
  }, [search, activeCat]);

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/images/hero-family.png" alt="" fill className="object-cover object-[center_45%]" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">سوالات متداول</Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">پاسخ سوالات شما</h1>
            <p className="mt-4 text-lg text-white/60">سریع‌ترین راه برای پیدا کردن پاسخ سوالات رایج.</p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper border-b border-border/60 py-8">
        <PageContainer>
          <div className="mx-auto max-w-xl">
            <div className="relative">
              <Search aria-hidden="true" className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="جست‌وجو در پرسش‌ها..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-11 h-12 rounded-[var(--radius-pill)]"
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2" role="tablist">
              {categories.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={activeCat === cat}
                  onClick={() => setActiveCat(cat)}
                  className={cn(
                    'rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-bold transition-all',
                    activeCat === cat ? 'bg-primary text-white' : 'bg-surface-inset text-muted hover:text-foreground',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle aria-hidden="true" className="mx-auto size-10 text-muted/30" />
                <p className="mt-4 font-bold text-muted">نتیجه‌ای یافت نشد</p>
                <p className="mt-1 text-sm text-muted">پرسشی با این کلمات در سامانه ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item, i) => {
                  const id = `faq-${i}`;
                  const isOpen = openId === id;
                  return (
                    <div
                      key={id}
                      className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper shadow-[var(--shadow-raised)] transition-all duration-[var(--duration-ui)] hover:shadow-[var(--shadow-floating)]"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : id)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right text-sm font-bold transition-colors hover:text-primary"
                        aria-expanded={isOpen}
                      >
                        <span className="flex-1">{item.q}</span>
                        <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted transition-transform duration-[var(--duration-ui)]', isOpen && 'rotate-180')} />
                      </button>
                      <div className={cn('overflow-hidden transition-all duration-[var(--duration-ui)]', isOpen ? 'max-h-96' : 'max-h-0')}>
                        <div className="border-t border-border/50 px-6 py-4">
                          <p className="text-sm leading-relaxed text-muted">{item.a}</p>
                          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <ThumbsUp aria-hidden="true" className="size-3" />
                              آیا این پاسخ مفید بود؟
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-sm text-muted">پاسخ خود را پیدا نکردید؟</p>
              <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/contact" variant="secondary">تماس با پشتیبانی</ButtonLink>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
