import { notFound } from 'next/navigation';
import { PrintLetterButton } from '@/features/driver/print-letter';
import { getDriverProfile } from '@/features/driver/driver-api';

export default async function Page({ params }: { params: Promise<{ letterType: string }> }) {
  const { letterType } = await params;
  if (letterType !== 'addiction') notFound();
  const { driver } = await getDriverProfile();

  return (
    <main
      dir="rtl"
      className="mx-auto min-h-screen max-w-[210mm] bg-white p-5 text-black sm:p-10 print:max-w-none print:p-0"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <a href="/driver/personal-documents" className="font-bold text-primary">
          بازگشت به مدارک
        </a>
        <PrintLetterButton label="چاپ نامه" />
      </div>
      <article className="min-h-[270mm] border-2 border-black p-5 sm:p-10 print:border-0 print:p-0">
        <h1 className="text-center text-2xl font-black">معرفی‌نامه آزمایش عدم اعتیاد</h1>
        <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-5 text-sm sm:grid-cols-2">
          {[
            ['نام و نام خانوادگی', `${driver.firstName} ${driver.lastName}`],
            ['نام پدر', driver.fatherName],
            ['کد ملی', driver.nationalId],
            ['شماره همراه', driver.phoneNumber],
            ['نشانی', `${driver.province}، ${driver.city}، ${driver.streetAddress}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-600">{label}</dt>
              <dd className="mt-2 min-h-8 border-b border-dotted border-black pb-2 font-bold">
                {value || '—'}
              </dd>
            </div>
          ))}
        </dl>
        <section className="mt-14 rounded-lg border border-dashed border-gray-500 p-8 text-center leading-9 text-gray-600">
          <p className="font-black text-black">محل درج متن نهایی نامه</p>
          <p>
            متن رسمی این سند پس از دریافت از مدیریت، همراه با اطلاعات راننده در این قسمت قرار
            می‌گیرد.
          </p>
        </section>
        <div className="mt-24 grid grid-cols-2 gap-16 text-center">
          <div>
            <p>امضا و اثر انگشت راننده</p>
            <div className="mt-20 border-b border-black" />
          </div>
          <div>
            <p>مهر و امضای شرکت</p>
            <div className="mt-20 border-b border-black" />
          </div>
        </div>
      </article>
    </main>
  );
}
