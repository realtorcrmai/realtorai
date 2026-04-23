/**
 * Journey phase email schedules — shared between server actions and UI.
 *
 * Extracted from src/actions/journeys.ts so it can be imported by
 * non-"use server" files (Next.js forbids exporting non-functions from
 * "use server" modules).
 */

export type JourneyType = "buyer" | "seller" | "customer" | "agent";
export type JourneyPhase = "lead" | "active" | "under_contract" | "past_client" | "dormant";

export const JOURNEY_SCHEDULES: Record<JourneyType, Record<JourneyPhase, Array<{ emailType: string; delayHours: number }>>> = {
  buyer: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "neighbourhood_guide", delayHours: 72 },
      { emailType: "new_listing_alert", delayHours: 168 },
      { emailType: "market_update", delayHours: 336 },
      { emailType: "new_listing_alert", delayHours: 504 },
    ],
    active: [
      { emailType: "new_listing_alert", delayHours: 168 },
      { emailType: "market_update", delayHours: 504 },
    ],
    under_contract: [
      { emailType: "closing_checklist", delayHours: 0 },
      { emailType: "inspection_reminder", delayHours: 48 },
      { emailType: "neighbourhood_guide", delayHours: 48 },
    ],
    past_client: [
      { emailType: "home_anniversary", delayHours: 720 },
      { emailType: "referral_ask", delayHours: 720 },
      { emailType: "market_update", delayHours: 2160 },
      { emailType: "referral_ask", delayHours: 4320 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "new_listing_alert", delayHours: 120 },
      { emailType: "referral_ask", delayHours: 240 },
    ],
  },
  seller: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "market_update", delayHours: 72 },
      { emailType: "neighbourhood_guide", delayHours: 168 },
    ],
    active: [
      { emailType: "market_update", delayHours: 168 },
    ],
    under_contract: [
      { emailType: "closing_checklist", delayHours: 0 },
      { emailType: "inspection_reminder", delayHours: 72 },
      { emailType: "closing_countdown", delayHours: 168 },
    ],
    past_client: [
      { emailType: "market_update", delayHours: 720 },
      { emailType: "referral_ask", delayHours: 720 },
      { emailType: "referral_ask", delayHours: 2160 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "market_update", delayHours: 120 },
      { emailType: "referral_ask", delayHours: 240 },
    ],
  },
  customer: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "neighbourhood_guide", delayHours: 72 },
      { emailType: "market_update", delayHours: 336 },
    ],
    active: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "new_listing_alert", delayHours: 168 },
    ],
    under_contract: [],
    past_client: [
      { emailType: "home_anniversary", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
      { emailType: "referral_ask", delayHours: 504 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
      { emailType: "referral_ask", delayHours: 336 },
    ],
  },
  agent: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
      { emailType: "referral_ask", delayHours: 336 },
    ],
    active: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "new_listing_alert", delayHours: 168 },
    ],
    under_contract: [],
    past_client: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "referral_ask", delayHours: 336 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "referral_ask", delayHours: 168 },
    ],
  },
};
