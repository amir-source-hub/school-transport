import { BannerCarousel } from '@/features/public-home/banner-carousel';
import { EcosystemBento } from '@/features/public-home/ecosystem-bento';
import { FaqPreview } from '@/features/public-home/faq-preview';
import { FinalRegistrationCta } from '@/features/public-home/final-registration-cta';
import { JourneyStory } from '@/features/public-home/journey-story';
import { PublicHero } from '@/features/public-home/public-hero';
import { SafetyStory } from '@/features/public-home/safety-story';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/');

export default function HomePage() {
  return (
    <>
      <PublicHero />
      <JourneyStory />
      <EcosystemBento />
      <BannerCarousel />
      <SafetyStory />
      <FaqPreview />
      <FinalRegistrationCta />
    </>
  );
}
