import { notFound } from 'next/navigation';
import { PrintLetterButton } from '@/features/driver/print-letter';
import { getDriverProfile, getDriverRuns } from '@/features/driver/driver-api';
import { summarizeDriverCommitment } from '@/features/driver/driver-commitment';
import { DRIVER_CONTRACT_CLAUSES, DRIVER_CONTRACT_NOTES } from '@/features/driver-enrollment/driver-contract';
import { formatJalaliDate } from '@/lib/formatters';

const titles = { commitment: 'فرم تعهد راننده سرویس مدارس', addiction: 'معرفی‌نامه آزمایش عدم اعتیاد' } as const;
const direction = (value: string) => value === 'TO_SCHOOL' ? 'رفت' : value === 'FROM_SCHOOL' ? 'برگشت' : 'رفت و برگشت';
const detail = (label: string, value: unknown) => <div><dt className="text-gray-600">{label}</dt><dd className="mt-2 min-h-8 border-b border-dotted border-black pb-2 font-bold">{value == null || value === '' ? '—' : String(value)}</dd></div>;

export default async function Page({ params }: { params: Promise<{ letterType: string }> }) {
  const { letterType } = await params;
  if (!(letterType in titles)) notFound();
  const [{ driver, vehicle }, runs] = await Promise.all([getDriverProfile(), getDriverRuns()]);
  const isCommitment = letterType === 'commitment';
  const { totalPriceRials, contractDate, routesComplete } = summarizeDriverCommitment(runs);
  const ready = !isCommitment || Boolean(routesComplete && driver.iban && driver.bankName);
  const title = titles[letterType as keyof typeof titles];
  return <main dir="rtl" className="mx-auto min-h-screen max-w-[210mm] bg-white p-5 text-black sm:p-14 print:max-w-none print:p-0">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden"><a href="/driver/personal-documents" className="font-bold text-primary">بازگشت به مدارک</a>{ready&&<PrintLetterButton label={isCommitment ? 'چاپ یا ذخیره PDF تعهدنامه' : 'چاپ نامه'} />}</div>
    {!ready&&<p role="status" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900 print:hidden">فرم تعهد پس از ثبت مسیرها، مبلغ و تاریخ قرارداد هر مسیر، و اطلاعات بانکی راننده توسط مدیریت آماده چاپ می‌شود.</p>}
    <article className="min-h-[270mm] border-2 border-black p-5 sm:p-10 print:border-0 print:p-0">
      <h1 className="text-center text-2xl font-black">{title}</h1>
      <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-5 text-sm sm:grid-cols-2">
        {detail('نام و نام خانوادگی', `${driver.firstName} ${driver.lastName}`)}
        {detail('نام پدر', driver.fatherName)}
        {detail('کد ملی', driver.nationalId)}
        {detail('شماره همراه', driver.phoneNumber)}
        {detail('همراه دوم', driver.secondaryPhoneNumber)}
        {detail('تلفن منزل', driver.homePhoneNumber)}
        {detail('تلفن اضطراری', driver.emergencyPhoneNumber)}
        {detail('تحصیلات', driver.education)}
        {detail('نشانی', `${driver.province}، ${driver.city}، ${driver.streetAddress}`)}
        {detail('منطقه', driver.municipalityDistrict)}
        {detail('کد پستی', driver.postalCode)}
        {detail('نوع خودرو', vehicle?.vehicleType)}
        {detail('مدل و سال ساخت خودرو', vehicle ? `${vehicle.system}، ${vehicle.modelYear}` : null)}
        {detail('شماره پلاک', vehicle?.plateNumber)}
        {detail('ظرفیت خودرو', vehicle?.capacity)}
        {detail('شماره کارت', driver.cardNumber)}
      </dl>
      {isCommitment ? <>
        <section className="mt-10 text-sm leading-8"><h2 className="font-black">مسئولیت حمل و نقل دانش آموزان مسیر های ذیل:</h2>{runs.length ? <ol className="mt-3 list-decimal pr-6">{runs.map(run=><li key={run.id}>{run.title}، {run.schoolName}، {direction(run.direction)} — {run.contractPriceRials == null ? 'مبلغ ثبت نشده' : `${run.contractPriceRials.toLocaleString('fa-IR')} ریال ماهانه`}</li>)}</ol> : <p>هنوز مسیری به راننده تخصیص داده نشده است.</p>}</section>
        <p className="mt-8 text-sm leading-9">دریافت توافقی کرایه به مبلغ <strong>{ready ? totalPriceRials.toLocaleString('fa-IR') : '—'}</strong> ریال ماهانه اجاره خودرو به شماره شبا حساب <bdi dir="ltr" className="font-bold">{driver.iban ? String(driver.iban) : '—'}</bdi> از بانک <strong>{driver.bankName ? String(driver.bankName) : '—'}</strong> که به نام اینجانب می باشد اعلام گردیده و بین پنجم تا هشتم هر ماه واریز می گردد.</p>
        <p className="mt-3 text-sm">تاریخ قرارداد: <strong>{contractDate ? formatJalaliDate(contractDate) : '—'}</strong></p>
        <section className="mt-10 text-sm leading-8"><h2 className="font-black">شرح وظایف راننده سرویس:</h2><ol className="mt-3 list-decimal space-y-2 pr-6">{DRIVER_CONTRACT_CLAUSES.map((clause,index)=><li key={clause}>{clause}{index===21&&<p>{DRIVER_CONTRACT_NOTES[0]}</p>}{index===22&&<p>{DRIVER_CONTRACT_NOTES[1]}</p>}{index===24&&<p>{DRIVER_CONTRACT_NOTES[2]}</p>}</li>)}</ol></section>
      </> : <section className="mt-14 rounded-lg border border-dashed border-gray-500 p-8 text-center leading-9 text-gray-600"><p className="font-black text-black">محل درج متن نهایی نامه</p><p>متن رسمی این سند پس از دریافت از مدیریت، بدون تغییر در اطلاعات خودکار راننده در این قسمت قرار می‌گیرد.</p></section>}
      <div className="mt-24 grid grid-cols-2 gap-16 text-center"><div><p>امضا و اثر انگشت راننده</p><div className="mt-20 border-b border-black" /></div><div><p>مهر و امضای شرکت</p><div className="mt-20 border-b border-black" /></div></div>
    </article>
  </main>;
}
