import { Badge } from "@/components/ui/badge";
import type { NewsletterRule } from "@/actions/newsletter-engine";

/**
 * Read-only rules table for /newsletters/engine.
 *
 * M2-B ships read-only. M3-B will add inline edit (toggle enabled,
 * change send_mode, adjust caps).
 */
export function EngineRulesTable({ rules }: { rules: NewsletterRule[] }) {
  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No rules configured yet. Default rules are seeded by migration 075 for
        the demo realtor.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Event</th>
            <th className="px-4 py-3 text-left font-medium">Email Type</th>
            <th className="px-4 py-3 text-left font-medium">Mode</th>
            <th className="px-4 py-3 text-right font-medium">Cap / week</th>
            <th className="px-4 py-3 text-right font-medium">Min hours</th>
            <th className="px-4 py-3 text-right font-medium">Priority</th>
            <th className="px-4 py-3 text-center font-medium">Enabled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-mono text-xs text-foreground">
                {rule.event_type}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">
                {rule.email_type}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={rule.send_mode === "auto" ? "default" : "secondary"}
                  className="text-[11px]"
                >
                  {rule.send_mode}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {rule.frequency_cap_per_week}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {rule.min_hours_between_sends}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{rule.priority}</td>
              <td className="px-4 py-3 text-center">
                {rule.enabled ? (
                  <span className="text-emerald-600">●</span>
                ) : (
                  <span className="text-muted-foreground">○</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
