'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { completeFamilyRegistration } from './family-api';

export function FamilyOnboardingForm() {
  const router = useRouter();
  const [primaryParent, setPrimaryParent] = useState('MOTHER');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const field = (name: string, label: string, type = 'text') => (
    <label className="text-sm font-bold">
      {label}
      <Input required name={name} type={type} dir={type === 'tel' ? 'ltr' : undefined} />
    </label>
  );
  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await completeFamilyRegistration({
            mother: {
              firstName: values.motherFirst,
              lastName: values.motherLast,
              nationalId: values.motherNationalId,
              phoneNumber: values.motherPhone,
            },
            father: {
              firstName: values.fatherFirst,
              lastName: values.fatherLast,
              nationalId: values.fatherNationalId,
              phoneNumber: values.fatherPhone,
            },
            primaryParent,
            address: {
              title: values.addressTitle,
              province: values.province,
              city: values.city,
              district: values.district,
              streetAddress: values.streetAddress,
              postalCode: values.postalCode,
            },
            emergencyContact: {
              firstName: values.emergencyFirst,
              lastName: values.emergencyLast,
              relationship: values.relationship,
              phoneNumber: values.emergencyPhone,
            },
          });
          router.refresh();
        } catch (caught) {
          setError(getApiErrorFeedback(caught).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <section>
        <h2 className="text-lg font-black">اطلاعات والدین</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field('motherFirst', 'نام مادر')}
          {field('motherLast', 'نام خانوادگی مادر')}
          {field('motherNationalId', 'کد ملی مادر')}
          {field('motherPhone', 'شماره همراه مادر', 'tel')}
          {field('fatherFirst', 'نام پدر')}
          {field('fatherLast', 'نام خانوادگی پدر')}
          {field('fatherNationalId', 'کد ملی پدر')}
          {field('fatherPhone', 'شماره همراه پدر', 'tel')}
          <label className="text-sm font-bold">
            ولی اصلی
            <Select
              value={primaryParent}
              onValueChange={setPrimaryParent}
              options={[
                { value: 'MOTHER', label: 'مادر' },
                { value: 'FATHER', label: 'پدر' },
              ]}
            />
          </label>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-black">نشانی سرویس</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field('addressTitle', 'عنوان نشانی')}
          {field('province', 'استان')}
          {field('city', 'شهر')}
          {field('district', 'منطقه')}
          <div className="sm:col-span-2">{field('streetAddress', 'نشانی کامل')}</div>
          {field('postalCode', 'کد پستی')}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-black">تماس اضطراری</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field('emergencyFirst', 'نام')}
          {field('emergencyLast', 'نام خانوادگی')}
          {field('relationship', 'نسبت')}
          {field('emergencyPhone', 'شماره همراه', 'tel')}
        </div>
      </section>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending}>
        تکمیل حساب خانواده
      </Button>
    </form>
  );
}
