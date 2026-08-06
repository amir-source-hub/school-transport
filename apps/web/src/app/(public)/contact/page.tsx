'use client';

import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const channels = [
  {
    icon: Phone,
    label: 'تماس تلفنی',
    value: '۰۲۱-۱۲۳۴۵۶۷۸',
    desc: 'شنبه تا چهارشنبه ۸:۰۰ تا ۱۸:۰۰',
    dir: 'ltr' as const,
  },
  {
    icon: Mail,
    label: 'ایمیل',
    value: 'support@schooltransport.ir',
    desc: 'پاسخگویی ظرف ۲۴ ساعت کاری',
    dir: 'ltr' as const,
  },
  {
    icon: MapPin,
    label: 'نشانی',
    value: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۳۴',
    desc: 'ثمین گشت مهر ایران — واحد پشتیبانی',
    dir: 'rtl' as const,
  },
];

const topics: SelectOption[] = [
  { value: '', label: 'موضوع را انتخاب کنید' },
  { value: 'registration', label: 'ثبت‌نام' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'contract', label: 'قرارداد' },
  { value: 'technical', label: 'مشکل فنی' },
  { value: 'other', label: 'سایر موارد' },
];

export default function ContactPage() {
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/contact-hero-parent-driver-student-pickup.webp"
            alt=""
            fill
            className="object-cover object-center"
            priority
            fetchPriority="high"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">
              پشتیبانی
            </Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">
              در کنار شما هستیم
            </h1>
            <p className="mt-4 text-lg text-white/60">
              تیم پشتیبانی ثمین گشت مهر ایران آماده پاسخگویی به سوالات شماست.
            </p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-3">
              {channels.map((ch, i) => (
                <div
                  key={ch.label}
                  className={cn(
                    'rounded-[var(--radius-card)] border border-border/60 p-6 shadow-[var(--shadow-raised)] transition-all hover:shadow-[var(--shadow-floating)]',
                    i === 0 && 'sm:col-span-1',
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <ch.icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-4 text-sm font-bold text-primary">{ch.label}</p>
                  <p className="mt-1 font-black" dir={ch.dir}>
                    {ch.value}
                  </p>
                  <p className="mt-1 text-xs text-muted">{ch.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-14">
        <PageContainer>
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
            <div>
              <div className="text-center lg:text-right">
                <MessageSquare aria-hidden="true" className="mx-auto size-8 text-primary lg:mx-0" />
                <h2 className="mt-3 text-2xl font-black">ارسال پیام</h2>
                <p className="mt-1 text-sm text-muted">فرم زیر را پر کنید تا با شما تماس بگیریم.</p>
              </div>
              <div className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-bold">
                      نام و نام خانوادگی
                    </label>
                    <Input
                      id="contact-name"
                      placeholder="نام خود را وارد کنید"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-topic" className="mb-1.5 block text-sm font-bold">
                      موضوع
                    </label>
                    <Select options={topics} value={topic} onValueChange={setTopic} />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-bold">
                    پیام شما
                  </label>
                  <Textarea
                    id="contact-message"
                    placeholder="پیام خود را بنویسید..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="lg" className="bg-navy text-white hover:bg-navy/90">
                    <Send aria-hidden="true" className="size-4" />
                    ارسال پیام
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative mt-10 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-canvas)]">
                <Image
                  src="/images/contact-family-at-school-transport-service-desk.webp"
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-10">
        <PageContainer>
          <div className="mx-auto max-w-lg text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted">
              <Clock aria-hidden="true" className="size-4" />
              <span>ساعات پاسخگویی: شنبه تا چهارشنبه ۸:۰۰ تا ۱۸:۰۰</span>
            </div>
            <p className="mt-2 text-xs text-muted">پاسخگویی به پیام‌های ارسالی ظرف ۲۴ ساعت کاری</p>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
