import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTrustLevel, type TrustLevel } from "./trust-manager";

interface TrustGateInput {
  contactId: string;
  decisionId: string;
  emailType: string;
  subject: string;
  htmlBody: string;
  reasoning: string;
  aiContext: Record<string, unknown>;
}

interface TrustGateResult {
  action: "ghost_stored" | "queued_for_review" | "sent_with_recall" | "sent_autonomous";
  newsletterId?: string;
  ghostDraftId?: string;
  recallId?: string;
  trustLevel: TrustLevel;
}

export async function applyTrustGate(input: TrustGateInput): Promise<TrustGateResult> {
  const supabase = createAdminClient();
  const trustLevel = await getEffectiveTrustLevel(input.contactId);

  switch (trustLevel) {
    case "ghost": {
      // Store as ghost draft — not visible in queue, only in ghost comparison view
      const { data } = await supabase
        .from("ghost_drafts")
        .insert({
          contact_id: input.contactId,
          decision_id: input.decisionId,
          email_type: input.emailType,
          subject: input.subject,
          html_body: input.htmlBody,
          reasoning: input.reasoning,
          ai_context: input.aiContext,
        })
        .select("id")
        .single();

      // Update decision outcome
      await supabase
        .from("agent_decisions")
        .update({ outcome: "ghost_stored", trust_level: "ghost" })
        .eq("id", input.decisionId);

      return {
        action: "ghost_stored",
        ghostDraftId: data?.id,
        trustLevel: "ghost",
      };
    }

    case "copilot": {
      // Queue for review — appears in approval queue
      const { data } = await supabase
        .from("newsletters")
        .insert({
          contact_id: input.contactId,
          subject: input.subject,
          email_type: input.emailType,
          status: "draft",
          html_body: input.htmlBody,
          ai_context: { ...input.aiContext, reasoning: input.reasoning },
        })
        .select("id")
        .single();

      await supabase
        .from("agent_decisions")
        .update({
          outcome: "draft_created",
          newsletter_id: data?.id,
          trust_level: "copilot",
        })
        .eq("id", input.decisionId);

      return {
        action: "queued_for_review",
        newsletterId: data?.id,
        trustLevel: "copilot",
      };
    }

    case "supervised": {
      // Auto-send with 30-minute recall window
      const { data: nl } = await supabase
        .from("newsletters")
        .insert({
          contact_id: input.contactId,
          subject: input.subject,
          email_type: input.emailType,
          status: "sent",
          html_body: input.htmlBody,
          sent_at: new Date().toISOString(),
          ai_context: { ...input.aiContext, reasoning: input.reasoning },
        })
        .select("id")
        .single();

      // Create recall window (30 minutes)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const { data: recall } = await supabase
        .from("email_recalls")
        .insert({
          newsletter_id: nl?.id,
          contact_id: input.contactId,
          expires_at: expiresAt.toISOString(),
        })
        .select("id")
        .single();

      await supabase
        .from("agent_decisions")
        .update({
          outcome: "sent",
          newsletter_id: nl?.id,
          trust_level: "supervised",
        })
        .eq("id", input.decisionId);

      return {
        action: "sent_with_recall",
        newsletterId: nl?.id,
        recallId: recall?.id,
        trustLevel: "supervised",
      };
    }

    case "autonomous": {
      // Auto-send, no recall
      const { data: nl } = await supabase
        .from("newsletters")
        .insert({
          contact_id: input.contactId,
          subject: input.subject,
          email_type: input.emailType,
          status: "sent",
          html_body: input.htmlBody,
          sent_at: new Date().toISOString(),
          ai_context: { ...input.aiContext, reasoning: input.reasoning },
        })
        .select("id")
        .single();

      await supabase
        .from("agent_decisions")
        .update({
          outcome: "sent",
          newsletter_id: nl?.id,
          trust_level: "autonomous",
        })
        .eq("id", input.decisionId);

      return {
        action: "sent_autonomous",
        newsletterId: nl?.id,
        trustLevel: "autonomous",
      };
    }
  }
}

export async function recallEmail(recallId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: recall } = await supabase
    .from("email_recalls")
    .select("id, newsletter_id, expires_at, recalled")
    .eq("id", recallId)
    .single();

  if (!recall) return { success: false, error: "Recall not found" };
  if (recall.recalled) return { success: false, error: "Already recalled" };
  if (new Date(recall.expires_at) < new Date()) return { success: false, error: "Recall window expired" };

  // Mark as recalled
  await supabase
    .from("email_recalls")
    .update({ recalled: true, recalled_at: new Date().toISOString() })
    .eq("id", recallId);

  // Mark newsletter as recalled
  await supabase
    .from("newsletters")
    .update({ status: "failed" })
    .eq("id", recall.newsletter_id);

  // Update decision
  await supabase
    .from("agent_decisions")
    .update({ outcome: "recalled" })
    .eq("newsletter_id", recall.newsletter_id);

  return { success: true };
}
