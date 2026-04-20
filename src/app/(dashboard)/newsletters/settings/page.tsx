export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsTab } from "@/components/newsletters/SettingsTab";
import { BrandProfileForm } from "@/components/newsletters/BrandProfileForm";
import { getRealtorConfig } from "@/actions/config";
import { getBrandProfile } from "@/actions/brand-profile";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export default async function NewsletterSettingsPage() {
  const tc = await getAuthenticatedTenantClient();
  const [realtorConfig, brandProfile] = await Promise.all([
    getRealtorConfig(),
    getBrandProfile(),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [{ count: unsubscribeCount }, { count: bounceCount }] =
    await Promise.all([
      tc
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("newsletter_unsubscribed", true),
      tc
        .from("newsletter_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "bounced")
        .gte("created_at", thirtyDaysAgo),
    ]);

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Email Marketing Settings"
        subtitle="Voice profile, send preferences, and compliance configuration"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Settings" },
        ]}
        actions={
          <a
            href="/newsletters"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            ← Back to Email Marketing
          </a>
        }
      />

      <div className="p-6 max-w-3xl space-y-10">

        {/* ── Brand Profile ─────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Brand Profile</h2>
            <p className="text-sm text-muted-foreground">
              Your logo, contact details, and branding used in every email you send.
              The physical address is legally required by CASL.
            </p>
          </div>
          <BrandProfileForm profile={brandProfile} />
        </section>

        <hr className="border-border" />

        {/* ── AI & Send Settings ────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">AI &amp; Send Settings</h2>
            <p className="text-sm text-muted-foreground">
              Voice profile, frequency caps, quiet hours, and send mode.
            </p>
          </div>
          <SettingsTab
          config={
            realtorConfig
              ? {
                  sending_enabled: realtorConfig.sending_enabled,
                  skip_weekends: realtorConfig.skip_weekends,
                  quiet_hours: realtorConfig.quiet_hours as {
                    start: string;
                    end: string;
                  },
                  frequency_caps: realtorConfig.frequency_caps as Record<
                    string,
                    unknown
                  >,
                  default_send_hour: realtorConfig.default_send_hour,
                  brand_config: realtorConfig.brand_config as {
                    default_send_mode?: string;
                  },
                  ai_quality_tier:
                    (realtorConfig.ai_quality_tier as string) ?? undefined,
                  brand_name: (realtorConfig.brand_name as string) ?? "",
                  tone: (realtorConfig.tone as string) ?? "",
                  writing_style_rules:
                    (realtorConfig.writing_style_rules as string[]) ?? [],
                  content_rankings:
                    (realtorConfig.content_rankings as Array<{
                      type: string;
                      effectiveness: number;
                    }>) ?? [],
                }
              : null
          }
          unsubscribeCount={unsubscribeCount ?? 0}
          complaintCount={bounceCount ?? 0}
        />
        </section>

      </div>
    </div>
  );
}
