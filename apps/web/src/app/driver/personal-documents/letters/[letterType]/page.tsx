import { notFound } from 'next/navigation';
import { PrintLetterButton } from '@/features/driver/print-letter';
import { getDriverProfile } from '@/features/driver/driver-api';

const titles = { commitment: 'تعهدنامه راننده سرویس مدارس', addiction: 'معرفی‌نامه آزمایش عدم اعتیاد' } as const;
export default async function Page({ params }: { params: Promise<{ letterType: string }> }) {
  const { letterType } = await params;
  if (!(letterType in titles)) notFound();
  const { driver, vehicle } = await getDriverProfile();
  const title = titles[letterType as keyof typeof titles];
  return <main dir="rtl" className="mx-auto min-h-screen max-w-[210mm] bg-white p-8 text-black sm:p-14 print:max-w-none print:p-0">
    <div className="mb-8 flex items-center justify-between gap-4 print:hidden"><a href="/driver/personal-documents" className="font-bold text-primary">بازگشت به مدارک</a><PrintLetterButton /></div>
    <article className="min-h-[270mm] border-2 border-black p-10">
      <h1 className="text-center text-2xl font-black">{title}</h1>
      <dl className="mt-12 grid grid-cols-2 gap-x-10 gap-y-6 text-sm">
        <div><dt className="text-gray-600">نام و نام خانوادگی</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold">{driver.firstName} {driver.lastName}</dd></div>
        <div><dt className="text-gray-600">نام پدر</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold">{driver.fatherName}</dd></div>
        <div><dt className="text-gray-600">کد ملی</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold" dir="ltr">{driver.nationalId}</dd></div>
        <div><dt className="text-gray-600">شماره همراه</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold" dir="ltr">{driver.phoneNumber}</dd></div>
        <div><dt className="text-gray-600">نوع خودرو</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold">{vehicle?.vehicleType ?? '—'}</dd></div>
        <div><dt className="text-gray-600">شماره پلاک</dt><dd className="mt-2 border-b border-dotted border-black pb-2 font-bold">{vehicle?.plateNumber ?? '—'}</dd></div>
      </dl>
      <section className="mt-14 rounded-lg border border-dashed border-gray-500 p-8 text-center leading-9 text-gray-600"><p className="font-black text-black">محل درج متن نهایی نامه</p><p>متن رسمی این سند پس از دریافت از مدیریت، بدون تغییر در اطلاعات خودکار راننده در این قسمت قرار می‌گیرد.</p></section>
      <div className="mt-24 grid grid-cols-2 gap-16 text-center"><div><p>امضا و اثر انگشت راننده</p><div className="mt-20 border-b border-black" /></div><div><p>مهر و امضای شرکت</p><div className="mt-20 border-b border-black" /></div></div>
    </article>
  </main>;
}
