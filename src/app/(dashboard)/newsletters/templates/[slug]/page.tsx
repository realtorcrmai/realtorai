export const dynamic = "force-dynamic";

import { getBrandProfile } from "@/actions/brand-profile";
import { TEMPLATE_REGISTRY } from "@/lib/constants/template-registry";
import { assembleEmail } from "@/lib/email-blocks";
import type { RealtorBranding } from "@/emails/BaseLayout";
import Link from "next/link";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = TEMPLATE_REGISTRY[slug];

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-4xl mb-4">📭</p>
          <h2 className="text-lg font-semibold">Template not found</h2>
          <p className="text-sm text-muted-foreground mt-1">No template with slug &quot;{slug}&quot;</p>
          <Link href="/newsletters/templates" className="text-sm text-primary hover:underline mt-4 inline-block">
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userName = session?.user?.name || "Your Name";

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

  const data = entry.sampleData(branding);
  let html: string;
  try {
    html = assembleEmail(entry.blockType, data as any);
  } catch {
    html = "<p>Failed to render template preview.</p>";
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/newsletters/templates"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Templates
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xl">{entry.icon}</span>
          <div>
            <h1 className="text-sm font-semibold">{entry.displayName}</h1>
            <p className="text-[11px] text-muted-foreground">
              Subject: {entry.sampleSubject}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 italic max-w-xs text-right hidden sm:block">
          AI personalizes each email with the contact&apos;s details, area preferences, and market data.
        </p>
      </div>

      {/* Full-page iframe preview */}
      <div className="flex-1 bg-[#f5f5f7] overflow-hidden">
        <iframe
          srcDoc={html}
          sandbox=""
          className="w-full h-full border-0 mx-auto block"
          style={{ maxWidth: 700 }}
          title={entry.displayName}
        />
      </div>
    </div>
  );
}
