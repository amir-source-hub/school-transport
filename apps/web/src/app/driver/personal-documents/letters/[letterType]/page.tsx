import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PrintLetterButton } from '@/features/driver/print-letter';
import { getDriverProfile } from '@/features/driver/driver-api';
import { formatJalaliDate } from '@/lib/formatters';

export default async function Page({ params }: { params: Promise<{ letterType: string }> }) {
  const { letterType } = await params;
  if (letterType !== 'addiction') notFound();
  const { driver } = await getDriverProfile();
  const fullName = `${driver.firstName} ${driver.lastName}`.trim();
  const today = formatJalaliDate(new Date().toISOString());

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 py-5 text-black print:bg-white print:py-0">
      <style>{'@media print { @page { size: A5 portrait; margin: 0; } }'}</style>
      <div className="mx-auto mb-5 flex max-w-[148mm] flex-wrap items-center justify-between gap-4 px-4 print:hidden">
        <a href="/driver/personal-documents" className="font-bold text-primary">
          بازگشت به مدارک
        </a>
        <PrintLetterButton label="چاپ نامه" />
      </div>
      <article className="relative mx-auto flex min-h-[210mm] w-full max-w-[148mm] flex-col overflow-hidden bg-white shadow-xl print:min-h-[210mm] print:max-w-none print:shadow-none">
        <div className="relative">
          <Image
            src="/driver-documents/addiction-letter-header.jpg"
            alt="سربرگ شرکت ثمین گشت مهر ایرانیان"
            width={1060}
            height={255}
            priority
            fetchPriority="high"
            sizes="148mm"
            className="h-auto w-full"
          />
          <span className="absolute left-[7%] top-[43%] bg-[#ffd200] px-1 text-[9px] font-black sm:text-[11px]">
            {today}
          </span>
        </div>
        <div className="relative flex-1 px-[9mm] pb-[5mm] pt-[10mm] text-[13px] leading-[2.45] sm:text-[15px]">
          <Image
            src="/driver-documents/company-road-watermark.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="110mm"
            className="pointer-events-none object-contain p-[18mm] opacity-[0.11]"
          />
          <div className="relative z-10">
            <h1 className="text-right text-xl font-black sm:text-2xl">مدیریت محترم آزمایشگاه</h1>
            <p className="mt-5 text-right text-lg font-black sm:text-xl">با سلام و احترام؛</p>
            <p className="mt-4 text-justify text-base font-medium leading-[2.6] sm:text-lg">
              بدین‌وسیله آقا/خانم <strong className="px-1">{fullName}</strong> فرزند{' '}
              <strong className="px-1">{driver.fatherName}</strong> با شماره ملی{' '}
              <strong dir="ltr" className="inline-block px-1 tabular-nums">
                {driver.nationalId}
              </strong>{' '}
              جهت انجام آزمایش‌های عدم اعتیاد به مواد مخدر به حضورتان معرفی می‌گردد.
            </p>
            <p className="mt-3 text-justify text-base font-medium leading-[2.6] sm:text-lg">
              خواهشمند است پس از انجام مراحل لازم، نتیجه را به این شرکت اعلام فرمایید.
            </p>
            <div className="mt-10 w-40 text-center text-sm leading-8 sm:mr-20">
              <p>با تشکر</p>
              <p>مدیر عامل</p>
              <p className="font-bold">رضا جمالی</p>
            </div>
          </div>
        </div>
        <Image
          src="/driver-documents/addiction-letter-footer.jpg"
          alt="نشانی و اطلاعات تماس شرکت ثمین گشت مهر ایرانیان"
          width={1060}
          height={200}
          sizes="148mm"
          className="h-auto w-full"
        />
      </article>
    </main>
  );
}
