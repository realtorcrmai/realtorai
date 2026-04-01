"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export async function getRecommendations() {
  const tc = await getAuthenticatedTenantClient();

  const { data } = await tc
    .from("agent_recommendations")
    .select("*, contacts(id, name, email, phone, type, stage_bar)")
    .eq("status", "pending")
    .order("priority", { ascending: true }) // hot first
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
}

export async function dismissRecommendation(id: string) {
  const tc = await getAuthenticatedTenantClient();

  await tc
    .from("agent_recommendations")
    .update({ status: "dismissed" })
    .eq("id", id);

  revalidatePath("/");
  return { success: true };
}

export async function acceptRecommendation(id: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data: rec } = await tc
    .from("agent_recommendations")
    .select("*")
    .eq("id", id)
    .single();

  if (!rec) return { error: "Recommendation not found" };

  // Execute based on action type
  switch (rec.action_type) {
    case "send_email": {
      // Generate a newsletter draft (always review mode)
      const { generateAndQueueNewsletter } = await import("@/actions/newsletters");
      const emailType = (rec.action_config as any)?.email_type || "market_update";
      await generateAndQueueNewsletter(rec.contact_id, emailType, "lead", undefined, "review");
      break;
    }
    case "advance_stage": {
      const newStage = (rec.action_config as any)?.new_stage;
      if (newStage) {
        await tc.from("contacts").update({ stage_bar: newStage }).eq("id", rec.contact_id);
      }
      break;
    }
    case "create_task": {
      await tc.from("tasks").insert({
        contact_id: rec.contact_id,
        title: (rec.action_config as any)?.title || `Follow up: ${rec.reasoning.slice(0, 50)}`,
        priority: rec.priority === "hot" ? "urgent" : "medium",
        status: "pending",
        category: "follow_up",
      });
      break;
    }
    case "add_tag": {
      const tag = (rec.action_config as any)?.tag;
      if (tag) {
        const { data: contact } = await tc.from("contacts").select("tags").eq("id", rec.contact_id).single();
        const tags = Array.isArray(contact?.tags) ? contact.tags : [];
        if (!tags.includes(tag)) {
          await tc.from("contacts").update({ tags: [...tags, tag] }).eq("id", rec.contact_id);
        }
      }
      break;
    }
  }

  // Mark as accepted
  await tc
    .from("agent_recommendations")
    .update({ status: "accepted" })
    .eq("id", id);

  revalidatePath("/");
  return { success: true, action: rec.action_type };
}
