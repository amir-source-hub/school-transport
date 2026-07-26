'use client';

import { ArrowLeft, Building2, MapPin, Phone, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

type School = {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string | null;
  address: string;
  phoneNumber: string | null;
  schoolType?: string;
  genderType?: string;
};

export function SchoolsDirectory({ schools }: { schools: readonly School[]; source: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDistrict, setActiveDistrict] = useState('همه مناطق');
  const districts = useMemo(() => ['همه مناطق', ...Array.from(new Set(schools.map((school) => school.district).filter(Boolean) as string[]))], [schools]);

  const filtered = useMemo(() => {
    return schools.filter(school => {
      const matchSearch = !searchQuery || school.name.includes(searchQuery) || school.city.includes(searchQuery);
      const matchDistrict = activeDistrict === 'همه مناطق' || school.district === activeDistrict;
      return matchSearch && matchDistrict;
    });
  }, [schools, searchQuery, activeDistrict]);

  return (
    <>
      <section id="school-directory" className="relative z-20 -mt-12 bg-transparent">
        <PageContainer>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_70px_-35px_rgba(15,23,42,.45)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
            <Input
              placeholder="نام مدرسه، شهر یا نشانی را جست‌وجو کنید..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-14 rounded-2xl border-slate-200 bg-slate-50 pr-12 text-base shadow-none"
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><SlidersHorizontal className="size-4" />فیلتر منطقه</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="فیلتر منطقه">
            {districts.map(d => (
              <button
                key={d}
                role="tab"
                aria-selected={activeDistrict === d}
                onClick={() => setActiveDistrict(d)}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs font-bold transition-all',
                  activeDistrict === d ? 'border-primary bg-primary text-white shadow-md shadow-primary/15' : 'border-slate-200 bg-white text-muted hover:border-primary/30 hover:text-primary',
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-muted"><strong className="text-foreground">{filtered.length.toLocaleString('fa-IR')}</strong> مدرسه مطابق جست‌وجوی شما</div>
          </div>
        </PageContainer>
      </section>

      <section className="bg-slate-50 pb-24 pt-12">
        <PageContainer>
          {filtered.length === 0 ? (
            <div className="mx-auto max-w-lg text-center py-12">
              <Building2 aria-hidden="true" className="mx-auto size-12 text-muted/30" />
              <p className="mt-4 font-bold text-muted">نتیجه‌ای یافت نشد</p>
              <p className="mt-1 text-sm text-muted">مدرسه‌ای با این شرایط در سامانه ثبت نشده است.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="مدارس فعال">
              {filtered.map((school, i) => (
                <motion.div
                  key={school.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-2xl hover:shadow-slate-200/70"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary via-transit-blue to-sun opacity-0 transition group-hover:opacity-100" />
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-black group-hover:text-primary transition-colors">{school.name}</h2>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Building2 aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3" />
                      {school.province}، {school.city}{school.district ? `، ${school.district}` : ''}
                    </span>
                  </div>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-muted">{school.address}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  {school.phoneNumber ? (
                    <a
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline"
                      href={`tel:${school.phoneNumber}`}
                      dir="ltr"
                    >
                      <Phone aria-hidden="true" className="size-3.5" />
                      {school.phoneNumber}
                    </a>
                  ) : <span className="text-xs text-muted">شماره ثبت نشده</span>}
                  <a href="/login" className="inline-flex items-center gap-1 text-xs font-black text-foreground transition group-hover:text-primary">انتخاب مدرسه <ArrowLeft className="size-3.5" /></a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </PageContainer>
      </section>
    </>
  );
}
