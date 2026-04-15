"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

/**
 * Find potential duplicate contacts by matching email or phone.
 */
export async function findDuplicates() {
  const tc = await getAuthenticatedTenantClient();

  // Get all contacts with email or phone
  const { data: contactsRaw } = await tc
    .from("contacts")
    .select("id, name, email, phone, type, created_at, stage_bar, lead_status")
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = (contactsRaw ?? []) as any[];
  if (contacts.length === 0) return [];

  const groups: Map<string, typeof contacts> = new Map();

  for (const c of contacts) {
    // Group by normalized phone
    if (c.phone) {
      const normPhone = c.phone.replace(/\D/g, "").slice(-10);
      if (normPhone.length === 10) {
        const key = `phone:${normPhone}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }
    }

    // Group by email (case-insensitive)
    if (c.email) {
      const normEmail = c.email.toLowerCase().trim();
      const key = `email:${normEmail}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
  }

  // Only return groups with 2+ contacts (actual duplicates)
  const duplicates: { matchType: string; matchValue: string; contacts: typeof contacts }[] = [];
  const seenPairs = new Set<string>();

  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    // Deduplicate: sort IDs and create a pair key
    const ids = group.map((c) => c.id).sort().join(",");
    if (seenPairs.has(ids)) continue;
    seenPairs.add(ids);

    const [matchType, matchValue] = key.split(":", 2);
    duplicates.push({ matchType, matchValue, contacts: group });
  }

  return duplicates;
}

/**
 * Merge two contacts: keep the primary, move all related data from secondary, delete secondary.
 * Primary keeps its own fields but fills in blanks from secondary.
 */
export async function mergeContacts(primaryId: string, secondaryId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Fetch both contacts
  const [{ data: primary }, { data: secondary }] = await Promise.all([
    tc.from("contacts").select("*").eq("id", primaryId).single(),
    tc.from("contacts").select("*").eq("id", secondaryId).single(),
  ]);

  if (!primary || !secondary) {
    return { error: "One or both contacts not found" };
  }

  // Fill in blank fields on primary from secondary
  const updates: Record<string, unknown> = {};
  const fillable = ["email", "address", "notes", "source", "company_name", "job_title", "tags"] as const;
  for (const field of fillable) {
    const pVal = primary[field as keyof typeof primary];
    const sVal = secondary[field as keyof typeof secondary];
    if ((!pVal || pVal === "") && sVal && sVal !== "") {
      updates[field] = sVal;
    }
  }

  // Merge notes if both have them
  if (primary.notes && secondary.notes && primary.notes !== secondary.notes) {
    updates.notes = `${primary.notes}\n\n--- Merged from ${secondary.name} ---\n${secondary.notes}`;
  }

  // Merge tags arrays
  const pTags = Array.isArray(primary.tags) ? primary.tags : [];
  const sTags = Array.isArray(secondary.tags) ? secondary.tags : [];
  if (sTags.length > 0) {
    updates.tags = [...new Set([...pTags, ...sTags])];
  }

  // Merge newsletter_intelligence (keep higher engagement score)
  const pIntel = (primary.newsletter_intelligence as Record<string, unknown>) || {};
  const sIntel = (secondary.newsletter_intelligence as Record<string, unknown>) || {};
  if (Object.keys(sIntel).length > 0) {
    const pScore = (pIntel.engagement_score as number) || 0;
    const sScore = (sIntel.engagement_score as number) || 0;
    if (sScore > pScore) {
      updates.newsletter_intelligence = { ...pIntel, ...sIntel };
    }
  }

  // Update primary with merged fields
  if (Object.keys(updates).length > 0) {
    await tc.from("contacts").update(updates).eq("id", primaryId);
  }

  // Move all related records from secondary to primary.
  // NOTE: Supabase JS doesn't support transactions, so we wrap in try-catch
  // and log which tables succeeded for manual recovery if a step fails.
  const movedTables: string[] = [];
  try {
    const tables = [
      "communications",
      "newsletters",
      "newsletter_events",
      "contact_journeys",
      "workflow_enrollments",
      "tasks",
      "agent_recommendations",
      "agent_decisions",
      "contact_dates",
      "contact_documents",
    ];

    for (const table of tables) {
      const { error } = await tc
        .from(table)
        .update({ contact_id: primaryId })
        .eq("contact_id", secondaryId);
      if (error) {
        console.error(`[contact-merge] Failed to move ${table}:`, error.message);
        // Continue — some tables may not have rows for this contact
      }
      movedTables.push(table);
    }

    // Move appointments (buyer_contact_id)
    await tc
      .from("appointments")
      .update({ buyer_contact_id: primaryId })
      .eq("buyer_contact_id", secondaryId);
    movedTables.push("appointments");

    // Move listings (seller_id)
    await tc
      .from("listings")
      .update({ seller_id: primaryId })
      .eq("seller_id", secondaryId);
    movedTables.push("listings");

    // Move referrals (prevent circular reference by excluding primaryId)
    await tc
      .from("contacts")
      .update({ referred_by_id: primaryId })
      .eq("referred_by_id", secondaryId)
      .neq("id", primaryId);
    movedTables.push("referrals");

    // Delete secondary
    await tc.from("contacts").delete().eq("id", secondaryId);
  } catch (err) {
    console.error("[contact-merge] Partial merge — succeeded tables:", movedTables, "Error:", err);
    return {
      error: `Merge partially failed after moving: ${movedTables.join(", ")}. Secondary contact may still exist. Please check manually.`,
    };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${primaryId}`);

  return {
    ok: true,
    primaryId,
    deletedId: secondaryId,
    fieldsMerged: Object.keys(updates),
  };
}
