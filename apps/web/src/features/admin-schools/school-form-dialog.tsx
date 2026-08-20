'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createSchool,
  createSchoolSchema,
  updateSchool,
  provisionSchoolManager,
} from '@/features/admin-schools/admin-schools-api';
import type { AdminSchool, CreateSchoolInput } from '@/features/admin-schools/admin-schools-api';

const LocationPicker = dynamic(
  () => import('@/components/common/location-picker').then((module) => module.LocationPicker),
  { ssr: false },
);

const schoolTypes = [
  { value: 'PUBLIC', label: 'دولتی' },
  { value: 'PRIVATE', label: 'غیرانتفاعی' },
  { value: 'BOARD_OF_TRUSTEES', label: 'هیئت امنایی' },
  { value: 'NEMOONE_DOLATI', label: 'نمونه دولتی' },
  { value: 'GIFTED', label: 'تیزهوشان' },
  { value: 'SHAHED', label: 'شاهد' },
  { value: 'BOARDING', label: 'شبانه‌روزی' },
  { value: 'SPECIAL', label: 'استثنائی' },
  { value: 'INTERNATIONAL', label: 'بین‌المللی' },
];

const genderTypes = [
  { value: 'MIXED', label: 'مختلط' },
  { value: 'FEMALE', label: 'دخترانه' },
  { value: 'MALE', label: 'پسرانه' },
];

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const educationLevels = [
  { level: 'ابتدایی', grades: ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'] },
  { level: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
  { level: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] },
];

type Props =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      school: AdminSchool;
    };

export function SchoolFormDialog(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const initial = isEdit ? props.school : null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSchoolInput>({
    name: initial?.name ?? '',
    schoolType: initial?.schoolType ?? '',
    genderType: initial?.genderType ?? '',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    district: initial?.district ?? '',
    address: initial?.address ?? '',
    phoneNumber: initial?.phoneNumber ?? '',
    managerName: initial?.managerName ?? '',
    managerPhone: initial?.managerPhone ?? '',
    openingTime: initial?.openingTime ?? '',
    closingTime: initial?.closingTime ?? '',
    closingTimes: initial?.closingTimes?.length
      ? initial.closingTimes
      : [initial?.closingTime ?? ''],
    latitude: initial?.latitude ?? 35.7219,
    longitude: initial?.longitude ?? 51.3347,
    educationOptions: initial?.educationOptions ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSelected, setLocationSelected] = useState(
    initial?.latitude != null && initial?.longitude != null,
  );
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  const update = <K extends keyof CreateSchoolInput>(key: K, value: CreateSchoolInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handle = async () => {
    if (!locationSelected) {
      setError('موقعیت مدرسه را روی نقشه انتخاب کنید.');
      return;
    }
    if (
      !isEdit &&
      (!/^[A-Za-z0-9]{8}$/.test(managerUsername) || !/^[A-Za-z0-9]{8}$/.test(managerPassword))
    ) {
      setError(
        'نام کاربری و رمز عبور مدیر باید دقیقاً ۸ نویسه و فقط شامل حروف انگلیسی و اعداد باشند.',
      );
      return;
    }
    const normalized = {
      ...form,
      name: form.name.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      phoneNumber: normalizeDigits(form.phoneNumber ?? '').replace(/\D/g, ''),
      managerName: form.managerName?.trim() ?? '',
      managerPhone: normalizeDigits(form.managerPhone ?? '').replace(/\D/g, ''),
      district: undefined,
    };
    const checked = createSchoolSchema.safeParse(normalized);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'اطلاعات مدرسه را کامل و صحیح وارد کنید');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = checked.data;
      if (isEdit) {
        await updateSchool(props.school.id, payload);
      } else {
        const school = await createSchool(payload);
        const managerParts = payload.managerName.trim().split(/\s+/);
        await provisionSchoolManager({
          username: managerUsername,
          password: managerPassword,
          firstName: managerParts[0] ?? payload.managerName,
          lastName: managerParts.slice(1).join(' ') || 'مدیر',
          phoneNumber: payload.managerPhone,
          schoolId: school.id,
        });
      }
      setOpen(false);
      router.refresh();
      if (!isEdit) window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره مدرسه');
    } finally {
      setLoading(false);
    }
  };

  const toggleGrade = (level: string, grade: string) => {
    const current = form.educationOptions.find((option) => option.level === level);
    const grades = current?.grades.includes(grade)
      ? current.grades.filter((value) => value !== grade)
      : [...(current?.grades ?? []), grade];
    update('educationOptions', [
      ...form.educationOptions.filter((option) => option.level !== level),
      ...(grades.length ? [{ level, grades }] : []),
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            ویرایش
          </Button>
        ) : (
          <Button>افزودن مدرسه</Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={isEdit ? 'ویرایش مدرسه' : 'افزودن مدرسه جدید'}
        description="اطلاعات مدرسه را وارد کنید."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="school-name" className="text-sm font-bold">
                نام مدرسه *
              </label>
              <Input
                id="school-name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="mt-1"
              />
            </div>
            {!isEdit && (
              <>
                <div>
                  <label htmlFor="school-manager-username" className="text-sm font-bold">
                    نام کاربری پنل مدیر *
                  </label>
                  <Input
                    id="school-manager-username"
                    dir="ltr"
                    maxLength={8}
                    pattern="[A-Za-z0-9]{8}"
                    value={managerUsername}
                    onChange={(e) =>
                      setManagerUsername(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8))
                    }
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted">دقیقاً ۸ حرف انگلیسی یا عدد</p>
                </div>
                <div>
                  <label htmlFor="school-manager-password" className="text-sm font-bold">
                    رمز عبور پنل مدیر *
                  </label>
                  <Input
                    id="school-manager-password"
                    type="password"
                    dir="ltr"
                    maxLength={8}
                    pattern="[A-Za-z0-9]{8}"
                    value={managerPassword}
                    onChange={(e) =>
                      setManagerPassword(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8))
                    }
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted">دقیقاً ۸ حرف انگلیسی یا عدد</p>
                </div>
              </>
            )}
            <div>
              <label htmlFor="school-type" className="text-sm font-bold">
                نوع مدرسه *
              </label>
              <div className="mt-1">
                <Select
                  options={schoolTypes}
                  value={form.schoolType}
                  onValueChange={(v) => update('schoolType', v)}
                  placeholder="انتخاب کنید"
                />
              </div>
            </div>
            <div>
              <label htmlFor="gender-type" className="text-sm font-bold">
                نوع جنسیت *
              </label>
              <div className="mt-1">
                <Select
                  options={genderTypes}
                  value={form.genderType}
                  onValueChange={(v) => update('genderType', v)}
                  placeholder="انتخاب کنید"
                />
              </div>
            </div>
            <div>
              <label htmlFor="school-phone" className="text-sm font-bold">
                تلفن مدرسه *
              </label>
              <Input
                id="school-phone"
                dir="ltr"
                value={form.phoneNumber ?? ''}
                inputMode="numeric"
                placeholder="۰۲۱۱۲۳۴۵۶۷۸"
                onChange={(e) =>
                  update(
                    'phoneNumber',
                    normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 11),
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="school-province" className="text-sm font-bold">
                استان *
              </label>
              <Input
                id="school-province"
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="school-city" className="text-sm font-bold">
                شهر *
              </label>
              <Input
                id="school-city"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="school-manager-name" className="text-sm font-bold">
                نام مدیر *
              </label>
              <Input
                id="school-manager-name"
                value={form.managerName ?? ''}
                onChange={(e) => update('managerName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="school-manager-phone" className="text-sm font-bold">
                شماره همراه مدیر *
              </label>
              <Input
                id="school-manager-phone"
                dir="ltr"
                value={form.managerPhone ?? ''}
                inputMode="numeric"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                onChange={(e) =>
                  update(
                    'managerPhone',
                    normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 11),
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="school-opening-time" className="text-sm font-bold">
                ساعت شروع مدرسه *
              </label>
              <Input
                id="school-opening-time"
                type="time"
                required
                dir="ltr"
                value={form.openingTime}
                onChange={(event) => update('openingTime', event.target.value)}
                className="mt-1 text-left"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">ساعت‌های پایان مدرسه *</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => update('closingTimes', [...form.closingTimes, ''])}
                >
                  افزودن ساعت
                </Button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {form.closingTimes.map((time, index) => (
                  <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Input
                      type="time"
                      required
                      dir="ltr"
                      value={time}
                      onChange={(event) => {
                        const times = [...form.closingTimes];
                        times[index] = event.target.value;
                        update('closingTimes', times);
                        update('closingTime', times[0] ?? '');
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={form.closingTimes.length === 1}
                      onClick={() => {
                        const times = form.closingTimes.filter((_, i) => i !== index);
                        update('closingTimes', times);
                        update('closingTime', times[0] ?? '');
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <p className="mb-2 text-sm font-bold">موقعیت مدرسه روی نقشه *</p>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(latitude, longitude) => {
                  setForm((current) => ({ ...current, latitude, longitude }));
                  setLocationSelected(true);
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="school-address" className="text-sm font-bold">
              نشانی *
            </label>
            <Textarea
              id="school-address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <p className="text-sm font-bold">مقطع‌ها و پایه‌های قابل ثبت‌نام *</p>
            <div className="mt-2 space-y-3">
              {educationLevels.map(({ level, grades }) => (
                <div key={level} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-black">{level}</p>
                  <div className="flex flex-wrap gap-2">
                    {grades.map((grade) => {
                      const checked = form.educationOptions.some(
                        (option) => option.level === level && option.grades.includes(grade),
                      );
                      return (
                        <label
                          key={grade}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${checked ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-white'}`}
                        >
                          <input
                            className="sr-only"
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGrade(level, grade)}
                          />
                          {grade}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button loading={loading} onClick={handle}>
              {isEdit ? 'ذخیره تغییرات' : 'افزودن مدرسه'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
