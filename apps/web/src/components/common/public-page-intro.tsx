import type { ReactNode } from 'react';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

type Variant = 'editorial' | 'visual' | 'compact';

export function PublicPageHero({
  variant = 'editorial',
  eyebrow,
  title,
  description,
  media,
  actions,
  className,
}: {
  variant?: Variant;
  eyebrow?: string;
  title: string;
  description?: string;
  media?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border-b border-border',
        variant === 'visual' && 'surface-dark',
        variant === 'compact' && 'py-8',
        className,
      )}
    >
      <PageContainer
        className={cn(
          'py-12 sm:py-16',
          variant === 'compact' && 'py-8 sm:py-10',
        )}
      >
        {eyebrow && (
          <p
            className={cn(
              'text-sm font-bold',
              variant === 'visual' ? 'text-primary-soft' : 'text-primary',
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'mt-2 max-w-3xl font-black leading-relaxed',
            variant === 'visual' ? 'text-4xl text-white sm:text-5xl' : 'text-3xl sm:text-4xl',
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              'mt-4 max-w-2xl text-base sm:text-lg',
              variant === 'visual' ? 'text-white/70' : 'text-muted',
            )}
          >
            {description}
          </p>
        )}
        {actions && <div className="mt-7">{actions}</div>}
        {media && <div className="mt-8">{media}</div>}
      </PageContainer>
    </section>
  );
}

export { PublicPageHero as PublicPageIntro };
