'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

const banners = [
  '/images/homepage-banner-round-trip-school-service.webp',
  '/images/homepage-banner-secure-online-payment.webp',
  '/images/homepage-banner-vehicle-selection-fleet.webp',
  '/images/homepage-banner-fast-online-enrollment.webp',
  '/images/homepage-banner-support-specialists.webp',
  '/images/homepage-banner-child-safety.webp',
];

export function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const prefersReduced = useReducedMotion();

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % banners.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + banners.length) % banners.length);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, prefersReduced]);

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[112rem] px-2 sm:px-4 lg:px-6">
        <div className="w-full">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,.45)]">
            <div className="relative aspect-[3/1] min-h-[230px] sm:min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  className="absolute inset-0"
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={banners[current]}
                    alt=""
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="100vw"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={prev}
              aria-label="قبلی"
              className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-navy shadow-md backdrop-blur-sm transition-colors hover:bg-white"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="بعدی"
              className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-navy shadow-md backdrop-blur-sm transition-colors hover:bg-white"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`اسلاید ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-[var(--duration-ui)] ${i === current ? 'w-8 bg-sun' : 'w-2 bg-white/50 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
