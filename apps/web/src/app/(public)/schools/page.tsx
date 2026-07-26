import type { Metadata } from 'next';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/common/page-container';
import { SchoolsDirectory } from './schools-directory';
import { getSchools } from '@/features/schools/schools-api';

export const metadata: Metadata = { title: 'مدارس' };

export default async function SchoolsPage() {
  const { schools, source } = await getSchools();

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/images/hero-city.png" alt="" fill className="object-cover object-[center_60%]" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">
              مدارس تحت پوشش
            </Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">
              مدرسه فرزندتان را پیدا کنید
            </h1>
            <p className="mt-4 text-lg text-white/60">
              از فهرست مدارس تأییدشده سامانه، مدرسه مورد نظر را انتخاب کنید.
            </p>
          </div>
        </PageContainer>
      </section>

      <SchoolsDirectory schools={schools} source={source} />
    </>
  );
}
