import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

interface NativeContactRow {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  source?: string;
}

/**
 * POST /api/contacts/import-native
 * Import contacts picked via the browser Contact Picker API.
 * Accepts a JSON array of contact objects (no file upload).
 * Deduplicates by phone (same logic as CSV import).
 */
export async function POST(request: NextRequest) {
  const tc = await getAuthenticatedTenantClient();

  const body = await request.json();
  const contacts: NativeContactRow[] = body?.contacts;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }
  if (contacts.length > 1000) {
    return NextResponse.json({ error: "Maximum 1000 contacts per import" }, { status: 400 });
  }

  // Fetch existing phones for dedup
  const { data: existing } = await tc.from("contacts").select("phone");
  const existingPhones = new Set(
    (existing ?? []).map((c: { phone: string }) => normalizePhone(c.phone || ""))
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of contacts) {
    const name = row.name?.trim();
    const phone = row.phone?.replace(/[^\d+]/g, "");
    if (!name) { skipped++; continue; }

    const normalized = normalizePhone(phone || "");

    if (!normalized) { skipped++; continue; }
    if (existingPhones.has(normalized)) { skipped++; continue; }

    const contact: Record<string, string | null> = {
      name,
      phone: normalized,
      type: "buyer",
      pref_channel: "sms",
      source: "native_contacts",
      email:   row.email   || null,
      address: row.address || null,
    };

    const { error } = await tc.from("contacts").insert(contact);
    if (error) {
      errors.push(`"${name}": ${error.message}`);
    } else {
      imported++;
      existingPhones.add(normalized);
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    referrals_linked: 0,
    families_linked: 0,
    errors: errors.slice(0, 10),
    total: contacts.length,
  });
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : digits ? `+${digits}` : "";
}
