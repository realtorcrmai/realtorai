"use server";

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  category: z.string().optional(),
  builder_json: z.record(z.string(), z.unknown()).optional(),
});

export async function getTemplates(category?: string) {
  const tc = await getAuthenticatedTenantClient();
  let query = tc
    .from("message_templates")
    .select("*")
    .eq("channel", "email")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return data || [];
}

export async function getTemplate(id: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function createTemplate(input: {
  name: string;
  subject: string;
  body: string;
  category?: string;
  builder_json?: Record<string, unknown>;
}) {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const tc = await getAuthenticatedTenantClient();
  const variables = extractVariables(input.body + " " + (input.subject || ""));

  const { data, error } = await tc
    .from("message_templates")
    .insert({
      name: input.name,
      channel: "email",
      subject: input.subject,
      body: input.body,
      variables,
      category: input.category || "custom",
      is_active: true,
      builder_json: input.builder_json || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/automations/templates");
  return { data };
}

export async function updateTemplate(id: string, input: {
  name?: string;
  subject?: string;
  body?: string;
  category?: string;
  builder_json?: Record<string, unknown>;
  html_preview?: string;
}) {
  const tc = await getAuthenticatedTenantClient();
  const updateData: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };

  if (input.body || input.subject) {
    updateData.variables = extractVariables((input.body || "") + " " + (input.subject || ""));
  }

  const { error } = await tc
    .from("message_templates")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/automations/templates");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const tc = await getAuthenticatedTenantClient();
  await tc.from("message_templates").update({ is_active: false }).eq("id", id);
  revalidatePath("/automations/templates");
  return { success: true };
}

export async function duplicateTemplate(id: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data: original } = await tc
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!original) return { error: "Template not found" };

  const { data, error } = await tc
    .from("message_templates")
    .insert({
      name: `${original.name} (Copy)`,
      channel: "email",
      subject: original.subject,
      body: original.body,
      variables: original.variables,
      category: original.category,
      builder_json: original.builder_json,
      is_active: true,
      is_ai_template: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/automations/templates");
  return { data };
}

export async function previewTemplate(id: string, sampleData?: Record<string, string>) {
  const tc = await getAuthenticatedTenantClient();
  const { data: template } = await tc
    .from("message_templates")
    .select("body, subject, builder_json")
    .eq("id", id)
    .single();

  if (!template) return { error: "Template not found" };

  const defaults: Record<string, string> = {
    contact_name: "Sarah Chen",
    contact_first_name: "Sarah",
    contact_email: "sarah@example.com",
    contact_phone: "604-555-0123",
    agent_name: "Your Name",
    listing_address: "123 Main St, Vancouver",
    listing_price: "$895,000",
    area: "Kitsilano",
    address: "123 Main St, Vancouver",
    ...sampleData,
  };

  let html = template.body;
  let subject = template.subject || "";
  for (const [key, value] of Object.entries(defaults)) {
    // HTML-escape user-provided sampleData values to prevent XSS
    const safeValue = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    html = html.replace(regex, safeValue);
    subject = subject.replace(regex, value); // subject is plain text, no HTML escaping
  }

  return { html, subject };
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, "")))];
}
