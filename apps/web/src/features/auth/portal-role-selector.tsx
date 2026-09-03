'use client';

import { useId, useRef } from 'react';
import { BusFront, Check, GraduationCap, School } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SharedIndicator } from '@/components/motion/shared-indicator';
import type { UiRoleIdentifier } from './auth-api';

type RoleOption = {
  id: UiRoleIdentifier;
  title: string;
  audience: string;
  credentials: string;
  icon: typeof GraduationCap;
  accent: string;
  iconStyle: string;
  disabled?: boolean;
};

const options: RoleOption[] = [
  {
    id: 'STUDENT_PORTAL',
    title: 'پنل دانش‌آموز',
    audience: 'ویژه خانواده‌ها',
    credentials: 'شماره همراه و کد ملی سرپرست',
    icon: GraduationCap,
    accent: 'from-blue-500/14 to-sky-400/5',
    iconStyle: 'bg-blue-600 text-white shadow-blue-600/20',
  },
  {
    id: 'SCHOOL_MANAGER',
    title: 'پنل مدیر مدرسه',
    audience: 'ویژه مدیران مدارس',
    credentials: 'نام کاربری و رمز عبور',
    icon: School,
    accent: 'from-amber-400/16 to-orange-300/5',
    iconStyle: 'bg-navy text-sun shadow-navy/20',
  },
  {
    id: 'DRIVER_PORTAL',
    title: 'پنل راننده',
    audience: 'ویژه رانندگان',
    credentials: 'شماره همراه و کد ملی راننده',
    icon: BusFront,
    accent: 'from-emerald-500/14 to-teal-300/5',
    iconStyle: 'bg-emerald-600 text-white shadow-emerald-600/20',
  },
];

export function PortalRoleSelector({
  selected,
  onSelect,
}: {
  selected: UiRoleIdentifier;
  onSelect: (role: UiRoleIdentifier) => void;
}) {
  const groupId = useId();
  const selectorRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const selectable = options.filter((option) => !option.disabled);
    const currentIndex = selectable.findIndex((option) => option.id === selected);
    const direction = event.key === 'ArrowLeft' ? 1 : -1;
    const next = selectable[(currentIndex + direction + selectable.length) % selectable.length];
    onSelect(next.id);
  };

  return (
    <section className="rounded-[1.65rem] border border-slate-200/80 bg-slate-50/75 p-2.5 shadow-inner shadow-slate-200/30 sm:p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
        <div>
          <h2 id={`${groupId}-legend`} className="text-sm font-black text-foreground">
            از کدام پنل وارد می‌شوید؟
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">نوع حساب خود را انتخاب کنید.</p>
        </div>
        <span className="hidden rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-muted shadow-sm ring-1 ring-slate-200 sm:inline-flex">
          ۳ مسیر ورود امن
        </span>
      </div>
      <div
        ref={selectorRef}
        role="radiogroup"
        aria-labelledby={`${groupId}-legend`}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {options.map((option) => {
          const isSelected = option.id === selected;
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              aria-labelledby={`${groupId}-${option.id}-title`}
              aria-describedby={`${groupId}-${option.id}-description`}
              tabIndex={option.disabled ? -1 : isSelected ? 0 : -1}
              onClick={() => {
                if (!option.disabled) onSelect(option.id);
              }}
              className={cn(
                'group relative min-h-[9.75rem] cursor-pointer overflow-hidden rounded-2xl border p-3.5 text-right outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                option.disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
                !option.disabled && isSelected
                  ? 'border-primary/45 text-foreground shadow-[0_12px_30px_-18px_rgba(37,87,230,.7)] ring-1 ring-primary/10'
                  : 'text-muted hover:border-slate-300 hover:text-foreground',
              )}
            >
              {!option.disabled && isSelected && (
                <SharedIndicator
                  layoutId={`${groupId}-indicator`}
                  className={cn('rounded-2xl bg-gradient-to-br', option.accent)}
                />
              )}
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-[0.9rem] shadow-lg transition-transform duration-200 group-hover:scale-105',
                      isSelected
                        ? option.iconStyle
                        : 'bg-slate-100 text-slate-500 shadow-transparent',
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-slate-200 bg-white text-transparent',
                  )}
                  aria-hidden
                >
                  <Check className="size-3.5 stroke-[3]" />
                </span>
                </div>
                <span className="mt-3 min-w-0">
                <span
                  id={`${groupId}-${option.id}-title`}
                  className="block text-sm font-black leading-6 text-foreground"
                >
                  {option.title}
                </span>
                <span
                  id={`${groupId}-${option.id}-description`}
                  className="mt-0.5 block text-[11px] font-bold leading-5 text-muted"
                >
                  {option.audience}
                </span>
                <span className="mt-2 block border-t border-slate-200/80 pt-2 text-[10px] leading-4 text-slate-500">
                  {option.credentials}
                </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
