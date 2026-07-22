import { PublicHero } from '@/features/public-home/public-hero';
import { JourneyStory } from '@/features/public-home/journey-story';
import { EcosystemBento } from '@/features/public-home/ecosystem-bento';
import { PageContainer } from '@/components/common/page-container';
import { ButtonLink } from '@/components/ui/button';

export default function HomePage() {
  return (
    <>
      <PublicHero />
      <JourneyStory />
      <EcosystemBento />
      <section className="surface-paper py-16 sm:py-20">
        <PageContainer>
          <div className="rounded-[var(--radius-canvas)] surface-dark px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">برای ثبت درخواست آماده‌اید؟</h2>
              <p className="mt-2 text-white/60">
                فرایند ثبت‌نام را آغاز کنید یا ابتدا راهنمای مراحل را بخوانید.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <ButtonLink
                href="/register"
                size="lg"
                className="bg-white text-ink hover:bg-white/90"
              >
                شروع ثبت‌نام
              </ButtonLink>
              <ButtonLink
                href="/registration-guide"
                size="lg"
                variant="inverse"
              >
                راهنمای ثبت‌نام
              </ButtonLink>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
