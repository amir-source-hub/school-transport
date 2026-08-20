'use client';

import { useId, useRef } from 'react';
import { GraduationCap, School, BusFront } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SharedIndicator } from '@/components/motion/shared-indicator';
import { Badge } from '@/components/ui/badge';
import type { UiRoleIdentifier } from './auth-api';

type RoleOption = {
  id: UiRoleIdentifier;
  title: string;
  description: string;
  icon: typeof GraduationCap;
  disabled?: boolean;
};

const options: RoleOption[] = [
  {
    id: 'STUDENT_PORTAL',
    title: 'پنل دانش‌آموز',
    description: 'ورود خانواده‌ها با شماره همراه و کد ملی',
    icon: GraduationCap,
  },
  {
    id: 'SCHOOL_MANAGER',
    title: 'پنل مدیر مدرسه',
    description: 'ورود مدیران مدرسه با نام کاربری و رمز عبور',
    icon: School,
  },
  {
    id: 'DRIVER_COMING_SOON',
    title: 'پنل راننده',
    description: 'در حال آماده‌سازی',
    icon: BusFront,
    disabled: true,
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
    <div
      ref={selectorRef}
      role="radiogroup"
      aria-label="انتخاب نوع ورود"
      aria-labelledby={`${groupId}-legend`}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
    >
      {options.map((option) => {
        const isSelected = option.id === selected;
        const Icon = option.icon;
        return (
          <div
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            aria-labelledby={`${groupId}-${option.id}-title`}
            aria-describedby={`${groupId}-${option.id}-description`}
            tabIndex={option.disabled ? -1 : isSelected ? 0 : -1}
            onClick={() => {
              if (!option.disabled) onSelect(option.id);
            }}
            onFocus={() => {
              if (!option.disabled) onSelect(option.id);
            }}
            className={cn(
              'relative cursor-pointer rounded-2xl border p-4 outline-none transition-colors',
              option.disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                : 'border-slate-200 bg-white',
              !option.disabled && isSelected
                ? 'border-primary/30 text-foreground'
                : 'text-muted hover:border-slate-300 hover:text-foreground',
            )}
          >
            {!option.disabled && isSelected && <SharedIndicator layoutId={`${groupId}-indicator`} />}
            <div className="relative flex items-start gap-3">
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-xl',
                  option.id === 'SCHOOL_MANAGER' && isSelected
                    ? 'bg-navy text-sun'
                    : option.id === 'DRIVER_COMING_SOON'
                      ? 'bg-slate-100 text-slate-400'
                      : isSelected
                        ? 'bg-transit-blue text-white'
                        : 'bg-sky text-primary',
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span
                  id={`${groupId}-${option.id}-title`}
                  className={cn(
                    'flex items-center gap-2 text-sm font-black leading-6',
                    isSelected && !option.disabled ? 'text-foreground' : '',
                  )}
                >
                  {option.title}
                  {option.disabled && (
                    <Badge tone="neutral" className="min-h-5 px-2 py-0 text-[10px] text-foreground">
                      به‌زودی
                    </Badge>
                  )}
                </span>
                <span
                  id={`${groupId}-${option.id}-description`}
                  className="mt-0.5 block text-xs leading-5 text-muted"
                >
                  {option.description}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
