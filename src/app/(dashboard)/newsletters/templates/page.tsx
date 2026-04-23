export const dynamic = "force-dynamic";

import React from "react";
import { render } from "@react-email/components";
import { PageHeader } from "@/components/layout/PageHeader";
import { getBrandProfile } from "@/actions/brand-profile";
import { JOURNEY_SCHEDULES } from "@/lib/constants/journey-schedules";
import { TEMPLATE_REGISTRY, EMAIL_TYPE_TO_COMPONENT } from "@/lib/constants/template-registry";
import {
  TemplateGalleryClient,
  type PhaseGroup,
  type TemplateCard,
} from "@/components/newsletters/TemplateGalleryClient";

// Dynamic imports for all email components
import { NewListingAlert } from "@/emails/NewListingAlert";
import { MarketUpdate } from "@/emails/MarketUpdate";
import { JustSold } from "@/emails/JustSold";
import { OpenHouseInvite } from "@/emails/OpenHouseInvite";
import { NeighbourhoodGuide } from "@/emails/NeighbourhoodGuide";
import { HomeAnniversary } from "@/emails/HomeAnniversary";
import { PremiumListingShowcase } from "@/emails/PremiumListingShowcase";
import { InspectionReminder } from "@/emails/InspectionReminder";
import { ClosingReminder } from "@/emails/ClosingReminder";
import { BuyerGuide } from "@/emails/BuyerGuide";
import { PriceDropAlert } from "@/emails/PriceDropAlert";
import { ReferralThankYou } from "@/emails/ReferralThankYou";
import { ClientTestimonial } from "@/emails/ClientTestimonial";
import { HomeValueUpdate } from "@/emails/HomeValueUpdate";
import { MortgageRenewalAlert } from "@/emails/MortgageRenewalAlert";
import { YearInReview } from "@/emails/YearInReview";
import { CommunityEvent } from "@/emails/CommunityEvent";
import type { RealtorBranding } from "@/emails/BaseLayout";

// Map component names to actual components
const COMPONENTS: Record<string, React.ComponentType<any>> = {
  NewListingAlert,
  MarketUpdate,
  JustSold,
  OpenHouseInvite,
  NeighbourhoodGuide,
  HomeAnniversary,
  PremiumListingShowcase,
  InspectionReminder,
  ClosingReminder,
  BuyerGuide,
  PriceDropAlert,
  ReferralThankYou,
  ClientTestimonial,
  HomeValueUpdate,
  MortgageRenewalAlert,
  YearInReview,
  CommunityEvent,
};

const PHASE_LABELS: Record<string, string> = {
  lead: "New Contact",
  active: "Active",
  under_contract: "Under Contract",
  past_client: "Past Client",
  dormant: "Dormant",
};

const PHASE_ICONS: Record<string, string> = {
  lead: "🟢",
  active: "🔥",
  under_contract: "📝",
  past_client: "⭐",
  dormant: "❄️",
};

const GREETING_OCCASIONS = [
  "birthday", "home_anniversary", "christmas", "new_year", "diwali",
  "lunar_new_year", "canada_day", "thanksgiving", "valentines",
  "mothers_day", "fathers_day",
];

function formatDelay(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours < 24) return `${hours}h after`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Day 1";
  if (days < 7) return `Day ${days}`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "Week 1";
  if (days < 60) return `Week ${weeks}`;
  const months = Math.round(days / 30);
  if (months === 1) return "1 month";
  if (days < 365) return `${months} months`;
  return "1 year";
}

async function renderTemplate(
  emailType: string,
  branding: RealtorBranding
): Promise<string | null> {
  const entry = TEMPLATE_REGISTRY[emailType];
  if (!entry) return null;

  try {
    const props = entry.sampleProps(branding);

    // Block-system templates (welcome, etc.) — rendered via assembleEmail()
    if (entry.renderMode === "block-system") {
      const { assembleEmail } = await import("@/lib/email-blocks");
      return assembleEmail(emailType, props as any);
    }

    // React Email templates — rendered via render(createElement())
    const componentName = EMAIL_TYPE_TO_COMPONENT[emailType];
    if (!componentName || componentName === "__block_system__") return null;

    const Component = COMPONENTS[componentName];
    if (!Component) return null;

    const html = await render(React.createElement(Component, props));
    return html;
  } catch (err) {
    console.error(`[template-gallery] Failed to render ${emailType}:`, err);
    return null;
  }
}

export default async function TemplateGalleryPage() {
  // Fetch realtor branding
  const brandProfile = await getBrandProfile();
  const branding: RealtorBranding = {
    name: brandProfile?.display_name || "Your Name",
    title: brandProfile?.title || "REALTOR\u00ae",
    brokerage: brandProfile?.brokerage_name || "",
    phone: brandProfile?.phone || "",
    email: brandProfile?.email || "",
    headshotUrl: brandProfile?.headshot_url || undefined,
    logoUrl: brandProfile?.logo_url || undefined,
    accentColor: brandProfile?.brand_color || "#4f35d2",
    physicalAddress: brandProfile?.physical_address || "",
  };

  // Collect all unique email types across journey schedules + event templates
  const allEmailTypes = new Set<string>();
  for (const phases of Object.values(JOURNEY_SCHEDULES)) {
    for (const steps of Object.values(phases)) {
      for (const step of steps) {
        allEmailTypes.add(step.emailType);
      }
    }
  }
  for (const key of Object.keys(TEMPLATE_REGISTRY)) {
    if (TEMPLATE_REGISTRY[key].category === "event") {
      allEmailTypes.add(key);
    }
  }

  // Render all templates in parallel
  const renderPromises: Record<string, Promise<string | null>> = {};
  for (const emailType of allEmailTypes) {
    renderPromises[emailType] = renderTemplate(emailType, branding);
  }
  const entries = Object.entries(renderPromises);
  const results = await Promise.all(entries.map(([, p]) => p));
  const rendered: Record<string, string> = {};
  entries.forEach(([key], i) => {
    if (results[i]) rendered[key] = results[i]!;
  });

  // Build journey phase groups
  function buildJourney(journeyType: "buyer" | "seller"): PhaseGroup[] {
    const schedule = JOURNEY_SCHEDULES[journeyType];
    const phases: PhaseGroup[] = [];

    for (const [phase, steps] of Object.entries(schedule)) {
      if (steps.length === 0) continue;
      const emails: TemplateCard[] = [];
      for (const step of steps) {
        const entry = TEMPLATE_REGISTRY[step.emailType];
        const html = rendered[step.emailType];
        if (!entry || !html) continue;
        emails.push({
          slug: entry.slug,
          displayName: entry.displayName,
          description: entry.description,
          icon: entry.icon,
          timing: formatDelay(step.delayHours),
          subject: entry.sampleSubject,
          html,
        });
      }
      if (emails.length === 0) continue;
      phases.push({
        phase,
        phaseLabel: PHASE_LABELS[phase] || phase,
        phaseIcon: PHASE_ICONS[phase] || "📧",
        emails,
      });
    }
    return phases;
  }

  const buyerJourney = buildJourney("buyer");
  const sellerJourney = buildJourney("seller");

  // Build event templates
  const eventTemplates: TemplateCard[] = [];
  for (const [key, entry] of Object.entries(TEMPLATE_REGISTRY)) {
    if (entry.category !== "event") continue;
    const html = rendered[key];
    if (!html) continue;
    eventTemplates.push({
      slug: entry.slug,
      displayName: entry.displayName,
      description: entry.description,
      icon: entry.icon,
      timing: "Event-triggered",
      subject: entry.sampleSubject,
      html,
    });
  }

  return (
    <>
      <PageHeader
        title="Email Templates"
        subtitle="Preview every email your contacts receive"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
        ]}
      />
      <div className="p-6">
        <TemplateGalleryClient
          buyerJourney={buyerJourney}
          sellerJourney={sellerJourney}
          eventTemplates={eventTemplates}
          greetingOccasions={GREETING_OCCASIONS}
        />
      </div>
    </>
  );
}
