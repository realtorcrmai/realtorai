export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditionEditorClient } from "@/components/editorial/EditionEditorClient";
// Note: Button is retained for the error-banner retry form below
import { GenerationProgressWrapper } from "@/components/editorial/GenerationProgressWrapper";
import type { EditorialEdition, EditorialVoiceProfile, EditionStatus, EditionType } from "@/types/editorial";

// ─── Edition type label ─────────────────────────────────────────────────────── (kept below)

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EditionStatus }) {
  const map: Record<
    EditionStatus,
    {
      label: string;
      variant: "outline" | "warning" | "success" | "info" | "destructive";
    }
  > = {
    draft: { label: "Draft", variant: "outline" },
    generating: { label: "Generating…", variant: "warning" },
    ready: { label: "Ready to send", variant: "success" },
    sent: { label: "Sent", variant: "info" },
    failed: { label: "Failed", variant: "destructive" },
    scheduled: { label: "Scheduled", variant: "info" },
  };

  const { label, variant } = map[status] ?? map.draft;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Edition type label ───────────────────────────────────────────────────────
const EDITION_TYPE_LABELS: Record<EditionType, string> = {
  market_update: "Market Update",
  just_sold: "Just Sold",
  open_house: "Open House",
  neighbourhood_spotlight: "Neighbourhood Spotlight",
  rate_watch: "Rate Watch",
  seasonal: "Seasonal",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function EditionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const supabase = createAdminClient();

  // Fetch edition — select all fields needed for EditorialEdition
  const { data: edition } = await supabase
    .from("editorial_editions")
    .select("*")
    .eq("id", id)
    .single();

  if (!edition) return notFound();

  // Tenant guard — redirect if this edition belongs to a different realtor
  if (edition.realtor_id !== session.user.id) {
    redirect("/newsletters/editorial");
  }

  // Fetch voice profile (may not exist yet)
  const { data: voiceProfile } = await supabase
    .from("realtor_voice_profiles")
    .select("*")
    .eq("realtor_id", session.user.id)
    .maybeSingle();

  const typedEdition = edition as unknown as EditorialEdition;
  const typedVoice = voiceProfile as unknown as EditorialVoiceProfile | null;

  const typeLabel =
    EDITION_TYPE_LABELS[typedEdition.edition_type] ?? typedEdition.edition_type;

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Header ── */}
      <PageHeader
        title={typedEdition.title}
        subtitle={`${typeLabel}`}
        breadcrumbs={[
          { label: "Newsletters", href: "/newsletters" },
          { label: "Editorial", href: "/newsletters/editorial" },
          { label: typedEdition.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={typedEdition.status} />
          </div>
        }
      />

      {/* ── Generation overlay: replaces content while AI is writing ── */}
      {typedEdition.status === "generating" && (
        <GenerationProgressWrapper editionId={id} />
      )}

      {/* ── Error banner ── */}
      {typedEdition.status === "failed" && typedEdition.generation_error && (
        <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-destructive text-lg leading-none mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              Generation failed
            </p>
            <p className="text-xs text-destructive/80 mt-0.5 break-words">
              {typedEdition.generation_error}
            </p>
          </div>
          <form action={`/api/editorial/${id}/regenerate`} method="POST">
            <Button type="submit" variant="outline" size="sm">
              🔄 Retry
            </Button>
          </form>
        </div>
      )}

      {/* ── Two-column editor layout (hidden while generating) ── */}
      {typedEdition.status !== "generating" && (
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 h-full">
            {/* Left: main block editor */}
            <EditionEditorClient
              edition={typedEdition}
              voiceProfile={typedVoice}
            />
          </div>
        </div>
      )}
    </div>
  );
}
