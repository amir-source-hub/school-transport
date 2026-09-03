'use client';

import { useState } from 'react';
import { BusFront, ChevronDown, Clock3, GraduationCap, Route, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AdminTransportRoute } from './admin-drivers-api';

const number = (value: number) => value.toLocaleString('fa-IR');
const time = (value: string) =>
  value.slice(0, 5).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const normalize = (value: string) => value.replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();

export function RouteCatalog({ routes }: { routes: AdminTransportRoute[] }) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('ALL');
  const visible = routes.filter(
    (route) =>
      (direction === 'ALL' || route.direction === direction) &&
      normalize(
        `${route.title} ${route.school.name} ${route.driver?.firstName ?? ''} ${route.driver?.lastName ?? ''}`,
      ).includes(normalize(query)),
  );
  return (
    <details className="group mt-6 border-t border-border pt-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl py-2 focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Route className="size-5" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-black">مسیرهای تعریف‌شده</span>
          <span className="mt-1 block text-xs font-normal text-muted">
            برنامه حرکت، راننده و ظرفیت هر مسیر
          </span>
        </span>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
          {number(routes.length)} مسیر
        </span>
        <ChevronDown
          className="size-5 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute right-4 top-4 size-4 text-muted"
            aria-hidden="true"
          />
          <Input
            className="pr-11"
            aria-label="جست‌وجو در مسیرهای تعریف‌شده"
            placeholder="نام مسیر، راننده یا مدرسه…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div
          className="flex gap-1 rounded-xl bg-primary-soft/50 p-1"
          role="group"
          aria-label="جهت مسیر"
        >
          {[
            ['ALL', 'همه'],
            ['TO_SCHOOL', 'رفت'],
            ['FROM_SCHOOL', 'برگشت'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
              className={`min-h-11 flex-1 rounded-lg px-5 text-sm font-bold transition-colors ${direction === value ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className="my-3 text-xs text-muted">
        نمایش {number(visible.length)} مسیر از {number(routes.length)}
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {visible.map((route) => {
          const count = route.students.length;
          const capacity = route.driver?.capacity ?? 0;
          const remaining = Math.max(0, capacity - count);
          const percent = capacity > 0 ? Math.min(100, (count / capacity) * 100) : 0;
          const isFull = capacity > 0 && count >= capacity;
          return (
            <li
              key={route.id}
              className="min-w-0 rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-sm font-black leading-7 sm:text-base">{route.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${route.direction === 'TO_SCHOOL' ? 'bg-primary-soft text-primary' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {route.direction === 'TO_SCHOOL' ? 'رفت' : 'برگشت'}
                </span>
              </div>
              <div className="mt-4 space-y-2.5 text-sm text-muted">
                <p className="flex items-center gap-2">
                  <BusFront className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-foreground">
                    {route.driver
                      ? `${route.driver.firstName} ${route.driver.lastName}`
                      : 'راننده تعیین نشده'}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{route.school.name}</span>
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <Clock3 className="size-4" aria-hidden="true" />
                  زمان حرکت
                </span>
                <span className="font-bold tabular-nums">
                  <bdi>{time(route.scheduledStartTime)}</bdi>{' '}
                  <span className="px-1 font-normal text-muted">تا</span>{' '}
                  <bdi>{time(route.scheduledArrivalTime)}</bdi>
                </span>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Users className="size-4" aria-hidden="true" />
                    {number(count)} از {number(capacity)} نفر
                  </span>
                  <span className={isFull ? 'font-bold text-danger' : 'font-bold text-primary'}>
                    {capacity === 0
                      ? 'ظرفیت نامشخص'
                      : isFull
                        ? 'ظرفیت تکمیل'
                        : `${number(remaining)} جای خالی`}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`ظرفیت ${route.title}`}
                  aria-valuemin={0}
                  aria-valuemax={capacity || 1}
                  aria-valuenow={Math.min(count, capacity || 1)}
                  className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full ${isFull ? 'bg-danger' : 'bg-primary'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!visible.length && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {routes.length ? 'مسیری با این جست‌وجو پیدا نشد.' : 'هنوز مسیری تعریف نشده است.'}
        </p>
      )}
    </details>
  );
}
