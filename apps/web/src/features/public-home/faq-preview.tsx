'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const faqs = [
  {
    question: 'چطور می‌توانم برای سرویس مدرسه ثبت‌نام کنم؟',
    answer: 'وارد سامانه شوید، حساب خانواده ایجاد کنید، دانش‌آموز را اضافه کنید و اطلاعات مدرسه را وارد نمایید. سپس درخواست شما بررسی و قیمت‌گذاری می‌شود.',
    category: 'ثبت‌نام',
  },
  {
    question: 'هزینه سرویس مدرسه چقدر است و چطور محاسبه می‌شود؟',
    answer: 'هزینه بر اساس مسافت، مدرسه، نوع سرویس و تعداد فرزندان محاسبه می‌شود. پس از ثبت درخواست، قیمت نهایی به شما اعلام خواهد شد.',
    category: 'قیمت‌گذاری',
  },
  {
    question: 'آیا می‌توانم چند دانش‌آموز را در یک حساب مدیریت کنم؟',
    answer: 'بله. می‌توانید تمام فرزندان خود را در یک حساب خانواده مدیریت کنید و برای هر کدام به صورت جداگانه درخواست ثبت کنید.',
    category: 'حساب',
  },
  {
    question: 'روش‌های پرداخت کدامند؟',
    answer: 'می‌توانید به صورت یک‌جا یا اقساطی و فعلاً از مسیر پرداخت آفلاین اقدام کنید. پرداخت آنلاین به‌زودی فعال می‌شود.',
    category: 'پرداخت',
  },
];

const categories = ['همه', 'ثبت‌نام', 'قیمت‌گذاری', 'پرداخت', 'حساب'];

export function FaqPreview() {
  const [activeCategory, setActiveCategory] = useState('همه');
  const [search, setSearch] = useState('');

  const filtered = faqs.filter((faq) => {
    const matchCategory = activeCategory === 'همه' || faq.category === activeCategory;
    const matchSearch = !search || faq.question.includes(search) || faq.answer.includes(search);
    return matchCategory && matchSearch;
  });

  return (
    <section className="surface-inset border-y border-border py-16 sm:py-20">
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="font-bold text-primary">سوالات متداول</p>
            <h2 className="mt-2 text-3xl font-black">پاسخ سؤالات شما</h2>
            <p className="mt-3 text-muted">
              سریع‌ترین راه برای پیدا کردن پاسخ سؤالات رایج.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="جست‌وجو در پرسش‌ها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="دسته‌بندی پرسش‌ها">
            {categories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-bold transition-colors',
                  activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface-paper text-muted hover:text-foreground border border-border',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="mt-6 space-y-3" role="tabpanel">
            {filtered.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-muted">نتیجه‌ای برای جست‌وجوی شما یافت نشد.</p>
            )}
          </div>
          <div className="mt-8 text-center">
            <ButtonLink href="/faq" variant="secondary">
              مشاهده همه پرسش‌ها
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper shadow-[var(--shadow-raised)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-right text-sm font-bold transition-colors hover:text-primary"
        aria-expanded={open}
      >
        {question}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-muted transition-transform duration-[var(--duration-ui)]',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-[var(--duration-ui)]',
          open ? 'max-h-96 pb-4' : 'max-h-0',
        )}
      >
        <p className="px-5 text-sm leading-relaxed text-muted">{answer}</p>
      </div>
    </div>
  );
}
