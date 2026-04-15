"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditionStatus = "draft" | "generating" | "ready" | "sent" | "failed";
type EditionType =
  | "market_update"
  | "just_sold"
  | "open_house"
  | "neighbourhood_spotlight"
  | "rate_watch"
  | "seasonal";

interface Edition {
  id: string;
  realtor_id: string;
  title: string;
  edition_type: EditionType;
  status: EditionStatus;
  send_count: number;
  created_at: string;
  sent_at: string | null;
  generation_error: string | null;
}

interface EditionListClientProps {
  editions: Edition[];
}

// ─── Status badge config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  EditionStatus,
  {
    label: string;
    variant: "outline" | "warning" | "success" | "info" | "destructive";
    pulse?: boolean;
  }
> = {
  draft: { label: "Draft", variant: "outline" },
  generating: { label: "Generating…", variant: "warning", pulse: true },
  ready: { label: "Ready", variant: "success" },
  sent: { label: "Sent", variant: "info" },
  failed: { label: "Failed", variant: "destructive" },
};

// ─── Edition type label + emoji ─────────────────────────────────────────────
const TYPE_META: Record<EditionType, { label: string; emoji: string }> = {
  market_update: { label: "Market Update", emoji: "📊" },
  just_sold: { label: "Just Sold", emoji: "🏷️" },
  open_house: { label: "Open House", emoji: "🏠" },
  neighbourhood_spotlight: { label: "Neighbourhood Spotlight", emoji: "📍" },
  rate_watch: { label: "Rate Watch", emoji: "📉" },
  seasonal: { label: "Seasonal", emoji: "🌸" },
};

// ─── Single edition card ─────────────────────────────────────────────────────
function EditionCard({ edition }: { edition: Edition }) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[edition.status] ?? STATUS_CONFIG.draft;
  const typeMeta = TYPE_META[edition.edition_type] ?? {
    label: edition.edition_type,
    emoji: "📄",
  };

  const createdDate = new Date(edition.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleCardClick(e: React.MouseEvent) {
    // Prevent navigation if a button inside was clicked
    if ((e.target as HTMLElement).closest("button,form,a")) return;
    router.push(`/newsletters/editorial/${edition.id}/edit`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Edit edition: ${edition.title}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/newsletters/editorial/${edition.id}/edit`);
        }
      }}
      className={cn(
        "bg-card border border-border rounded-lg px-5 py-4",
        "flex items-center gap-4 cursor-pointer",
        "hover:border-brand/40 hover:shadow-sm transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      )}
    >
      {/* Emoji icon */}
      <span className="text-2xl shrink-0">{typeMeta.emoji}</span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {edition.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {typeMeta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{createdDate}</span>
          {edition.send_count > 0 && (
            <span className="text-xs text-muted-foreground">
              · Sent {edition.send_count}×
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge
        variant={statusCfg.variant}
        className={cn(statusCfg.pulse && "animate-pulse")}
      >
        {statusCfg.label}
      </Badge>

      {/* Quick actions */}
      <div className="flex items-center gap-2 shrink-0">
        {edition.status === "ready" && (
          <form action={`/api/editorial/${edition.id}/send`} method="POST">
            <Button
              type="submit"
              variant="brand"
              size="xs"
              aria-label="Send this edition"
              onClick={(e) => e.stopPropagation()}
            >
              Send
            </Button>
          </form>
        )}
        {edition.status === "failed" && (
          <form
            action={`/api/editorial/${edition.id}/regenerate`}
            method="POST"
          >
            <Button
              type="submit"
              variant="outline"
              size="xs"
              aria-label="Regenerate this edition"
              onClick={(e) => e.stopPropagation()}
            >
              🔄 Retry
            </Button>
          </form>
        )}
        <Button
          variant="ghost"
          size="xs"
          aria-label="Edit edition"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/newsletters/editorial/${edition.id}/edit`);
          }}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

// ─── List ────────────────────────────────────────────────────────────────────
export function EditionListClient({ editions }: EditionListClientProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {editions.length} edition{editions.length !== 1 ? "s" : ""}
      </p>
      {editions.map((edition) => (
        <EditionCard key={edition.id} edition={edition} />
      ))}
    </div>
  );
}
