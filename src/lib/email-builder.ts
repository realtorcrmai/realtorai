/**
 * Email Builder — Thin wrapper around the block-based email system.
 *
 * All email assembly is now handled by `email-blocks.ts` (assembleEmail / buildEmailFromType).
 * This file re-exports convenience helpers so existing imports don't break.
 *
 * @see {@link ./email-blocks.ts} for the canonical block-based assembler.
 */

import { assembleEmail, buildEmailFromType, getBrandConfig } from "@/lib/email-blocks";

// Re-export for callers that referenced this module
export { assembleEmail, buildEmailFromType, getBrandConfig };

type BrandConfig = {
  primaryColor?: string;
  accentColor?: string;
  logoText?: string;
  realtorName?: string;
  realtorTitle?: string;
  brokerage?: string;
  phone?: string;
  website?: string;
  address?: string;
};

/**
 * Build a welcome email for a new contact.
 * Delegates to the block-based assembler (email-blocks.ts).
 */
export async function buildWelcomeEmail(options: {
  firstName: string;
  contactType: string;
  area?: string;
  budget?: string;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): Promise<{ subject: string; html: string }> {
  const isBuyer = options.contactType === "buyer";
  const area = options.area || "Vancouver";

  const subject = isBuyer
    ? `Welcome ${options.firstName}! Let's Find Your Dream Home`
    : `Welcome ${options.firstName}! Let's Get Your Home Sold`;

  const intro = isBuyer
    ? `Welcome! I'm excited to help you find your perfect home${area !== "Vancouver" ? ` in ${area}` : ""}. ${options.budget ? `With your budget of ${options.budget}, there are some great options available right now.` : "Let me know your preferences and I'll start matching you with properties."}`
    : `Welcome! I'm looking forward to helping you sell your property${area !== "Vancouver" ? ` in ${area}` : ""}. I'll prepare a comprehensive market analysis so we can price it right and get you the best result.`;

  const brand = await getBrandConfig();

  const html = assembleEmail("welcome", {
    contact: {
      name: options.firstName,
      firstName: options.firstName,
      type: options.contactType,
    },
    agent: brand,
    content: {
      subject,
      intro,
      body: "Feel free to reply to this email anytime — I'm here to help!",
      ctaText: isBuyer ? "View Available Listings" : "Get Your Free CMA",
    },
  });

  return { subject, html };
}

/**
 * Build a listing alert email using the block system.
 */
export async function buildListingAlertEmail(options: {
  firstName: string;
  intro: string;
  listings: Array<{
    address: string;
    price: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    photoUrl?: string;
  }>;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): Promise<{ html: string }> {
  const html = await buildEmailFromType(
    "new_listing",
    options.firstName,
    "buyer",
    "New Listings For You",
    options.intro,
    "View All Listings",
  );

  return { html };
}

/**
 * Build a market update email using the block system.
 */
export async function buildMarketUpdateEmail(options: {
  firstName: string;
  area: string;
  intro: string;
  stats: Array<{ value: string; label: string; change?: string }>;
  recentSales?: Array<{ address: string; price: string }>;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): Promise<{ html: string }> {
  const html = await buildEmailFromType(
    "market_update",
    options.firstName,
    "buyer",
    `${options.area} Market Update`,
    options.intro,
    "Full Market Report",
  );

  return { html };
}
