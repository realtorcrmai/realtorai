/**
 * Text Pipeline — processes AI-generated email content before rendering
 *
 * Runs between AI generation and HTML rendering:
 *   AI generates → TEXT PIPELINE → HTML block assembler → quality check → send
 *
 * Steps:
 *   1. Personalization — replace tokens with real contact data
 *   2. Voice rules — enforce realtor's writing style
 *   3. Content safety — verify data references exist in DB
 *   4. Compliance — no guarantees, no disparagement, required disclosures
 *   5. Subject dedup — ensure subject not sent recently
 *   6. Length check — within target for email type
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type PipelineInput = {
  subject: string;
  intro: string;
  body: string;
  ctaText: string;
  emailType: string;
  contactId: string;
  contactName: string;
  contactFirstName: string;
  contactType: string;
  contactArea?: string;
  contactBudget?: { min?: number; max?: number };
  contactNotes?: string;
  voiceRules?: string[];
  realtorName?: string;
};

export type PipelineResult = {
  subject: string;
  intro: string;
  body: string;
  ctaText: string;
  passed: boolean;
  corrections: Correction[];
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
};

type Correction = {
  field: "subject" | "intro" | "body" | "ctaText";
  original: string;
  corrected: string;
  rule: string;
};

// ═══════════════════════════════════════════════
// LENGTH TARGETS BY EMAIL TYPE
// ═══════════════════════════════════════════════

const LENGTH_TARGETS: Record<string, { min: number; max: number; label: string }> = {
  listing_alert: { min: 40, max: 100, label: "Listing alerts should be 40-100 words" },
  welcome: { min: 60, max: 150, label: "Welcome emails should be 60-150 words" },
  market_update: { min: 80, max: 200, label: "Market updates should be 80-200 words" },
  neighbourhood_guide: { min: 100, max: 250, label: "Neighbourhood guides should be 100-250 words" },
  home_anniversary: { min: 60, max: 150, label: "Anniversary emails should be 60-150 words" },
  just_sold: { min: 40, max: 100, label: "Just sold emails should be 40-100 words" },
  open_house: { min: 50, max: 120, label: "Open house invites should be 50-120 words" },
  seller_report: { min: 80, max: 200, label: "Seller reports should be 80-200 words" },
  re_engagement: { min: 40, max: 80, label: "Re-engagement should be short: 40-80 words" },
};

// ═══════════════════════════════════════════════
// COMPLIANCE BLOCKLIST
// ═══════════════════════════════════════════════

const COMPLIANCE_BLOCKLIST = [
  { pattern: /guaranteed?\s+(to\s+)?appreceat/i, reason: "Cannot guarantee property appreciation" },
  { pattern: /guaranteed?\s+(to\s+)?sell/i, reason: "Cannot guarantee a sale" },
  { pattern: /guaranteed?\s+return/i, reason: "Cannot guarantee investment returns" },
  { pattern: /will\s+(definitely|certainly|surely)\s+(increase|appreciate|go up)/i, reason: "Cannot make definitive predictions about property values" },
  { pattern: /better\s+than\s+(remax|keller|century|coldwell|royal\s?lepage|sotheby|compass|sutton|macdonald)/i, reason: "Cannot disparage competitor brokerages" },
  { pattern: /worst\s+(realtor|agent|brokerage)/i, reason: "Cannot disparage competitors" },
  { pattern: /no\s+money\s+down/i, reason: "Cannot make financing claims" },
];

// ═══════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════

export async function runTextPipeline(input: PipelineInput): Promise<PipelineResult> {
  const corrections: Correction[] = [];
  const warnings: string[] = [];
  let { subject, intro, body } = input;
  const { ctaText } = input;

  // ── Step 1: Personalization ──
  const tokens: Record<string, string> = {
    "{first_name}": input.contactFirstName,
    "{name}": input.contactName,
    "{area}": input.contactArea || "",
    "{budget_min}": input.contactBudget?.min ? `$${input.contactBudget.min.toLocaleString()}` : "",
    "{budget_max}": input.contactBudget?.max ? `$${input.contactBudget.max.toLocaleString()}` : "",
    "{agent_name}": input.realtorName || "Kunal",
    "{{first_name}}": input.contactFirstName,
    "{{name}}": input.contactName,
  };

  for (const [token, value] of Object.entries(tokens)) {
    if (subject.includes(token)) {
      const corrected = subject.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
      if (corrected !== subject) corrections.push({ field: "subject", original: subject, corrected, rule: `Replaced token ${token}` });
      subject = corrected;
    }
    if (intro.includes(token)) {
      intro = intro.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
    }
    if (body.includes(token)) {
      body = body.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
    }
  }

  // Check for unresolved tokens
  const unresolvedPattern = /\{\{?\w+\}?\}/g;
  const unresolvedSubject = subject.match(unresolvedPattern);
  const unresolvedBody = (intro + " " + body).match(unresolvedPattern);
  if (unresolvedSubject || unresolvedBody) {
    return {
      subject, intro, body, ctaText,
      passed: false, corrections, warnings,
      blocked: true,
      blockReason: `Unresolved tokens: ${[...(unresolvedSubject || []), ...(unresolvedBody || [])].join(", ")}`,
    };
  }

  // ── Step 2: Voice Rules ──
  if (input.voiceRules?.length) {
    for (const rule of input.voiceRules) {
      const lower = rule.toLowerCase();

      // No exclamation marks in subject
      if (lower.includes("exclamation") && lower.includes("subject")) {
        if (subject.includes("!")) {
          const corrected = subject.replace(/!+/g, "");
          corrections.push({ field: "subject", original: subject, corrected, rule });
          subject = corrected;
        }
      }

      // No exclamation marks anywhere
      if (lower.includes("exclamation") && !lower.includes("subject")) {
        if (intro.includes("!")) { intro = intro.replace(/!+/g, "."); }
        if (body.includes("!")) { body = body.replace(/!+/g, "."); }
      }

      // Keep under N words
      const wordMatch = lower.match(/under\s+(\d+)\s+words/);
      if (wordMatch) {
        const maxWords = parseInt(wordMatch[1]);
        const totalWords = (intro + " " + body).split(/\s+/).length;
        if (totalWords > maxWords) {
          warnings.push(`Voice rule: "${rule}" — current: ${totalWords} words, target: ${maxWords}`);
        }
      }

      // Avoid specific words
      const avoidMatch = lower.match(/avoid[:\s]+([\w\s,]+)/i);
      if (avoidMatch) {
        const avoidWords = avoidMatch[1].split(/,\s*/).map(w => w.trim()).filter(Boolean);
        for (const word of avoidWords) {
          const regex = new RegExp(`\\b${word}\\b`, "gi");
          if (regex.test(subject)) {
            warnings.push(`Voice rule violation: subject contains "${word}" — rule says avoid`);
          }
          if (regex.test(intro) || regex.test(body)) {
            warnings.push(`Voice rule violation: body contains "${word}" — rule says avoid`);
          }
        }
      }
    }
  }

  // ── Step 3: Content Safety ──
  // Check for suspiciously specific claims that might be hallucinated
  const pricePattern = /\$[\d,]+/g;
  const pricesInContent = [...(intro + " " + body).matchAll(pricePattern)].map(m => m[0]);
  if (pricesInContent.length > 3) {
    warnings.push(`Content contains ${pricesInContent.length} price references — verify all are from real data`);
  }

  // Check for address-like strings that should be verified
  const addressPattern = /\d+\s+\w+\s+(st|ave|road|blvd|dr|way|cres|pl|lane|ct)\b/gi;
  const addressesInContent = [...(intro + " " + body).matchAll(addressPattern)].map(m => m[0]);
  if (addressesInContent.length > 0) {
    // TODO: Verify against listings table
    warnings.push(`Content mentions ${addressesInContent.length} address(es) — ensure they exist in DB: ${addressesInContent.join(", ")}`);
  }

  // ── Step 4: Compliance ──
  const fullText = `${subject} ${intro} ${body}`;
  for (const check of COMPLIANCE_BLOCKLIST) {
    if (check.pattern.test(fullText)) {
      return {
        subject, intro, body, ctaText,
        passed: false, corrections, warnings,
        blocked: true,
        blockReason: `Compliance violation: ${check.reason}`,
      };
    }
  }

  // ── Step 5: Subject Dedup ──
  try {
    const supabase = createAdminClient();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: recentEmails } = await supabase
      .from("newsletters")
      .select("subject")
      .eq("contact_id", input.contactId)
      .eq("status", "sent")
      .gte("sent_at", fourteenDaysAgo);

    const recentSubjects = (recentEmails || []).map(e => e.subject.toLowerCase());
    if (recentSubjects.includes(subject.toLowerCase())) {
      warnings.push(`Subject "${subject}" was sent to this contact in the last 14 days — consider changing`);
    }

    // Check for very similar subjects (first 20 chars match)
    const subjectPrefix = subject.toLowerCase().slice(0, 20);
    const similar = recentSubjects.filter(s => s.slice(0, 20) === subjectPrefix);
    if (similar.length > 0 && !recentSubjects.includes(subject.toLowerCase())) {
      warnings.push(`Subject is very similar to recent email: "${similar[0]}"`);
    }
  } catch {
    // Don't block if DB check fails
  }

  // ── Step 6: Length Check ──
  const wordCount = (intro + " " + body).split(/\s+/).filter(Boolean).length;
  const target = LENGTH_TARGETS[input.emailType];
  if (target) {
    if (wordCount > target.max) {
      warnings.push(`Too long: ${wordCount} words (target: ${target.max}). ${target.label}`);
    } else if (wordCount < target.min) {
      warnings.push(`Too short: ${wordCount} words (target: ${target.min}). ${target.label}`);
    }
  }

  // ── Step 7: Basic Quality Checks ──
  if (subject.length === 0) {
    return { subject, intro, body, ctaText, passed: false, corrections, warnings, blocked: true, blockReason: "Empty subject line" };
  }
  if (subject.length > 80) {
    warnings.push(`Subject is ${subject.length} chars — may get truncated in inbox (target: <60)`);
  }
  if (intro.length === 0 && body.length === 0) {
    return { subject, intro, body, ctaText, passed: false, corrections, warnings, blocked: true, blockReason: "Empty email body" };
  }
  if (!ctaText || ctaText.length === 0) {
    warnings.push("No CTA text — email has no clear call to action");
  }

  // Check for contact name in greeting
  if (!intro.toLowerCase().includes(input.contactFirstName.toLowerCase())) {
    warnings.push(`Email doesn't mention contact's name "${input.contactFirstName}" — may feel impersonal`);
  }

  return {
    subject,
    intro,
    body,
    ctaText,
    passed: true,
    corrections,
    warnings,
    blocked: false,
  };
}
