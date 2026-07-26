'use client';

import { ClipboardCheck, FileText, GraduationCap, WalletCards } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { PageContainer } from '@/components/common/page-container';

const steps = [
  ['ایجاد حساب خانواده', 'اطلاعات خانواده و نشانی سرویس را یک‌بار ثبت کنید.', GraduationCap],
  ['انتخاب دانش‌آموز و مدرسه', 'مشخصات تحصیلی، مدرسه و نوع سرویس دلخواه را انتخاب کنید.', ClipboardCheck],
  ['مرور و پذیرش قرارداد', 'همه جزئیات را شفاف ببینید و قرارداد را آنلاین بپذیرید.', FileText],
  ['پرداخت و شروع مسیر', 'پیش‌پرداخت را انجام دهید و وضعیت درخواست را لحظه‌ای ببینید.', WalletCards],
] as const;

export function JourneyStory() {
  return (
    <section className="overflow-hidden bg-white py-20 lg:py-28">
      <PageContainer>
        <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-[2rem] bg-navy p-3 shadow-[0_30px_80px_-35px_rgba(15,23,42,.55)]"
          >
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.45rem]">
              <Image src="/images/multiple-content-bus-family-driver-school-in-one-image.png" alt="خانواده، مدرسه و سرویس دانش‌آموزی" fill className="object-cover" sizes="(max-width:1024px) 100vw,45vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                <p className="text-sm font-bold text-sun">یک مسیر روشن و قابل پیگیری</p>
                <p className="mt-2 text-2xl font-black">از اطلاعات خانواده تا شروع سرویس</p>
              </div>
            </div>
          </motion.div>
          <div>
            <p className="font-bold text-primary">مسیر دریافت سرویس</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">چهار قدم، بدون سردرگمی</h2>
            <p className="mt-4 max-w-xl leading-7 text-muted">هر مرحله دقیقاً در جای خودش قرار دارد؛ اطلاعات را وارد می‌کنید، نتیجه را می‌بینید و همیشه می‌دانید قدم بعدی چیست.</p>
            <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
              {steps.map(([title, description, Icon], index) => (
                <motion.article
                  key={title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * .08 }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:-translate-y-1 hover:border-primary/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <span className="absolute -left-2 -top-4 text-7xl font-black text-slate-100 transition group-hover:text-primary/5">۰{index + 1}</span>
                  <div className="relative">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Icon className="size-5" /></span>
                    <h3 className="mt-4 font-black">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
