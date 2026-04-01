/**
 * Validated Email Send — Sprint 0
 *
 * Wraps the Resend send function with the full 7-step validation pipeline.
 * This is the ONLY function that should be used to send emails to contacts.
 * Direct calls to resend.ts sendEmail should only be used for system emails.
 */

import { runValidationPipeline, type PipelineInput, type ValidationPipelineResult } from "@/lib/validators";
import { sendEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

export type ValidatedSendResult = {
  sent: boolean;
  action: "sent" | "queued" | "deferred" | "blocked" | "regenerate";
  messageId: string | null;
  validationResult: ValidationPipelineResult;
  error: string | null;
};

type ValidatedSendInput = {
  newsletterId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactType: string;
  preferredAreas?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  subject: string;
  htmlBody: string;
  emailType: string;
  trustLevel?: number;
  voiceRules?: string[];
  lastSubjects?: string[];
  journeyPhase?: string;
  skipQualityScore?: boolean;
  /** Workflow/trigger metadata for BCC monitoring */
  workflowName?: string;
  stepName?: string;
  triggeredBy?: string;
};

/**
 * Send an email through the full validation pipeline.
 *
 * Flow:
 * 1. Run validation pipeline (content + design + compliance + quality)
 * 2. If pipeline says "send" → send via Resend
 * 3. If pipeline says "queue" → mark newsletter as draft (for approval)
 * 4. If pipeline says "defer" → update next_email_at
 * 5. If pipeline says "block" → mark newsletter as failed + log reason
 * 6. If pipeline says "regenerate" → mark for regeneration
 */
export async function validatedSend(
  input: ValidatedSendInput
): Promise<ValidatedSendResult> {
  const supabase = createAdminClient();

  // Run the full validation pipeline
  const validationResult = await runValidationPipeline({
    contactId: input.contactId,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactType: input.contactType,
    preferredAreas: input.preferredAreas || [],
    budgetMin: input.budgetMin || null,
    budgetMax: input.budgetMax || null,
    subject: input.subject,
    htmlBody: input.htmlBody,
    emailType: input.emailType,
    trustLevel: input.trustLevel || 0,
    voiceRules: input.voiceRules,
    lastSubjects: input.lastSubjects,
    journeyPhase: input.journeyPhase,
    skipQualityScore: input.skipQualityScore,
  });

  // Update newsletter with quality score if available
  if (validationResult.qualityScore) {
    await supabase
      .from("newsletters")
      .update({ quality_score: validationResult.qualityScore.average })
      .eq("id", input.newsletterId);
  }

  // Handle each action
  switch (validationResult.action) {
    case "send": {
      // All checks passed + trust level allows auto-send
      try {
        const { messageId } = await sendEmail({
          to: input.contactEmail,
          subject: input.subject,
          html: input.htmlBody,
          tags: [
            { name: "newsletter_id", value: input.newsletterId },
            { name: "contact_id", value: input.contactId },
            { name: "email_type", value: input.emailType },
          ],
          metadata: {
            workflowName: input.workflowName,
            stepName: input.stepName,
            emailType: input.emailType,
            journeyPhase: input.journeyPhase,
            contactName: input.contactName,
            contactType: input.contactType,
            contactId: input.contactId,
            triggeredBy: input.triggeredBy || "AI Newsletter Engine",
          },
        });

        // Update newsletter status
        await supabase.from("newsletters").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_message_id: messageId || null,
        }).eq("id", input.newsletterId);

        // Log outcome event (for attribution chain)
        await supabase.from("outcome_events").insert({
          contact_id: input.contactId,
          event_type: "email_sent",
          newsletter_id: input.newsletterId,
          metadata: {
            subject: input.subject,
            email_type: input.emailType,
            quality_score: validationResult.qualityScore?.average,
            warnings: validationResult.allWarnings,
          },
        });

        return {
          sent: true,
          action: "sent",
          messageId: messageId || null,
          validationResult,
          error: null,
        };
      } catch (sendError) {
        // Send failed — mark newsletter as failed
        await supabase.from("newsletters").update({
          status: "failed",
          ai_context: {
            send_error: sendError instanceof Error ? sendError.message : String(sendError),
            failed_at: new Date().toISOString(),
          },
        }).eq("id", input.newsletterId);

        return {
          sent: false,
          action: "blocked",
          messageId: null,
          validationResult,
          error: sendError instanceof Error ? sendError.message : String(sendError),
        };
      }
    }

    case "queue": {
      // Trust level requires approval — keep as draft
      await supabase.from("newsletters").update({
        status: "draft",
        ai_context: {
          validation_passed: true,
          quality_score: validationResult.qualityScore?.average,
          awaiting_approval: true,
          warnings: validationResult.allWarnings,
        },
      }).eq("id", input.newsletterId);

      return {
        sent: false,
        action: "queued",
        messageId: null,
        validationResult,
        error: null,
      };
    }

    case "defer": {
      // Frequency/timing issue — defer to later
      await supabase.from("newsletters").update({
        status: "draft",
        ai_context: {
          deferred: true,
          defer_reason: validationResult.complianceResult.reason,
          defer_until: validationResult.deferUntil,
        },
      }).eq("id", input.newsletterId);

      // Update journey next_email_at if deferred
      if (validationResult.deferUntil) {
        await supabase
          .from("contact_journeys")
          .update({ next_email_at: validationResult.deferUntil })
          .eq("contact_id", input.contactId);
      }

      return {
        sent: false,
        action: "deferred",
        messageId: null,
        validationResult,
        error: validationResult.complianceResult.reason,
      };
    }

    case "block": {
      // Hard block — validation failed
      await supabase.from("newsletters").update({
        status: "failed",
        ai_context: {
          blocked: true,
          block_reasons: validationResult.allErrors,
          blocked_at: new Date().toISOString(),
        },
      }).eq("id", input.newsletterId);

      return {
        sent: false,
        action: "blocked",
        messageId: null,
        validationResult,
        error: validationResult.allErrors.join("; "),
      };
    }

    case "regenerate": {
      // Quality too low — needs regeneration
      await supabase.from("newsletters").update({
        status: "draft",
        ai_context: {
          needs_regeneration: true,
          quality_issues: validationResult.qualityScore?.issues,
          quality_score: validationResult.qualityScore?.average,
        },
      }).eq("id", input.newsletterId);

      return {
        sent: false,
        action: "regenerate",
        messageId: null,
        validationResult,
        error: "Quality score below threshold — needs regeneration",
      };
    }

    default: {
      return {
        sent: false,
        action: "blocked",
        messageId: null,
        validationResult,
        error: "Unknown validation action",
      };
    }
  }
}
