import { notFound } from 'next/navigation';
import { DownloadLetterButton, PrintLetterButton } from '@/features/driver/print-letter';
import { getDriverProfile, getDriverRuns } from '@/features/driver/driver-api';
import { isDriverRouteContractReady } from '@/features/driver/driver-commitment';
import { DRIVER_CONTRACT_CLAUSES, DRIVER_CONTRACT_NOTES } from '@/features/driver-enrollment/driver-contract';
import { formatJalaliDate, formatPersianTime } from '@/lib/formatters';

const direction = (value: string) => value === 'TO_SCHOOL' ? 'رفت' : value === 'FROM_SCHOOL' ? 'برگشت' : 'رفت و برگشت';

export default async function Page({ params, searchParams }: { params: Promise<{ letterType: string }>; searchParams: Promise<{ routeId?: string }> }) {
  const { letterType } = await params;
  const { routeId } = await searchParams;
  if (letterType !== 'commitment' && letterType !== 'addiction') notFound();
  const [{ driver, vehicle }, runs] = await Promise.all([getDriverProfile(), getDriverRuns()]);
  const route = letterType === 'commitment' ? runs.find(run => run.id === routeId) : undefined;
  if (letterType === 'commitment' && !route) notFound();
  const ready = Boolean(route && isDriverRouteContractReady(route) && driver.iban && driver.bankName);
  const contractDate = route?.contractDate ? formatJalaliDate(route.contractDate) : '—';
  const routeDetails = route ? [route.title, route.schoolName, direction(route.direction), route.areaDescription, formatPersianTime(route.scheduledStartTime), formatPersianTime(route.scheduledArrivalTime)].filter(Boolean).join('، ') : '';

  return <main dir="rtl" className="mx-auto min-h-screen max-w-[210mm] bg-white p-5 text-black sm:p-10 print:max-w-none print:p-0">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
      <a href="/driver/personal-documents" className="font-bold text-primary">بازگشت به مدارک</a>
      {letterType === 'commitment' && ready ? <div className="flex gap-2"><DownloadLetterButton targetId="driver-contract" filename={`driver-contract-${routeId}.pdf`} /><PrintLetterButton label="چاپ قرارداد" /></div> : null}
      {letterType === 'addiction' && <PrintLetterButton label="چاپ نامه" />}
    </div>
    {letterType === 'commitment' && !ready && <p role="status" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900 print:hidden">قرارداد این مسیر پس از ثبت مبلغ و تاریخ آن توسط مدیریت و تکمیل اطلاعات بانکی راننده آماده دانلود می‌شود.</p>}
    {letterType === 'commitment' ? <article id="driver-contract" className="bg-white p-4 text-right text-[13px] leading-8 sm:p-8 print:p-0">
      <p className="text-center font-bold">(( فرم اجاره خودرو و تعهد راننده ))           تاریخ: {contractDate}</p>
      <p>اینجانب {driver.firstName} {driver.lastName} فرزند {driver.fatherName} با  کد ملی {driver.nationalId} به آدرس {driver.streetAddress}</p>
      <p>و تلفن ثابت {driver.homePhoneNumber || '—'} و تلفن همراه {driver.phoneNumber} با خودروی {vehicle?.system || '—'} به شماره انتظامی {vehicle?.plateNumber || '—'}</p>
      <p>مسئولیت حمل و نقل دانش آموزان مسیر های ذیل:</p>
      <p>{routeDetails}</p>
      <p>از مبدا مشخص شده )منازل دانش آموزان( به مقصد )مدارس مذکور( و بالعکس را به عهده میگیرم و تعهد می دهم که برابر شرح وظایف ذیل الذکر و قوانین و مقررات سرویس مدارس که کاملا مطلع از آن می باشم، انجام وظیفه نمایم. دریافت توافقی کرایه به مبلغ {route?.contractPriceRials == null ? '—' : route.contractPriceRials.toLocaleString('fa-IR')} ریال ماهانه اجاره خودرو به شماره شبا حساب {driver.iban || '—'} از بانک {driver.bankName || '—'} که به نام اینجانب می باشد اعلام گردیده و بین پنجم تا هشتم هر ماه واریز می گردد.</p>
      <p className="font-bold">شرح وظایف راننده سرویس:</p>
      {DRIVER_CONTRACT_CLAUSES.map((clause, index) => <div key={clause} className="break-inside-avoid"><p>{clause}</p>{index === 21 && <p>{DRIVER_CONTRACT_NOTES[0]}</p>}{index === 22 && <p>{DRIVER_CONTRACT_NOTES[1]}</p>}{index === 24 && <p>{DRIVER_CONTRACT_NOTES[2]}</p>}</div>)}
      <p className="mt-6">اینجانب تمامی بند های شرایط فوق الذکر را تأیید کرده و متعهد به انجام آن می شوم و رضایت خود را نسبت به حمل و نقل دانش آموزان در مسیر های مذکور  از تاریخ {contractDate} ، تحت نظر شرکت و با رعایت تمامی قوانین مربوط به سرویس مدارس اعلام می نمایم.</p>
    </article> : <article className="min-h-[270mm] border-2 border-black p-5 sm:p-10 print:border-0 print:p-0">
      <h1 className="text-center text-2xl font-black">معرفی‌نامه آزمایش عدم اعتیاد</h1>
      <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-5 text-sm sm:grid-cols-2">
        {[['نام و نام خانوادگی', `${driver.firstName} ${driver.lastName}`], ['نام پدر', driver.fatherName], ['کد ملی', driver.nationalId], ['شماره همراه', driver.phoneNumber], ['نشانی', `${driver.province}، ${driver.city}، ${driver.streetAddress}`]].map(([label, value]) => <div key={label}><dt className="text-gray-600">{label}</dt><dd className="mt-2 min-h-8 border-b border-dotted border-black pb-2 font-bold">{value || '—'}</dd></div>)}
      </dl>
      <section className="mt-14 rounded-lg border border-dashed border-gray-500 p-8 text-center leading-9 text-gray-600"><p className="font-black text-black">محل درج متن نهایی نامه</p><p>متن رسمی این سند پس از دریافت از مدیریت، بدون تغییر در اطلاعات خودکار راننده در این قسمت قرار می‌گیرد.</p></section>
      <div className="mt-24 grid grid-cols-2 gap-16 text-center"><div><p>امضا و اثر انگشت راننده</p><div className="mt-20 border-b border-black" /></div><div><p>مهر و امضای شرکت</p><div className="mt-20 border-b border-black" /></div></div>
    </article>}
  </main>;
}
