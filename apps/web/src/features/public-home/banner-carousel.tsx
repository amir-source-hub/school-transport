'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@/components/common/page-container';

const banners = [
  '/images/school_transport_banner_01.png',
  '/images/school_transport_banner_02.png',
  '/images/school_transport_banner_03.png',
  '/images/school_transport_banner_04.png',
  '/images/school_transport_banner_05.png',
  '/images/school_transport_banner_06.png',
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
    <section className="surface-inset border-y border-border/60 py-14">
      <PageContainer>
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[var(--radius-canvas)] border border-border/60 bg-white shadow-[var(--shadow-floating)]">
            <div className="relative aspect-[4/1]">
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
                    className="object-contain"
                    priority={current === 0}
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
      </PageContainer>
    </section>
  );
}
