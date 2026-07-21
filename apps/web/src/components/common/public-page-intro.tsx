import type { ReactNode } from 'react';
import { PageContainer } from '@/components/common/page-container';

export function PublicPageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-surface">
      <PageContainer className="py-12 sm:py-16">
        <p className="text-sm font-bold text-primary">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-black leading-relaxed sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">{description}</p>
        {children && <div className="mt-7">{children}</div>}
      </PageContainer>
    </section>
  );
}
