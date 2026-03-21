/**
 * Email Journey Workflows — Buyer & Seller lifecycle drip sequences
 * using ai_email steps (Claude-generated + React Email templates + Resend delivery)
 *
 * These replace the hard-coded JOURNEY_SCHEDULES in actions/journeys.ts
 */

export const JOURNEY_WORKFLOW_BLUEPRINTS = {
  buyer_email_journey: {
    name: "Buyer Email Journey",
    description: "Automated AI email sequence for buyer contacts across all lifecycle phases",
    trigger_type: "new_lead" as const,
    contact_type: "buyer" as const,
    steps: [
      // ── Lead Phase ──
      { step_order: 1, name: "Welcome Email", action_type: "ai_email", delay_value: 0, delay_unit: "minutes", action_config: { email_type: "welcome", send_mode: "review", journey_phase: "lead" } },
      { step_order: 2, name: "Neighbourhood Guide", action_type: "ai_email", delay_value: 3, delay_unit: "days", action_config: { email_type: "neighbourhood_guide", send_mode: "review", journey_phase: "lead" } },
      { step_order: 3, name: "Listing Alert #1", action_type: "ai_email", delay_value: 7, delay_unit: "days", action_config: { email_type: "new_listing_alert", send_mode: "review", journey_phase: "lead" } },
      { step_order: 4, name: "Market Update", action_type: "ai_email", delay_value: 14, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "lead" } },
      { step_order: 5, name: "Listing Alert #2", action_type: "ai_email", delay_value: 21, delay_unit: "days", action_config: { email_type: "new_listing_alert", send_mode: "review", journey_phase: "lead" } },

      // ── Active Phase ──
      { step_order: 6, name: "Active: Weekly Listings", action_type: "ai_email", delay_value: 7, delay_unit: "days", action_config: { email_type: "new_listing_alert", send_mode: "review", journey_phase: "active" } },
      { step_order: 7, name: "Active: Market Report", action_type: "ai_email", delay_value: 21, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "active" } },

      // ── Past Client Phase ──
      { step_order: 8, name: "Home Anniversary", action_type: "ai_email", delay_value: 30, delay_unit: "days", action_config: { email_type: "home_anniversary", send_mode: "review", journey_phase: "past_client" } },
      { step_order: 9, name: "Quarterly Market Update", action_type: "ai_email", delay_value: 90, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "past_client" } },
      { step_order: 10, name: "Referral Ask", action_type: "ai_email", delay_value: 180, delay_unit: "days", action_config: { email_type: "referral_ask", send_mode: "review", journey_phase: "past_client" } },
    ],
  },

  seller_email_journey: {
    name: "Seller Email Journey",
    description: "Automated AI email sequence for seller contacts across all lifecycle phases",
    trigger_type: "new_lead" as const,
    contact_type: "seller" as const,
    steps: [
      // ── Lead Phase ──
      { step_order: 1, name: "Welcome + CMA Preview", action_type: "ai_email", delay_value: 0, delay_unit: "minutes", action_config: { email_type: "welcome", send_mode: "review", journey_phase: "lead" } },
      { step_order: 2, name: "Market Update for Sellers", action_type: "ai_email", delay_value: 3, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "lead" } },
      { step_order: 3, name: "Neighbourhood Guide", action_type: "ai_email", delay_value: 7, delay_unit: "days", action_config: { email_type: "neighbourhood_guide", send_mode: "review", journey_phase: "lead" } },

      // ── Active Listing Phase ──
      { step_order: 4, name: "Weekly Showing Summary", action_type: "ai_email", delay_value: 7, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "active" } },

      // ── Past Client Phase ──
      { step_order: 5, name: "Quarterly Neighbourhood Update", action_type: "ai_email", delay_value: 30, delay_unit: "days", action_config: { email_type: "market_update", send_mode: "review", journey_phase: "past_client" } },
      { step_order: 6, name: "Referral Ask", action_type: "ai_email", delay_value: 90, delay_unit: "days", action_config: { email_type: "referral_ask", send_mode: "review", journey_phase: "past_client" } },
      { step_order: 7, name: "Annual Anniversary", action_type: "ai_email", delay_value: 365, delay_unit: "days", action_config: { email_type: "home_anniversary", send_mode: "review", journey_phase: "past_client" } },
    ],
  },
};

/** Convert delay_value + delay_unit to delay_minutes */
export function toDelayMinutes(value: number, unit: string): number {
  switch (unit) {
    case "minutes": return value;
    case "hours": return value * 60;
    case "days": return value * 1440;
    default: return value;
  }
}
