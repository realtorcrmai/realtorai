export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { approveNewsletter, skipNewsletter } from "@/actions/newsletters";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

export default async function ApprovalQueuePage() {
  const tc = await getAuthenticatedTenantClient();

  const { data: drafts } = await tc
    .from("newsletters")
    .select("id, contact_id, email_type, journey_phase, subject, html_body, status, send_mode, created_at, contacts(name, email)")
    .eq("status", "draft")
    .eq("send_mode", "review")
    .order("created_at", { ascending: false });

  const queue = drafts ?? [];

  return (
    <>
      <PageHeader
        title="Approval Queue"
        subtitle="Review AI-drafted emails before they are sent to contacts"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Queue" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {queue.length} pending
            </Badge>
            <a
              href="/newsletters/agent"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              🤖 Agent Dashboard
            </a>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {queue.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No drafts pending review</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The agent will queue emails for new contacts (L0 trust level) here. Once a contact reaches L1+, the agent sends emails automatically.
            </p>
          </div>
        ) : (
          queue.map((draft: any) => {
            const contact = Array.isArray(draft.contacts) ? draft.contacts[0] : draft.contacts;
            const contactName = contact?.name ?? "Unknown";
            const contactEmail = contact?.email ?? "";
            const bodyPreview = getBodyPreview(draft.html_body);
            const createdDate = new Date(draft.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div key={draft.id} className="bg-card border border-border rounded-lg p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`/contacts/${draft.contact_id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {contactName}
                      </a>
                      {contactEmail && (
                        <span className="text-xs text-muted-foreground">{contactEmail}</span>
                      )}
                      <EmailTypeBadge type={draft.email_type} />
                      {draft.journey_phase && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-blue-600">
                          {draft.journey_phase}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-foreground mt-1">{draft.subject}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {createdDate}
                  </span>
                </div>

                {/* Body preview */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {bodyPreview}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <form action={async () => {
                    "use server";
                    await approveNewsletter(draft.id);
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      aria-label={`Approve email to ${contactName}`}
                    >
                      ✓ Approve & Send
                    </button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await skipNewsletter(draft.id);
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      aria-label={`Reject email to ${contactName}`}
                    >
                      ✕ Discard
                    </button>
                  </form>
                  <a
                    href={`/api/newsletters/preview/${draft.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    aria-label={`Preview email to ${contactName}`}
                  >
                    👁 Preview
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ── Helper Components ── */

function EmailTypeBadge({ type }: { type: string }) {
  const icons: Record<string, string> = {
    new_listing_alert: "🏠",
    market_update: "📊",
    just_sold: "🎉",
    open_house_invite: "🏡",
    neighbourhood_guide: "🗺️",
    home_anniversary: "🎂",
    welcome: "👋",
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">
      {icons[type] ?? "📧"} {type.replace(/_/g, " ")}
    </span>
  );
}

function getBodyPreview(html: string | null): string {
  if (!html) return "No preview available";
  // Remove <style>...</style> and <script>...</script> blocks first
  const noStyles = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  const stripped = noStyles.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > 200 ? stripped.slice(0, 197) + "..." : stripped;
}
