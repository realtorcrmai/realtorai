import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseVCard } from "@/lib/contacts/vcard-parser";
import { auth } from "@/lib/auth";

/**
 * POST with multipart/form-data → parse vCard and return preview
 * POST with application/json → import selected contacts
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const supabase = createAdminClient();

  // ── Upload mode: parse vCard file → return preview ──
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name.endsWith(".vcf")) {
      return NextResponse.json({ error: "Please upload a .vcf file" }, { status: 422 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 422 });
    }

    const vcfContent = await file.text();
    const contacts = parseVCard(vcfContent);

    // Dedup against existing contacts
    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .eq("realtor_id", session.user.id)
      .not("email", "is", null);

    const existingEmails = new Set(
      (existing || []).map((c) => c.email?.toLowerCase()).filter(Boolean)
    );

    const contactsWithDedup = contacts.map((c) => ({
      ...c,
      already_exists: c.email ? existingEmails.has(c.email.toLowerCase()) : false,
    }));

    return NextResponse.json({
      contacts: contactsWithDedup,
      total: contacts.length,
      duplicates: contactsWithDedup.filter((c) => c.already_exists).length,
    });
  }

  // ── Import mode: insert selected contacts ──
  const { contacts } = await request.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 422 });
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch.map((c: Record<string, string>) => ({
      realtor_id: session.user.id,
      name: c.name || "Unknown",
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      type: "lead",
      source: "apple_import",
      is_sample: false,
    }));

    const { data, error } = await supabase
      .from("contacts")
      .upsert(rows, { onConflict: "realtor_id,email", ignoreDuplicates: true })
      .select("id");

    if (data) imported += data.length;
    if (error) skipped += batch.length;
  }

  if (imported > 0) {
    await supabase.from("contacts").delete()
      .eq("realtor_id", session.user.id).eq("is_sample", true);
  }

  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "contacts_imported",
    metadata: { source: "apple", imported, skipped, total: contacts.length },
  });

  return NextResponse.json({ imported, skipped, total: contacts.length });
}
