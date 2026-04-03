import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/social/crypto";

/**
 * POST /api/contacts/sync/fub
 * Import contacts from Follow Up Boss using their API key
 * FUB API docs: https://docs.followupboss.com/
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const realtorId = (session.user as any).realtorId || session.user.id;
  if (!realtorId) {
    return NextResponse.json({ error: "No realtor ID" }, { status: 400 });
  }

  const { apiKey } = await request.json();
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API key is required" }, { status: 422 });
  }

  try {
    // Fetch contacts from FUB API
    const contacts: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `https://api.followupboss.com/v1/people?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({
          error: res.status === 401
            ? "Invalid API key. Check your Follow Up Boss API key."
            : `FUB API error: ${err}`,
        }, { status: res.status === 401 ? 401 : 500 });
      }

      const data = await res.json();
      if (!data.people || data.people.length === 0) break;

      contacts.push(...data.people);
      offset += limit;

      if (data.people.length < limit) break; // last page
      if (offset > 10000) break; // safety limit
    }

    // Import into CRM
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("contacts")
      .select("phone, sync_external_id")
      .eq("realtor_id", realtorId);

    const existingPhones = new Set((existing || []).map((c: any) => normalizePhone(c.phone || "")));
    const existingIds = new Set((existing || []).map((c: any) => c.sync_external_id).filter(Boolean));

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const fubContact of contacts) {
      const name = [fubContact.firstName, fubContact.lastName].filter(Boolean).join(" ");
      const phone = fubContact.phones?.[0]?.value;
      const email = fubContact.emails?.[0]?.value;
      const externalId = `fub_${fubContact.id}`;

      if (!name || !phone) {
        skipped++;
        continue;
      }

      if (existingIds.has(externalId)) {
        skipped++;
        continue;
      }

      const normalized = normalizePhone(phone);
      if (existingPhones.has(normalized)) {
        duplicates++;
        continue;
      }

      // Map FUB stage to our type
      const typeMap: Record<string, string> = {
        Buyer: "buyer",
        Seller: "seller",
        "Buyer/Seller": "buyer",
        Renter: "customer",
        Vendor: "partner",
      };

      const contact = {
        name,
        phone: normalized,
        email: email || null,
        type: typeMap[fubContact.stage] || "customer",
        pref_channel: "sms" as const,
        source: "follow_up_boss",
        sync_source: "fub",
        sync_external_id: externalId,
        notes: fubContact.tags?.length ? `Tags: ${fubContact.tags.join(", ")}` : null,
        realtor_id: realtorId,
      };

      const { error } = await supabase.from("contacts").insert(contact);
      if (error) {
        errors.push(`${name}: ${error.message}`);
      } else {
        imported++;
        existingPhones.add(normalized);
      }
    }

    // Save sync source
    await supabase.from("contact_sync_sources").upsert({
      realtor_id: realtorId,
      provider: "fub",
      provider_account_id: "api_key",
      provider_account_name: "Follow Up Boss",
      api_key_encrypted: encrypt(apiKey),
      is_active: true,
      auto_sync: false, // one-time import
      last_synced_at: new Date().toISOString(),
      total_synced: imported,
      total_duplicates_merged: duplicates,
      sync_error: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
    }, { onConflict: "realtor_id,provider,provider_account_id" });

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      duplicates,
      total: contacts.length,
      errors: errors.slice(0, 10),
      message: `Imported ${imported} contacts from Follow Up Boss. ${duplicates} duplicates skipped.`,
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to import from Follow Up Boss",
    }, { status: 500 });
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}
