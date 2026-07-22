import { PublicHero } from '@/features/public-home/public-hero';
import { JourneyStory } from '@/features/public-home/journey-story';
import { EcosystemBento } from '@/features/public-home/ecosystem-bento';
import { SafetyStory } from '@/features/public-home/safety-story';
import { FaqPreview } from '@/features/public-home/faq-preview';
import { FinalRegistrationCta } from '@/features/public-home/final-registration-cta';

export default function HomePage() {
  return (
    <>
      <PublicHero />
      <JourneyStory />
      <EcosystemBento />
      <SafetyStory />
      <FaqPreview />
      <FinalRegistrationCta />
    </>
  );
}
