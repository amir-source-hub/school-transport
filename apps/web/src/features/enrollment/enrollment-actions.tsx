'use client';

import { Check, ChevronLeft, ChevronRight, FileCheck2, LocateFixed, MapPin, ShieldCheck, WalletCards } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  acceptEnrollmentPrice,
  acceptGuidedContract,
  cancelEnrollment,
  createGuidedEnrollment,
  payGuidedPrepayment,
  type GuidedEnrollmentResult,
} from './enrollments-api';

type SchoolOption = { id: string; name: string; city: string };
const stages = ['مشخصات', 'نشانی', 'مدرسه', 'سرویس و قرارداد'];

const initialForm = {
  studentFirst: '', studentLast: '', studentNationalId: '', birthDate: '', gender: '',
  fatherFirst: '', fatherLast: '', fatherNationalId: '', fatherPhone: '',
  motherFirst: '', motherLast: '', motherNationalId: '', motherPhone: '',
  emergencyFirst: '', emergencyLast: '', emergencyRelationship: '', emergencyPhone: '',
  addressTitle: 'منزل', province: 'تهران', city: 'تهران', district: '', streetAddress: '', postalCode: '',
  latitude: 35.7219, longitude: 51.3347,
  schoolId: '', educationLevel: '', grade: '', serviceType: 'ROUND_TRIP', parentNotes: '',
};

export function CreateEnrollmentForm({ schools }: { schools: SchoolOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...initialForm, schoolId: schools[0]?.id ?? '' });
  const [result, setResult] = useState<GuidedEnrollmentResult>();
  const [contractRead, setContractRead] = useState(false);
  const [contractChecked, setContractChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const set = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const selectedSchool = useMemo(() => schools.find((school) => school.id === form.schoolId), [form.schoolId, schools]);

  function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setStep((current) => Math.min(4, current + 1));
  }

  async function prepareContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      setResult(await createGuidedEnrollment({
        student: { firstName: form.studentFirst, lastName: form.studentLast, nationalId: form.studentNationalId, birthDate: form.birthDate || undefined, gender: form.gender || undefined },
        father: { firstName: form.fatherFirst, lastName: form.fatherLast, nationalId: form.fatherNationalId, phoneNumber: form.fatherPhone },
        mother: { firstName: form.motherFirst, lastName: form.motherLast, nationalId: form.motherNationalId, phoneNumber: form.motherPhone },
        emergencyContact: { firstName: form.emergencyFirst, lastName: form.emergencyLast, relationship: form.emergencyRelationship, phoneNumber: form.emergencyPhone },
        address: { title: form.addressTitle, province: form.province, city: form.city, district: form.district || undefined, streetAddress: form.streetAddress, postalCode: form.postalCode, latitude: form.latitude, longitude: form.longitude },
        school: { schoolId: form.schoolId, educationLevel: form.educationLevel, grade: form.grade },
        service: { serviceType: form.serviceType, parentNotes: form.parentNotes || undefined },
      }));
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="text-sm font-bold text-foreground">{label}
      <Input required={key !== 'birthDate'} type={type} value={String(form[key])} dir={['tel', 'number'].includes(type) ? 'ltr' : undefined} onChange={(event) => set(key, event.target.value)} className="mt-2" />
    </label>
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,.45)]">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-6 sm:px-8">
        <div className="grid grid-cols-4 gap-2">
          {stages.map((label, index) => {
            const number = index + 1; const done = number < step || Boolean(result);
            return <div key={label} className="relative text-center">
              {index > 0 && <span className={`absolute left-1/2 right-[-50%] top-5 h-px ${number <= step ? 'bg-primary' : 'bg-slate-200'}`} />}
              <span className={`relative mx-auto flex size-10 items-center justify-center rounded-full border-2 text-sm font-black ${done ? 'border-primary bg-primary text-white' : number === step ? 'border-primary bg-white text-primary' : 'border-slate-200 bg-white text-muted'}`}>{done ? <Check className="size-4" /> : number.toLocaleString('fa-IR')}</span>
              <span className={`mt-2 block text-[11px] font-bold sm:text-sm ${number <= step ? 'text-foreground' : 'text-muted'}`}>{label}</span>
            </div>;
          })}
        </div>
      </div>
      <div className="p-5 sm:p-8">
        {step === 1 && <form onSubmit={next} className="space-y-7">
          <Section title="مشخصات دانش‌آموز"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{field('studentFirst', 'نام دانش‌آموز')}{field('studentLast', 'نام خانوادگی')}{field('studentNationalId', 'کد ملی', 'tel')}{field('birthDate', 'تاریخ تولد', 'date')}<label className="text-sm font-bold">جنسیت<Select value={form.gender} onValueChange={(value) => set('gender', value)} options={[{ value: 'FEMALE', label: 'دختر' }, { value: 'MALE', label: 'پسر' }]} className="mt-2" /></label></div></Section>
          <Section title="اطلاعات پدر"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{field('fatherFirst', 'نام')}{field('fatherLast', 'نام خانوادگی')}{field('fatherNationalId', 'کد ملی', 'tel')}{field('fatherPhone', 'شماره همراه', 'tel')}</div></Section>
          <Section title="اطلاعات مادر"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{field('motherFirst', 'نام')}{field('motherLast', 'نام خانوادگی')}{field('motherNationalId', 'کد ملی', 'tel')}{field('motherPhone', 'شماره همراه', 'tel')}</div></Section>
          <Section title="تماس اضطراری"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{field('emergencyFirst', 'نام')}{field('emergencyLast', 'نام خانوادگی')}{field('emergencyRelationship', 'نسبت')}{field('emergencyPhone', 'شماره همراه', 'tel')}</div></Section>
          <WizardFooter />
        </form>}
        {step === 2 && <form onSubmit={next} className="space-y-6">
          <Section title="نشانی محل سوار شدن"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{field('addressTitle', 'عنوان نشانی')}{field('province', 'استان')}{field('city', 'شهر')}{field('district', 'منطقه')}<div className="sm:col-span-2">{field('streetAddress', 'نشانی کامل')}</div>{field('postalCode', 'کد پستی', 'tel')}</div></Section>
          <div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-black">موقعیت روی نقشه</h3><p className="mt-1 text-xs text-muted">برای تنظیم دقیق‌تر، روی نقشه کلیک کنید.</p></div><Button type="button" size="sm" variant="ghost" onClick={() => navigator.geolocation?.getCurrentPosition(({ coords }) => setForm((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude })))}><LocateFixed className="size-4" />موقعیت من</Button></div>
            <button type="button" aria-label="انتخاب موقعیت روی نقشه" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); set('longitude', 51.15 + ((event.clientX - rect.left) / rect.width) * .45); set('latitude', 35.85 - ((event.clientY - rect.top) / rect.height) * .35); }} className="relative h-64 w-full overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(30deg,transparent_24%,rgba(37,99,235,.08)_25%,rgba(37,99,235,.08)_26%,transparent_27%,transparent_74%,rgba(37,99,235,.08)_75%,rgba(37,99,235,.08)_76%,transparent_77%),linear-gradient(120deg,transparent_24%,rgba(37,99,235,.08)_25%,rgba(37,99,235,.08)_26%,transparent_27%,transparent_74%,rgba(37,99,235,.08)_75%,rgba(37,99,235,.08)_76%,transparent_77%)] bg-[length:70px_120px]">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,.09),transparent_45%)]" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-danger drop-shadow-lg"><MapPin className="size-10 fill-current" /></span><span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-1 text-xs font-bold shadow">‌{form.latitude.toFixed(5)}، {form.longitude.toFixed(5)}</span>
            </button>
          </div>
          <WizardFooter onBack={() => setStep(1)} />
        </form>}
        {step === 3 && <form onSubmit={next} className="space-y-7">
          <Section title="انتخاب مدرسه"><div className="grid gap-5 sm:grid-cols-3"><label className="text-sm font-bold">نام مدرسه<Select value={form.schoolId} onValueChange={(value) => set('schoolId', value)} options={schools.map((school) => ({ value: school.id, label: `${school.name} — ${school.city}` }))} className="mt-2" /></label><label className="text-sm font-bold">مقطع تحصیلی<Select value={form.educationLevel} onValueChange={(value) => set('educationLevel', value)} options={['ابتدایی', 'متوسطه اول', 'متوسطه دوم'].map((value) => ({ value, label: value }))} className="mt-2" /></label>{field('grade', 'پایه تحصیلی')}</div></Section>
          {selectedSchool && <div className="flex items-center gap-4 rounded-2xl bg-primary-soft p-5"><span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary"><ShieldCheck /></span><div><p className="font-black">{selectedSchool.name}</p><p className="mt-1 text-sm text-muted">{selectedSchool.city} · مدرسه فعال و تأییدشده</p></div></div>}
          <WizardFooter onBack={() => setStep(2)} />
        </form>}
        {step === 4 && !result && <form onSubmit={prepareContract} className="space-y-7">
          <Section title="نوع سرویس"><div className="grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => set('serviceType', 'ROUND_TRIP')} className={`rounded-2xl border-2 p-6 text-right transition ${form.serviceType === 'ROUND_TRIP' ? 'border-primary bg-primary-soft' : 'border-slate-200'}`}><p className="font-black">رفت و برگشت</p><p className="mt-2 text-sm text-muted">سرویس رفت صبح و برگشت پس از پایان مدرسه</p></button><button type="button" onClick={() => set('serviceType', 'ONE_WAY')} className={`rounded-2xl border-2 p-6 text-right transition ${form.serviceType === 'ONE_WAY' ? 'border-primary bg-primary-soft' : 'border-slate-200'}`}><p className="font-black">یک‌طرفه</p><p className="mt-2 text-sm text-muted">فقط مسیر رفت یا برگشت بر اساس ظرفیت</p></button></div></Section>
          <div className="rounded-2xl border border-sun/30 bg-sun/10 p-5"><p className="font-black text-foreground">نکته مهم درباره نوع سرویس</p><p className="mt-2 text-sm leading-7 text-muted">تمام تلاش ما ارائه سرویس انتخابی شماست؛ با این حال نوع نهایی سرویس ممکن است به دلیل ظرفیت خودرو، محدوده مسیر، شرایط ترافیکی، تصمیم مدرسه یا الزامات ایمنی تغییر کند. هر تغییر پیش از شروع خدمت اطلاع‌رسانی می‌شود.</p></div>
          <label className="text-sm font-bold">توضیحات برای واحد مسیر<Textarea className="mt-2" value={form.parentNotes} onChange={(event) => set('parentNotes', event.target.value)} /></label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <WizardFooter onBack={() => setStep(3)} submitLabel="مشاهده قرارداد" pending={pending} />
        </form>}
        {step === 4 && result && !accepted && <div className="space-y-5">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary"><FileCheck2 /></span><div><h3 className="font-black">مطالعه و پذیرش قرارداد</h3><p className="text-sm text-muted">برای فعال شدن پذیرش، متن را تا انتها مرور کنید.</p></div></div>
          <div onScroll={(event) => { const el = event.currentTarget; if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setContractRead(true); }} className="h-72 overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-8">{result.contractText}<div className="mt-8 border-t border-slate-200 pt-6 font-bold">پایان قرارداد</div></div>
          <label className={`flex items-start gap-3 rounded-2xl border p-4 ${contractRead ? 'cursor-pointer border-primary/30' : 'cursor-not-allowed border-slate-200 opacity-55'}`}><input type="checkbox" checked={contractChecked} onChange={(event) => setContractChecked(event.target.checked)} disabled={!contractRead} className="mt-1 size-4" /><span className="text-sm leading-6">تمام بندهای قرارداد را مطالعه کرده‌ام و آن را می‌پذیرم.</span></label>
          <Button disabled={!contractRead || !contractChecked} loading={pending} onClick={async () => { setPending(true); setError(undefined); try { await acceptGuidedContract(result.contractId); setAccepted(true); } catch (caught) { setError(getApiErrorFeedback(caught).message); } finally { setPending(false); } }}>پذیرش قرارداد و ادامه</Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>}
        {step === 4 && result && accepted && !paid && <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-sun text-navy"><WalletCards className="size-7" /></span><h3 className="mt-5 text-2xl font-black">پرداخت پیش‌پرداخت ثبت‌نام</h3><p className="mt-3 text-muted">مبلغ ثابت برای تمام دانش‌آموزان</p><p className="mt-4 text-4xl font-black text-primary">۴٬۰۰۰٬۰۰۰ <span className="text-base">تومان</span></p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-right text-sm leading-7 text-muted">مبلغ، تعداد و تاریخ اقساط بعدی پس از برنامه‌ریزی مسیر توسط مدیریت تعیین می‌شود و در پنل شما قابل مشاهده خواهد بود.</div>
          <Button className="mt-6 w-full" size="lg" loading={pending} onClick={async () => { setPending(true); setError(undefined); try { await payGuidedPrepayment(result.scheduleItemId); setPaid(true); router.refresh(); } catch (caught) { setError(getApiErrorFeedback(caught).message); } finally { setPending(false); } }}>پرداخت امن و تکمیل ثبت‌نام</Button>{error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>}
        {paid && <div className="py-8 text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success"><Check className="size-8" /></span><h3 className="mt-5 text-2xl font-black">ثبت‌نام دانش‌آموز تکمیل شد</h3><p className="mt-3 text-muted">رسید پرداخت و وضعیت سرویس در همین حساب قابل پیگیری است.</p><Button className="mt-6" onClick={() => { setStep(1); setResult(undefined); setAccepted(false); setPaid(false); setForm({ ...initialForm, schoolId: schools[0]?.id ?? '' }); }}>ثبت دانش‌آموز دیگر</Button></div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-4 text-lg font-black">{title}</h3>{children}</section>;
}

function WizardFooter({ onBack, submitLabel = 'مرحله بعد', pending }: { onBack?: () => void; submitLabel?: string; pending?: boolean }) {
  return <div className="flex items-center justify-between border-t border-slate-100 pt-6">{onBack ? <Button type="button" variant="ghost" onClick={onBack}><ChevronRight className="size-4" />مرحله قبل</Button> : <span />}<Button type="submit" loading={pending}>{submitLabel}<ChevronLeft className="size-4" /></Button></div>;
}

export function CancelEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  return <Button variant="danger" size="sm" onClick={async () => { await cancelEnrollment(id); router.refresh(); }}>لغو درخواست</Button>;
}

export function AcceptPriceButton({ enrollmentId, priceId, installmentAllowed }: { enrollmentId: string; priceId: string; installmentAllowed: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <Button size="sm" loading={pending} onClick={async () => { setPending(true); try { await acceptEnrollmentPrice(enrollmentId, priceId, installmentAllowed ? 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS' : 'FULL'); router.refresh(); } finally { setPending(false); } }}>پذیرش قیمت</Button>;
}
