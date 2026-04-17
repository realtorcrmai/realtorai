"use server";

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

const segmentRuleSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string(),
});

const createSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  rules: z.array(segmentRuleSchema).min(1, "At least one rule is required"),
  rule_operator: z.enum(["AND", "OR"]).optional(),
});

interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

export async function getSegments() {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc
    .from("contact_segments")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createSegment(input: {
  name: string;
  description?: string;
  rules: SegmentRule[];
  rule_operator?: string;
}) {
  const parsed = createSegmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const tc = await getAuthenticatedTenantClient();

  // Count matching contacts
  const count = await evaluateSegmentRules(input.rules, input.rule_operator || "AND");

  const { data, error } = await tc
    .from("contact_segments")
    .insert({
      name: input.name,
      description: input.description || null,
      rules: input.rules,
      rule_operator: input.rule_operator || "AND",
      contact_count: count,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/contacts/segments");
  return { data };
}

export async function deleteSegment(id: string) {
  const tc = await getAuthenticatedTenantClient();
  await tc.from("contact_segments").delete().eq("id", id);
  revalidatePath("/contacts/segments");
  return { success: true };
}

export async function evaluateSegment(segmentId: string): Promise<{ contactIds: string[]; count: number }> {
  const tc = await getAuthenticatedTenantClient();
  const { data: segment } = await tc
    .from("contact_segments")
    .select("rules, rule_operator")
    .eq("id", segmentId)
    .single();

  if (!segment) return { contactIds: [], count: 0 };

  const rules = segment.rules as SegmentRule[];
  const contactIds = await getMatchingContactIds(rules, segment.rule_operator || "AND");

  // Update count
  await tc
    .from("contact_segments")
    .update({ contact_count: contactIds.length, updated_at: new Date().toISOString() })
    .eq("id", segmentId);

  return { contactIds, count: contactIds.length };
}

export async function bulkEnroll(contactIds: string[], workflowId: string) {
  const tc = await getAuthenticatedTenantClient();
  let enrolled = 0;
  let failed = 0;
  const errors: string[] = [];

  // Batch check: fetch all existing active enrollments in one query (fixes N+1)
  const { data: existingEnrollments } = await tc
    .from("workflow_enrollments")
    .select("contact_id")
    .eq("workflow_id", workflowId)
    .eq("status", "active")
    .in("contact_id", contactIds);

  const alreadyEnrolled = new Set(
    (existingEnrollments || []).map((e: { contact_id: string }) => e.contact_id)
  );

  const toEnroll = contactIds.filter((id) => !alreadyEnrolled.has(id));

  for (const contactId of toEnroll) {
    const { error: insertError } = await tc.from("workflow_enrollments").insert({
      contact_id: contactId,
      workflow_id: workflowId,
      status: "active",
      current_step: 1,
      next_run_at: new Date().toISOString(),
    });

    if (insertError) {
      failed++;
      errors.push(`Contact ${contactId}: ${insertError.message}`);
      console.error("[bulkEnroll] Failed to enroll contact:", contactId, insertError.message);
    } else {
      enrolled++;
    }
  }

  revalidatePath("/automations");
  return { enrolled, failed, errors, total: contactIds.length };
}

async function evaluateSegmentRules(rules: SegmentRule[], operator: string): Promise<number> {
  const contactIds = await getMatchingContactIds(rules, operator);
  return contactIds.length;
}

async function getMatchingContactIds(rules: SegmentRule[], operator: string): Promise<string[]> {
  const tc = await getAuthenticatedTenantClient();

  if (rules.length === 0) {
    const { data } = await tc.from("contacts").select("id");
    return (data || []).map((c: { id: string }) => c.id);
  }

  // For AND: intersect results. For OR: union results.
  const ruleSets: Set<string>[] = [];

  for (const rule of rules) {
    let query = tc.from("contacts").select("id");

    switch (rule.field) {
      case "type":
        query = query.eq("type", rule.value);
        break;
      case "stage_bar":
        query = query.eq("stage_bar", rule.value);
        break;
      case "lead_status":
        query = query.eq("lead_status", rule.value);
        break;
      case "newsletter_unsubscribed":
        query = query.eq("newsletter_unsubscribed", rule.value === "true");
        break;
      case "engagement_score_gt":
        // Can't directly filter JSONB with PostgREST easily, so fetch all and filter
        break;
      default:
        // Tag-based: check if tags array contains value
        if (rule.field === "tags") {
          query = query.contains("tags", [rule.value]);
        }
    }

    const { data } = await query;
    ruleSets.push(new Set((data || []).map((c: { id: string }) => c.id)));
  }

  if (ruleSets.length === 0) return [];

  if (operator === "OR") {
    const union = new Set<string>();
    for (const s of ruleSets) {
      for (const id of s) union.add(id);
    }
    return [...union];
  }

  // AND: intersect
  let result = ruleSets[0];
  for (let i = 1; i < ruleSets.length; i++) {
    result = new Set([...result].filter(id => ruleSets[i].has(id)));
  }
  return [...result];
}
