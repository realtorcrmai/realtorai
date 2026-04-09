"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorConfig, type AutomationRule } from "@/actions/config";

/**
 * Check automation rules and fire listing blasts when triggered.
 *
 * Called from listing actions when:
 * - listing_created: new listing added
 * - listing_active: listing status changed to active
 * - price_change: list_price updated on active listing
 */
export async function executeListingBlastRules(
  triggerType: "listing_active" | "listing_created" | "price_change",
  listingId: string,
): Promise<{ fired: number; skipped: number }> {
  const config = await getRealtorConfig();
  if (!config?.brand_config) return { fired: 0, skipped: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: AutomationRule[] = (config.brand_config as any).automation_rules || [];
  const matchingRules = rules.filter(r => r.enabled && r.trigger === triggerType);

  if (matchingRules.length === 0) return { fired: 0, skipped: 0 };

  let fired = 0;
  let skipped = 0;

  for (const rule of matchingRules) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      // Determine sendToAllAgents or specific recipients
      const sendToAllAgents = rule.recipients === "all_agents" || rule.recipients === "active_agents";
      const sendToAllBuyers = rule.recipients === "all_buyers" || rule.recipients === "area_buyers";

      if (sendToAllBuyers) {
        // Send to buyer contacts instead of agents.
        // Central CASL gate: only send to buyers with CASL consent AND
        // who haven't unsubscribed. See src/lib/compliance/can-send.ts
        const supabase = createAdminClient();
        const { data: buyers } = await supabase
          .from("contacts")
          .select("id, email, newsletter_unsubscribed, casl_consent_given, casl_consent_date")
          .eq("type", "buyer")
          .eq("newsletter_unsubscribed", false)
          .eq("casl_consent_given", true)
          .not("email", "is", null);

        const { filterSendable } = await import("@/lib/compliance/can-send");
        const { sendable } = filterSendable(buyers || []);
        const recipientEmails = sendable.map((b) => b.email).filter((e): e is string => !!e);

        if (recipientEmails.length === 0) {
          skipped++;
          continue;
        }

        const res = await fetch(`${appUrl}/api/listings/blast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, recipientEmails }),
        });

        if (res.ok) fired++;
        else skipped++;
      } else {
        // Send to agents
        const res = await fetch(`${appUrl}/api/listings/blast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, sendToAllAgents: true }),
        });

        if (res.ok) fired++;
        else skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { fired, skipped };
}
