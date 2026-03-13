import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const row = await req.json();
    const supabase = createAdminClient();

    // 1. Upsert seller contact
    let sellerId: string | null = null;
    if (row.sellerName && row.sellerPhone) {
      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .upsert(
          {
            name: row.sellerName,
            phone: row.sellerPhone,
            email: row.sellerEmail || null,
            type: "seller",
            pref_channel: "sms",
          },
          { onConflict: "phone" }
        )
        .select("id")
        .single();

      if (contactErr) throw new Error(`Contact: ${contactErr.message}`);
      sellerId = contact?.id ?? null;
    }

    // 2. Insert listing
    const validStatuses = ["active", "pending", "sold"];
    const normalizedStatus = (row.status ?? "").toLowerCase();
    const status = validStatuses.includes(normalizedStatus)
      ? normalizedStatus
      : "active";

    const { error: listingErr } = await supabase.from("listings").insert({
      address: row.address,
      seller_id: sellerId,
      lockbox_code: row.lockboxCode || "0000",
      status,
      mls_number: row.mlsNumber || null,
      list_price: row.listPrice || null,
      notes: row.notes || null,
    });

    if (listingErr) throw new Error(`Listing: ${listingErr.message}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[import-listing]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
