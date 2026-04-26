export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { getBrandProfile } from "@/actions/brand-profile";
import { JOURNEY_SCHEDULES } from "@/lib/constants/journey-schedules";
import { TEMPLATE_REGISTRY } from "@/lib/constants/template-registry";
import { assembleEmail } from "@/lib/email-blocks";
import {
  TemplateGalleryClient,
  type PhaseGroup,
  type TemplateCard,
} from "@/components/newsletters/TemplateGalleryClient";
import type { RealtorBranding } from "@/emails/BaseLayout";

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

function renderTemplate(
  emailType: string,
  branding: RealtorBranding
): string | null {
  const entry = TEMPLATE_REGISTRY[emailType];
  if (!entry) return null;

  try {
    const data = entry.sampleData(branding);
    return assembleEmail(entry.blockType, data as any);
  } catch (err) {
    console.error(`[template-gallery] Failed to render ${emailType}:`, err);
    return null;
  }
}

export default async function TemplateGalleryPage() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userName = session?.user?.name || "Your Name";

  // Feature gate: require newsletters feature (fail-open if user lookup fails)
  try {
    const { getAuthenticatedTenantClient } = await import("@/lib/supabase/tenant");
    const { getUserFeatures } = await import("@/lib/features");
    const { redirect } = await import("next/navigation");
    const tc = await getAuthenticatedTenantClient();
    const userId = session?.user?.id || tc.realtorId;
    if (userId) {
      const { data: gateUser } = await tc.from("users").select("plan, enabled_features").eq("id", userId).single();
      if (gateUser) {
        const gateFeatures = getUserFeatures((gateUser.plan as string) ?? "free", gateUser.enabled_features as string[] | null);
        if (!gateFeatures.includes("newsletters")) redirect("/");
      }
    }
  } catch { /* fail open — let the page render */ }

  // Fetch realtor branding — fall back to user's account name
  const brandProfile = await getBrandProfile();
  const branding: RealtorBranding = {
    name: brandProfile?.display_name || userName,
    title: brandProfile?.title || "REALTOR\u00ae",
    brokerage: brandProfile?.brokerage_name || "",
    phone: brandProfile?.phone || "",
    email: brandProfile?.email || "",
    headshotUrl: brandProfile?.headshot_url || undefined,
    logoUrl: brandProfile?.logo_url || undefined,
    accentColor: brandProfile?.brand_color || "#4f35d2",
    physicalAddress: brandProfile?.physical_address || "",
    socialLinks: {
      instagram: brandProfile?.instagram_url || undefined,
      facebook: brandProfile?.facebook_url || undefined,
      linkedin: brandProfile?.linkedin_url || undefined,
    },
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

  // Render all templates via the block system (synchronous)
  const rendered: Record<string, string> = {};
  for (const emailType of allEmailTypes) {
    const html = renderTemplate(emailType, branding);
    if (html) rendered[emailType] = html;
  }

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
          { label: "AI Agents", href: "/newsletters" },
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
