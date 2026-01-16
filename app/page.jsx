import { HeroSection } from "@/components/marketing/hero-section";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { CinematicScroller } from "@/components/marketing/cinematic-scroller";
import { ParallaxMockups } from "@/components/marketing/parallax-mockups";
import { FeatureBand } from "@/components/marketing/feature-band";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FooterMinimal } from "@/components/marketing/footer-minimal";

const storytelling = [
  {
    title: "Collect",
    subtitle: "Contracts and disclosures glide into a single cinematic lane.",
    bullets: ["Drag & drop, email, or API intake", "Glass-pane QA ensures perfection", "Every stakeholder sees only what matters"],
  },
  {
    title: "Coordinate",
    subtitle: "Timelines pulse with subtle light as reminders travel to Slack, Gmail, and calendar.",
    bullets: ["Auto-generated milestones", "Seamless reflows when dates change", "Nudges that feel handcrafted"],
  },
  {
    title: "Deliver",
    subtitle: "Clients watch the story unfold through immersive boards and premium recaps.",
    bullets: ["Interactive PDF summaries", "Polished closing packages", "Shareable, passwordless portals"],
  },
];

export default function Page() {
  return (
    <main className="space-y-32 bg-[#f5f5f5] pb-24 pt-32 w-screen overflow-hidden">
      <div className="px-0">
        <HeroSection />
      </div>
      <div id="features" className="space-y-32 px-0">
        <FeatureShowcase />
        <ParallaxMockups />
      </div>
      <section id="workflow" className="space-y-10 px-0">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Storytelling layers</p>
          <h2 className="mt-4 text-4xl font-medium text-slate-900">Collect · Coordinate · Deliver.</h2>
        </div>
        <div className="flex flex-col gap-10">
          {storytelling.map((band, index) => (
            <FeatureBand key={band.title} {...band} imageOnLeft={index % 2 === 0} />
          ))}
        </div>
      </section>
      <div className="px-4">
        <CinematicScroller />
        <HowItWorks />
        <PricingPreview />
      </div>
      <FooterMinimal />
    </main>
  );
}

