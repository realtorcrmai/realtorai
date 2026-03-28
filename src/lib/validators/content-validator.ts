/**
 * Content Validator — Sprint 0
 *
 * Checks AI-generated email content before sending.
 * Every email must pass ALL checks. Fail = block send + log reason.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type ContentValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type ContentValidationInput = {
  contactName: string;
  contactType: "buyer" | "seller" | string;
  contactEmail: string | null;
  preferredAreas: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  subject: string;
  htmlBody: string;
  emailType: string;
  contactId: string;
};

/**
 * Validate email content before sending.
 * Returns { valid, errors, warnings }.
 * If valid === false, the email MUST NOT be sent.
 */
export async function validateContent(
  input: ContentValidationInput
): Promise<ContentValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const body = stripHtml(input.htmlBody);

  // 1. Name check — email must address the correct person
  const firstName = input.contactName?.split(" ")[0];
  if (firstName && firstName.length > 1) {
    if (!body.includes(firstName)) {
      errors.push(
        `Name mismatch: email body does not contain "${firstName}"`
      );
    }
  }

  // 2. Subject line checks
  if (!input.subject || input.subject.trim().length < 5) {
    errors.push("Subject line is empty or too short (< 5 chars)");
  }
  if (input.subject && input.subject.includes("{{")) {
    errors.push(
      `Raw merge field in subject: "${input.subject}"`
    );
  }

  // 3. Body checks
  if (!input.htmlBody || input.htmlBody.trim().length < 100) {
    errors.push("Email body is empty or too short (< 100 chars HTML)");
  }
  if (body.length < 20) {
    errors.push("Email body has less than 20 chars of text content");
  }
  if (body.includes("{{") || body.includes("}}")) {
    errors.push("Raw merge fields ({{ }}) found in email body");
  }
  if (body.includes("undefined") || body.includes("null")) {
    warnings.push("Body contains 'undefined' or 'null' — possible template error");
  }

  // 4. Type check — buyer content for buyers, seller for sellers
  if (input.contactType === "buyer") {
    const sellerPhrases = [
      "sell your home",
      "list your property",
      "selling your",
      "get your home sold",
      "listing agreement",
    ];
    for (const phrase of sellerPhrases) {
      if (body.toLowerCase().includes(phrase)) {
        errors.push(
          `Buyer received seller content: "${phrase}" found in body`
        );
        break;
      }
    }
  }
  if (input.contactType === "seller") {
    const buyerPhrases = [
      "find your dream home",
      "homes for sale",
      "book a showing",
      "mortgage calculator",
      "pre-approval",
    ];
    for (const phrase of buyerPhrases) {
      if (body.toLowerCase().includes(phrase)) {
        warnings.push(
          `Seller received buyer-oriented phrase: "${phrase}"`
        );
        break;
      }
    }
  }

  // 5. Area check — if contact has preferred areas, email should be relevant
  if (input.preferredAreas.length > 0 && input.emailType === "listing_alert") {
    const bodyLower = body.toLowerCase();
    const anyAreaMentioned = input.preferredAreas.some((area) =>
      bodyLower.includes(area.toLowerCase())
    );
    if (!anyAreaMentioned) {
      warnings.push(
        `Listing alert doesn't mention any preferred area: ${input.preferredAreas.join(", ")}`
      );
    }
  }

  // 6. Budget check — if listing alert, verify prices are in range
  if (
    input.budgetMin &&
    input.budgetMax &&
    input.emailType === "listing_alert"
  ) {
    const priceMatches = body.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    for (const priceStr of priceMatches) {
      const price = parseInt(priceStr.replace(/[$,]/g, ""), 10);
      if (price > 0 && price > input.budgetMax * 1.2) {
        warnings.push(
          `Listing price ${priceStr} exceeds budget max $${input.budgetMax.toLocaleString()} by >20%`
        );
      }
    }
  }

  // 7. Dedup check — same subject not sent to this contact in last 14 days
  try {
    const supabase = createAdminClient();
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: recent } = await supabase
      .from("newsletters")
      .select("id, subject")
      .eq("contact_id", input.contactId)
      .eq("status", "sent")
      .gte("sent_at", fourteenDaysAgo)
      .ilike("subject", input.subject);

    if (recent && recent.length > 0) {
      errors.push(
        `Duplicate: subject "${input.subject}" already sent to this contact within 14 days`
      );
    }
  } catch {
    warnings.push("Could not check for duplicate emails (DB query failed)");
  }

  // 8. Compliance content checks
  const bodyLower = body.toLowerCase();
  const complianceViolations = [
    { pattern: "guaranteed return", msg: "Cannot guarantee returns" },
    { pattern: "guaranteed value", msg: "Cannot guarantee property values" },
    { pattern: "will definitely increase", msg: "Cannot guarantee price increase" },
    { pattern: "guaranteed appreciation", msg: "Cannot guarantee appreciation" },
  ];
  for (const { pattern, msg } of complianceViolations) {
    if (bodyLower.includes(pattern)) {
      errors.push(`Compliance violation: ${msg}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Strip HTML tags to get plain text for content analysis */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#10003;/g, "✓")
    .replace(/\s+/g, " ")
    .trim();
}
