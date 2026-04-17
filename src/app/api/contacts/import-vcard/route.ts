import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { parseVCard } from "@/lib/vcard-parser";

/**
 * POST /api/contacts/import-vcard
 * Import contacts from vCard (.vcf) file.
 * Supports vCard 2.1, 3.0, 4.0 — single or multi-contact files.
 * Skips contacts with duplicate phone numbers or no phone.
 */
export async function POST(request: NextRequest) {
  const tc = await getAuthenticatedTenantClient();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (10MB max)" }, { status: 413 });
  }

  const text = await file.text();

  if (!text.toUpperCase().includes("BEGIN:VCARD")) {
    return NextResponse.json(
      { error: "Invalid vCard file — no BEGIN:VCARD found" },
      { status: 400 }
    );
  }

  const parsed = parseVCard(text);

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No contacts found in vCard file" },
      { status: 400 }
    );
  }

  if (parsed.length > 1000) {
    return NextResponse.json(
      { error: `Too many contacts (${parsed.length}). Maximum 1000 per import.` },
      { status: 400 }
    );
  }

  // Get existing phones to skip duplicates
  const { data: existing } = await tc.from("contacts").select("phone");
  const existingPhones = new Set(
    (existing ?? []).map((c: { phone: string }) => c.phone).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const vc = parsed[i];

    // Skip contacts without phone
    if (!vc.phone) {
      skipped++;
      continue;
    }

    // Skip duplicates
    if (existingPhones.has(vc.phone)) {
      skipped++;
      continue;
    }

    const contact: Record<string, string> = {
      name: vc.name,
      phone: vc.phone,
      type: vc.type || "buyer",
      pref_channel: "sms",
    };

    if (vc.email) contact.email = vc.email;
    if (vc.address) contact.address = vc.address;
    if (vc.notes) contact.notes = vc.notes;
    if (vc.organization) {
      contact.notes = vc.notes
        ? `${vc.notes} | Org: ${vc.organization}`
        : `Org: ${vc.organization}`;
    }

    const { error } = await tc.from("contacts").insert(contact);
    if (error) {
      errors.push(`Contact "${vc.name}": ${error.message}`);
    } else {
      imported++;
      existingPhones.add(vc.phone);
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    errors: errors.slice(0, 10),
    total: parsed.length,
  });
}
