import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { site_id, lead_type, source_page, form_data } = body;

  if (!site_id || !lead_type || !form_data) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Create contact in CRM if name + contact info provided
  const name = form_data.name || form_data.full_name || "Website Visitor";
  const phone = form_data.phone || null;
  const email = form_data.email || null;
  let contactId: string | null = null;

  if (name && (phone || email)) {
    let query = supabase.from("contacts").select("id");
    if (email) query = query.eq("email", email);
    else if (phone) query = query.eq("phone", phone);
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      contactId = existing.id;
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({ name, phone, email, type: "buyer", pref_channel: "sms", notes: `Website lead (${lead_type})` })
        .select("id")
        .single();
      contactId = newContact?.id ?? null;
    }
  }

  const { data: lead, error } = await supabase
    .from("site_leads")
    .insert({ site_id, contact_id: contactId, lead_type, source_page, form_data, status: "new" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, lead });
}
