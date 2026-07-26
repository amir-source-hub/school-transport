'use client';

import { Building2, MapPin, Phone, Search } from 'lucide-react';
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
};

const districts = ['همه مناطق', 'منطقه ۱', 'منطقه ۲', 'منطقه ۳', 'منطقه ۴', 'منطقه ۵'];

export function SchoolsDirectory({ schools }: { schools: readonly School[]; source: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDistrict, setActiveDistrict] = useState('همه مناطق');

  const filtered = useMemo(() => {
    return schools.filter(school => {
      const matchSearch = !searchQuery || school.name.includes(searchQuery) || school.city.includes(searchQuery);
      const matchDistrict = activeDistrict === 'همه مناطق' || school.district === activeDistrict;
      return matchSearch && matchDistrict;
    });
  }, [schools, searchQuery, activeDistrict]);

  return (
    <>
      <section className="surface-paper border-b border-border/60 py-6">
        <PageContainer>
          <div className="relative mx-auto max-w-xl">
            <Search aria-hidden="true" className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="جست‌وجوی مدرسه یا شهر..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-11 h-12 rounded-[var(--radius-pill)]"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2" role="tablist" aria-label="فیلتر منطقه">
            {districts.map(d => (
              <button
                key={d}
                role="tab"
                aria-selected={activeDistrict === d}
                onClick={() => setActiveDistrict(d)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-bold transition-all',
                  activeDistrict === d ? 'bg-primary text-white' : 'bg-surface-inset text-muted hover:text-foreground',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          {filtered.length === 0 ? (
            <div className="mx-auto max-w-lg text-center py-12">
              <Building2 aria-hidden="true" className="mx-auto size-12 text-muted/30" />
              <p className="mt-4 font-bold text-muted">نتیجه‌ای یافت نشد</p>
              <p className="mt-1 text-sm text-muted">مدرسه‌ای با این شرایط در سامانه ثبت نشده است.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2" aria-label="مدارس فعال">
              {filtered.map((school, i) => (
                <motion.div
                  key={school.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="group rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)] transition-all duration-[var(--duration-ui)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-black group-hover:text-primary transition-colors">{school.name}</h2>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Building2 aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3" />
                      {school.province}، {school.city}{school.district ? `، ${school.district}` : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{school.address}</p>
                  {school.phoneNumber && (
                    <a
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline"
                      href={`tel:${school.phoneNumber}`}
                      dir="ltr"
                    >
                      <Phone aria-hidden="true" className="size-3.5" />
                      {school.phoneNumber}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </PageContainer>
      </section>
    </>
  );
}
