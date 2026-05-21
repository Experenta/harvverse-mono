import { LandingHero } from "@/components/landing/hero";
import { LandingSocialProof } from "@/components/landing/social-proof";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingDigitalPartners } from "@/components/landing/digital-partners";
import { LandingWaitlistSection } from "@/components/landing/waitlist-section";
import { LandingOpenFarmsPreview } from "@/components/landing/open-farms-preview";
import { LandingRecognitions } from "@/components/landing/recognitions";
import { LandingUrgencyBanner } from "@/components/landing/urgency-banner";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingSocialProof />
      <LandingHowItWorks />
      <LandingDigitalPartners />
      <LandingWaitlistSection />
      <LandingOpenFarmsPreview />
      <LandingRecognitions />
      <LandingUrgencyBanner />
    </div>
  );
}
