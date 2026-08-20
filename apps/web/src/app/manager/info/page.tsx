import type { LucideIcon } from 'lucide-react';
import {
  BookOpenCheck,
  Building2,
  Clock3,
  GraduationCap,
  KeyRound,
  MapPinned,
  MapPinHouse,
  Phone,
  School,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import { LocationDisplay } from '@/components/common/location-display';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getManagerInfo } from '@/features/manager/manager-api';

export const metadata = { title: 'اطلاعات مدرسه' };

const schoolTypeLabels: Record<string, string> = {
  PUBLIC: 'دولتی',
  PRIVATE: 'غیرانتفاعی',
  BOARD_OF_TRUSTEES: 'هیئت امنایی',
  NEMOONE_DOLATI: 'نمونه دولتی',
  GIFTED: 'تیزهوشان',
  SHAHED: 'شاهد',
  BOARDING: 'شبانه‌روزی',
  SPECIAL: 'استثنائی',
  INTERNATIONAL: 'بین‌المللی',
};
const genderLabels: Record<string, string> = {
  MALE: 'پسرانه',
  FEMALE: 'دخترانه',
  MIXED: 'مختلط',
};
const toPersianDigits = (value: string | null | undefined) =>
  value ? value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit) : '—';

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/70 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <dt className="text-xs font-bold text-muted">{label}</dt>
          <dd className="mt-1 break-words text-sm font-black leading-7 text-foreground">{value}</dd>
        </div>
      </div>
    </div>
  );
}

export default async function Page() {
  const settings = await getManagerInfo();
  const school =
    settings.schools.find((item) => item.id === settings.primarySchoolId) ?? settings.schools[0];
  if (!school) {
    return (
      <Card className="text-center">
        <School className="mx-auto size-12 text-muted" />
        <h1 className="mt-4 text-xl font-black">اطلاعات مدرسه در دسترس نیست</h1>
      </Card>
    );
  }
  const closingTimes = (
    school.closingTimes?.length ? school.closingTimes : [school.closingTime]
  ).filter(Boolean);
  const hours = `${toPersianDigits(school.openingTime)} تا ${closingTimes.map(toPersianDigits).join('، ') || '—'}`;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'اطلاعات مدرسه' },
        ]}
      />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-navy via-[#17345f] to-primary p-6 text-white shadow-xl shadow-navy/15 sm:p-8">
        <div className="absolute -left-14 -top-20 size-56 rounded-full bg-sun/20 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="grid size-20 shrink-0 place-items-center rounded-3xl border border-white/20 bg-white/15 shadow-inner backdrop-blur">
            <School className="size-10 text-sun" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black sm:text-3xl">{school.name}</h1>
              <Badge tone={school.isActive ? 'success' : 'neutral'}>
                {school.isActive ? 'فعال' : 'غیرفعال'}
              </Badge>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              نمای کامل و فقط‌خواندنی اطلاعات ثبت‌شده مدرسه در سامانه
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur">
            <p className="text-xs text-white/60">نام کاربری مدیر</p>
            <p className="mt-1 font-mono text-lg font-black" dir="ltr">
              {settings.manager.username}
            </p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden" padding="lg">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-sun/20 text-navy">
            <Building2 className="size-6" />
          </span>
          <div>
            <h2 className="font-black">مشخصات مدرسه</h2>
            <p className="mt-1 text-xs text-muted">اطلاعات هویتی و راه‌های ارتباطی</p>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem icon={School} label="نام مدرسه" value={school.name} />
          <InfoItem
            icon={BookOpenCheck}
            label="نوع مدرسه"
            value={schoolTypeLabels[school.schoolType ?? ''] ?? '—'}
          />
          <InfoItem
            icon={UsersRound}
            label="نوع جنسیت"
            value={genderLabels[school.genderType ?? ''] ?? '—'}
          />
          <InfoItem icon={Phone} label="تلفن مدرسه" value={toPersianDigits(school.phoneNumber)} />
          <InfoItem icon={MapPinned} label="استان" value={school.province ?? '—'} />
          <InfoItem
            icon={MapPinHouse}
            label="شهر و منطقه"
            value={`${school.city ?? '—'}، منطقه ${toPersianDigits(school.district)}`}
          />
          <InfoItem icon={Clock3} label="ساعات فعالیت" value={hours} />
          <InfoItem icon={KeyRound} label="نام کاربری مدیر" value={settings.manager.username} />
          <InfoItem
            icon={ShieldCheck}
            label="وضعیت مدرسه"
            value={school.isActive ? 'فعال و تأییدشده' : 'غیرفعال'}
          />
        </dl>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]">
        <Card padding="lg">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <MapPinned className="size-6" />
            </span>
            <div>
              <h2 className="font-black">نشانی و موقعیت مدرسه</h2>
              <p className="mt-1 text-xs text-muted">موقعیت ثبت‌شده روی نقشه</p>
            </div>
          </div>
          <div className="mb-4 rounded-2xl bg-surface-soft p-4 text-sm font-bold leading-7">
            {school.address ?? 'نشانی ثبت نشده است.'}
          </div>
          {school.latitude != null && school.longitude != null ? (
            <LocationDisplay latitude={school.latitude} longitude={school.longitude} />
          ) : (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-surface-soft text-sm text-muted">
              موقعیت مدرسه ثبت نشده است.
            </div>
          )}
        </Card>
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-success-soft text-success">
              <GraduationCap className="size-6" />
            </span>
            <div>
              <h2 className="font-black">مقطع‌ها و پایه‌های تحصیلی</h2>
              <p className="mt-1 text-xs text-muted">پایه‌های فعال این مدرسه</p>
            </div>
          </div>
          <div className="space-y-3">
            {school.educationLevels.map((item) => (
              <div key={item.level} className="rounded-2xl border border-border/70 bg-white p-4">
                <p className="font-black text-navy">{item.level}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.grades.map((grade) => (
                    <Badge key={grade}>{grade}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
