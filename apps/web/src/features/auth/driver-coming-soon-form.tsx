'use client';

import { useState } from 'react';
import { AlertCircle, BusFront, Eye, EyeOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Input } from '@/components/ui/input';

export function DriverComingSoonForm() {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-5" aria-disabled="true">
      <div className="flex items-center gap-2 text-sm leading-7 text-muted">
        <BusFront className="size-5 shrink-0 text-coral" aria-hidden />
        <p>
          پنل رانندگان در حال آماده‌سازی است و به‌زودی در دسترس قرار می‌گیرد.
        </p>
      </div>
      <Field label="نام کاربری" htmlFor="driver-username" required>
        <Input
          id="driver-username"
          dir="ltr"
          autoComplete="off"
          disabled
          aria-disabled="true"
          placeholder="---"
        />
      </Field>
      <Field label="رمز عبور" htmlFor="driver-password" required>
        <div className="relative">
          <Input
            id="driver-password"
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            disabled
            aria-disabled="true"
            className="pl-11"
            autoComplete="off"
            placeholder="---"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute left-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted"
            aria-label={showPassword ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Button className="w-full rounded-xl" size="lg" type="button" disabled>
        ورود به پنل راننده
      </Button>
      <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs font-medium text-muted">
        <AlertCircle className="size-4 shrink-0 text-coral" aria-hidden />
        <span>
          <Badge tone="warning" className="me-1.5">
            به‌زودی
          </Badge>
          این بخش هنوز فعال نیست؛ هیچ درخواست ورودی ارسال نمی‌شود.
        </span>
      </div>
    </div>
  );
}
