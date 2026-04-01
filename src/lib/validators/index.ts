/**
 * Email Validation Pipeline — Sprint 0
 *
 * 7-step pipeline every email passes through before sending.
 * No email bypasses this — even at Trust Level 3.
 *
 * Steps:
 * 1. AI generates content (handled upstream)
 * 2. Content validator (name, area, budget, type, dedup, merge fields)
 * 3. HTML renderer (handled upstream — React Email)
 * 4. Design validator (unsubscribe, links, images, size, dark mode)
 * 5. Compliance gate (consent, frequency, gap, quiet hours, bounce)
 * 6. Trust gate (queue for approval or auto-send)
 * 7. Send + verify (handled downstream — Resend API)
 */

import { validateContent, type ContentValidationResult } from "./content-validator";
import { validateDesign, type DesignValidationResult } from "./design-validator";
import { checkCompliance, getTrustGateAction, type ComplianceResult } from "./compliance-gate";
import { scoreEmailQuality, type QualityScore } from "./quality-scorer";

export type ValidationPipelineResult = {
  passed: boolean;
  action: "send" | "queue" | "defer" | "block" | "regenerate";
  deferUntil: string | null;

  contentResult: ContentValidationResult;
  designResult: DesignValidationResult;
  complianceResult: ComplianceResult;
  qualityScore: QualityScore | null;

  allErrors: string[];
  allWarnings: string[];
};

export type PipelineInput = {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactType: string;
  preferredAreas: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  subject: string;
  htmlBody: string;
  emailType: string;
  trustLevel: number;
  voiceRules?: string[];
  lastSubjects?: string[];
  journeyPhase?: string;
  skipQualityScore?: boolean; // Skip for speed on bulk operations
};

/**
 * Run the full validation pipeline on an email.
 * Returns whether to send, queue, defer, block, or regenerate.
 */
export async function runValidationPipeline(
  input: PipelineInput
): Promise<ValidationPipelineResult> {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Step 2: Content Validator
  const contentResult = await validateContent({
    contactName: input.contactName,
    contactType: input.contactType,
    contactEmail: input.contactEmail,
    preferredAreas: input.preferredAreas,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    subject: input.subject,
    htmlBody: input.htmlBody,
    emailType: input.emailType,
    contactId: input.contactId,
  });
  allErrors.push(...contentResult.errors);
  allWarnings.push(...contentResult.warnings);

  // If content validation fails hard, stop early
  if (!contentResult.valid) {
    return {
      passed: false,
      action: "block",
      deferUntil: null,
      contentResult,
      designResult: { valid: true, errors: [], warnings: [] },
      complianceResult: { allowed: true, reason: null, defer: false, deferUntil: null },
      qualityScore: null,
      allErrors,
      allWarnings,
    };
  }

  // Step 4: Design Validator
  const designResult = validateDesign(input.htmlBody);
  allErrors.push(...designResult.errors);
  allWarnings.push(...designResult.warnings);

  if (!designResult.valid) {
    return {
      passed: false,
      action: "block",
      deferUntil: null,
      contentResult,
      designResult,
      complianceResult: { allowed: true, reason: null, defer: false, deferUntil: null },
      qualityScore: null,
      allErrors,
      allWarnings,
    };
  }

  // Step 5: Compliance Gate
  const complianceResult = await checkCompliance({
    contactId: input.contactId,
    contactEmail: input.contactEmail,
    realtorId: undefined, // TODO: pass realtor ID when multi-tenant
    trustLevel: input.trustLevel,
  });

  if (!complianceResult.allowed) {
    if (complianceResult.defer) {
      return {
        passed: false,
        action: "defer",
        deferUntil: complianceResult.deferUntil,
        contentResult,
        designResult,
        complianceResult,
        qualityScore: null,
        allErrors: [...allErrors, complianceResult.reason || "Compliance check failed"],
        allWarnings,
      };
    }
    return {
      passed: false,
      action: "block",
      deferUntil: null,
      contentResult,
      designResult,
      complianceResult,
      qualityScore: null,
      allErrors: [...allErrors, complianceResult.reason || "Compliance check failed"],
      allWarnings,
    };
  }

  // Quality Score (optional — skip for bulk/speed)
  let qualityScore: QualityScore | null = null;
  if (!input.skipQualityScore) {
    const bodyText = input.htmlBody
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    qualityScore = await scoreEmailQuality({
      contactName: input.contactName,
      contactType: input.contactType,
      journeyPhase: input.journeyPhase || "lead",
      preferredAreas: input.preferredAreas,
      subject: input.subject,
      bodyText,
      emailType: input.emailType,
      voiceRules: input.voiceRules || [],
      lastSubjects: input.lastSubjects || [],
    });

    if (qualityScore.action === "skip") {
      return {
        passed: false,
        action: "block",
        deferUntil: null,
        contentResult,
        designResult,
        complianceResult,
        qualityScore,
        allErrors: [...allErrors, ...qualityScore.issues],
        allWarnings,
      };
    }

    if (qualityScore.action === "regenerate") {
      return {
        passed: false,
        action: "regenerate",
        deferUntil: null,
        contentResult,
        designResult,
        complianceResult,
        qualityScore,
        allErrors,
        allWarnings: [...allWarnings, ...qualityScore.issues],
      };
    }
  }

  // Step 6: Trust Gate
  const trustAction = getTrustGateAction(input.trustLevel);

  return {
    passed: true,
    action: trustAction === "queue" ? "queue" : "send",
    deferUntil: null,
    contentResult,
    designResult,
    complianceResult,
    qualityScore,
    allErrors,
    allWarnings,
  };
}

// Re-export for individual use
export { validateContent } from "./content-validator";
export { validateDesign } from "./design-validator";
export { checkCompliance, getTrustGateAction } from "./compliance-gate";
export { scoreEmailQuality } from "./quality-scorer";
