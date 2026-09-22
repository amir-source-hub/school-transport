import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { getAdminDriver } from '@/features/admin-drivers/admin-drivers-api';
import { DownloadLetterButton, PrintLetterButton } from '@/features/driver/print-letter';
import {
  DRIVER_CONTRACT_CLAUSES,
  DRIVER_CONTRACT_NOTES,
} from '@/features/driver-enrollment/driver-contract';
import { formatJalaliDate } from '@/lib/formatters';

export const metadata = { title: 'قرارداد مسیر راننده' };
export const dynamic = 'force-dynamic';

const direction = (value: string) =>
  value === 'TO_SCHOOL' ? 'رفت' : value === 'FROM_SCHOOL' ? 'برگشت' : 'رفت و برگشت';
const text = (value: unknown) => String(value || '—');

export default async function Page({
  params,
}: {
  params: Promise<{ driverId: string; routeId: string }>;
}) {
  const { driverId, routeId } = await params;
  const data = await getAdminDriver(driverId);
  const route = data.runs.find((item) => item.id === routeId);
  if (!route || route.school.schoolType === 'SPECIAL') notFound();

  const driver = data.driver;
  const vehicle = data.vehicle;
  const ready = Boolean(
    route.contractPriceRials != null && route.contractDate && driver.iban && driver.bankName,
  );
  const contractDate = route.contractDate ? formatJalaliDate(route.contractDate) : '—';
  const routeDetails = [
    route.title,
    route.school.name,
    direction(route.direction),
    route.areaDescription,
    route.students.map((student) => `${student.firstName} ${student.lastName}`).join('، '),
  ]
    .filter(Boolean)
    .join('، ');

  return (
    <main
      dir="rtl"
      className="mx-auto min-h-screen max-w-[210mm] bg-white p-5 text-black sm:p-10 print:max-w-none print:p-0"
    >
      <div className="mb-8 space-y-4 print:hidden">
        <Breadcrumbs
          items={[
            { label: 'پنل مدیریت', href: '/admin/dashboard' },
            { label: 'رانندگان', href: '/admin/drivers' },
            {
              label: `${text(driver.firstName)} ${text(driver.lastName)}`,
              href: `/admin/drivers/${driverId}`,
            },
            { label: `قرارداد ${route.title}` },
          ]}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {ready && (
            <DownloadLetterButton
              targetId="admin-driver-contract"
              filename={`driver-contract-${routeId}.pdf`}
            />
          )}
          <PrintLetterButton label="چاپ قرارداد" />
        </div>
      </div>
      {!ready && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900 print:hidden"
        >
          دانلود PDF پس از ثبت مبلغ، تاریخ قرارداد و اطلاعات بانکی راننده فعال می‌شود.
        </p>
      )}
      <article
        id="admin-driver-contract"
        className="bg-white p-4 text-right text-[13px] leading-8 sm:p-8 print:p-0"
      >
        <h1 className="text-center font-bold">
          (( فرم اجاره خودرو و تعهد راننده )) تاریخ: {contractDate}
        </h1>
        <p>
          اینجانب {text(driver.firstName)} {text(driver.lastName)} فرزند {text(driver.fatherName)}{' '}
          با کد ملی {text(driver.nationalId)} به آدرس {text(driver.streetAddress)}
        </p>
        <p>
          و تلفن ثابت {text(driver.homePhoneNumber)} و تلفن همراه {text(driver.phoneNumber)} با
          خودروی {text(vehicle?.system)} به شماره انتظامی {text(vehicle?.plateNumber)}
        </p>
        <p>مسئولیت حمل و نقل دانش‌آموزان مسیر ذیل را به عهده می‌گیرم:</p>
        <p>{routeDetails}</p>
        <p>
          از مبدا مشخص‌شده (منازل دانش‌آموزان) به مقصد (مدارس مذکور) و بالعکس را به عهده می‌گیرم و
          تعهد می‌دهم برابر شرح وظایف و قوانین سرویس مدارس انجام وظیفه نمایم. کرایه توافقی ماهانه به
          مبلغ{' '}
          {route.contractPriceRials == null
            ? '—'
            : route.contractPriceRials.toLocaleString('fa-IR')}{' '}
          ریال به شماره شبای {text(driver.iban)} از بانک {text(driver.bankName)} واریز می‌شود.
        </p>
        <p className="font-bold">شرح وظایف راننده سرویس:</p>
        {DRIVER_CONTRACT_CLAUSES.map((clause, index) => (
          <div key={clause} className="break-inside-avoid">
            <p>{clause}</p>
            {index === 21 && <p>{DRIVER_CONTRACT_NOTES[0]}</p>}
            {index === 22 && <p>{DRIVER_CONTRACT_NOTES[1]}</p>}
            {index === 24 && <p>{DRIVER_CONTRACT_NOTES[2]}</p>}
          </div>
        ))}
        <p className="mt-6">
          اینجانب تمامی بندهای فوق را تأیید کرده و رضایت خود را نسبت به حمل و نقل دانش‌آموزان این
          مسیر از تاریخ {contractDate} اعلام می‌نمایم.
        </p>
      </article>
    </main>
  );
}
