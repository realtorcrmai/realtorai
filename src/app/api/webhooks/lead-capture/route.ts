import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const leadCaptureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^[\d\s\-\(\)\+\.]+$/, "Invalid phone format"),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["buyer", "seller", "customer", "agent", "partner", "other"]).default("customer"),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("X-Webhook-Secret");
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized: invalid webhook secret" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = leadCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // Create the contact
  const { data: contact, error: insertError } = await supabase
    .from("contacts")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      type: parsed.data.type,
      source: parsed.data.source || "webhook",
      notes: parsed.data.notes || null,
      lead_status: "new",
      pref_channel: "sms",
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create contact", detail: insertError.message },
      { status: 500 }
    );
  }

  // Fire-and-forget: enroll in speed_to_contact workflow if it exists
  enrollInSpeedToContact(contact.id, parsed.data.type).catch(() => {
    // Silently ignore — webhook response should not be blocked
  });

  return NextResponse.json(
    { success: true, contact_id: contact.id },
    { status: 201 }
  );
}

async function enrollInSpeedToContact(
  contactId: string,
  contactType: string
): Promise<void> {
  try {
    const { fireTrigger } = await import("@/lib/workflow-triggers");
    await fireTrigger({
      type: "new_lead",
      contactId,
      contactType,
    });
  } catch {
    // Non-critical — don't propagate
  }
}
