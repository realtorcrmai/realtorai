export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EditorialDashboardClient } from "@/components/editorial/EditorialDashboardClient";

// ─── Inline types ─────────────────────────────────────────────────────────────
// These mirror the fields selected below — no @/types/editorial import needed.
type EditionStatus = "draft" | "generating" | "ready" | "sent" | "failed" | "scheduled";

interface EditionRow {
  id: string;
  realtor_id: string;
  title: string;
  edition_type: string;
  status: EditionStatus;
  send_count: number;
  recipient_count: number;
  edition_number: number;
  subject_a: string | null;
  subject_b: string | null;
  active_variant: "a" | "b";
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
  generation_started_at: string | null;
  generation_error: string | null;
  voice_profile_id: string | null;
  updated_at: string;
  blocks: unknown;
}

// ─── Stat card sub-component ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
      <span className="text-2xl leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function EditorialDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const supabase = createAdminClient();

  const { data: editions } = await supabase
    .from("editorial_editions")
    .select(
      [
        "id",
        "realtor_id",
        "title",
        "edition_type",
        "status",
        "send_count",
        "recipient_count",
        "edition_number",
        "subject_a",
        "subject_b",
        "active_variant",
        "created_at",
        "sent_at",
        "scheduled_at",
        "generation_started_at",
        "generation_error",
        "voice_profile_id",
        "updated_at",
        "blocks",
      ].join(", ")
    )
    .eq("realtor_id", session.user.id)
    .order("created_at", { ascending: false });

  const allEditions: EditionRow[] = (editions ?? []) as unknown as EditionRow[];

  // ─── Stats ──────────────────────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const totalEditions = allEditions.length;

  const sentThisMonth = allEditions.filter(
    (e) => e.status === "sent" && e.sent_at && e.sent_at >= startOfMonth
  ).length;

  const draftsPending = allEditions.filter(
    (e) => e.status === "draft" || e.status === "generating"
  ).length;

  // Avg open rate placeholder — real value would come from newsletter_events
  // aggregation. We use a static illustrative figure until events are wired.
  const avgOpenRate = "—";

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Header ── */}
      <PageHeader
        title="Editorial Newsletters"
        subtitle="Block-based newsletter editions"
        breadcrumbs={[
          { label: "Newsletters", href: "/newsletters" },
          { label: "Editorial" },
        ]}
        actions={
          <Link href="/newsletters/editorial/new">
            <Button variant="brand" size="sm">
              + New Edition
            </Button>
          </Link>
        }
      />

      {/* ── Content ── */}
      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total editions" value={totalEditions} icon="📰" />
          <StatCard label="Sent this month" value={sentThisMonth} icon="📤" />
          <StatCard label="Avg open rate" value={avgOpenRate} icon="📬" />
          <StatCard label="Drafts pending" value={draftsPending} icon="✏️" />
        </div>

        {/* Edition list */}
        {allEditions.length === 0 ? (
          <EmptyState />
        ) : (
          // EditorialDashboardClient expects EditorialEdition[] — our row shape
          // is structurally compatible (same required fields, extra unknowns safe).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <EditorialDashboardClient editions={allEditions as any} realtorId={session.user.id} />
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-card border border-border rounded-lg p-16 flex flex-col items-center justify-center text-center gap-4">
      <span className="text-6xl">📰</span>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Create your first editorial edition
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI writes it, you approve it.
        </p>
      </div>
      <Link href="/newsletters/editorial/new">
        <Button variant="brand">+ New Edition</Button>
      </Link>
    </div>
  );
}
