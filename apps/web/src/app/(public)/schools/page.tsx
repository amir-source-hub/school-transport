import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowDown, Building2, MapPin, ShieldCheck } from 'lucide-react';
import { PageContainer } from '@/components/common/page-container';
import { SchoolsDirectory } from './schools-directory';
import { getSchools } from '@/features/schools/schools-api';

export const metadata: Metadata = { title: 'مدارس' };

export default async function SchoolsPage() {
  const { schools, source } = await getSchools();

  return (
    <>
      <section className="relative min-h-[620px] overflow-hidden bg-navy pb-20 pt-36 sm:pt-40">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/images/getting in bus 2.png" alt="" fill className="object-cover object-[center_55%]" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/75 to-navy/25" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,193,59,.16),transparent_32%)]" />
        </div>
        <PageContainer className="relative z-10">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-sun backdrop-blur"><ShieldCheck className="size-4" />مدارس تأییدشده سامانه</p>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.25] text-white sm:text-5xl lg:text-6xl">
              مدرسه نزدیک شما،<br /><span className="text-sun">یک جست‌وجو فاصله دارد</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">
              میان مدارس فعال جست‌وجو کنید، منطقه و نشانی را مقایسه کنید و انتخاب مطمئن‌تری برای سرویس فرزندتان داشته باشید.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <span className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white backdrop-blur"><Building2 className="size-4 text-sun" />{schools.length.toLocaleString('fa-IR')} مدرسه فعال</span>
              <span className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white backdrop-blur"><MapPin className="size-4 text-sun" />پوشش چندمنطقه‌ای</span>
            </div>
          </div>
          <a href="#school-directory" className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm font-bold text-white/70">مشاهده فهرست <ArrowDown className="size-4" /></a>
        </PageContainer>
      </section>

      <SchoolsDirectory schools={schools} source={source} />
    </>
  );
}
