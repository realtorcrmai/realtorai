import { Badge } from "@/components/ui/badge";
import type { RecentEmailEvent } from "@/actions/newsletter-engine";

const STATUS_VARIANT: Record<
  RecentEmailEvent["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processed: "default",
  failed: "destructive",
  ignored: "outline",
};

/**
 * Recent events feed for /newsletters/engine.
 *
 * Shows the last 50 `email_events` rows so the realtor can see what the
 * newsletter service is consuming. Failed events show their error message
 * inline so the most common failure modes are visible without digging into
 * the Render logs.
 */
export function EngineEventsQueue({ events }: { events: RecentEmailEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No events yet. Events appear here when listings update, showings
        confirm, or daily birthday checks fire.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">When</th>
            <th className="px-4 py-3 text-left font-medium">Event</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((e) => (
            <tr key={e.id} className="align-top hover:bg-muted/20">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                {formatRelative(e.created_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">
                {e.event_type}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[e.status]} className="text-[11px]">
                  {e.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {e.error_message ? (
                  <span className="text-red-600">{e.error_message}</span>
                ) : e.processed_at ? (
                  <span>processed {formatRelative(e.processed_at)}</span>
                ) : (
                  <span className="italic">queued</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA");
}
