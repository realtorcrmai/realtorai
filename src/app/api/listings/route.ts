import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status")?.toLowerCase();

  let query = supabase
    .from("listings")
    .select("*, contacts(name, phone)")
    .order("created_at", { ascending: false });

  if (status && ["active", "pending", "sold"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

const createListingSchema = z.object({
  address: z.string().min(5),
  seller_id: z.string().uuid(),
  lockbox_code: z.string().min(1),
  status: z.enum(["active", "pending", "sold"]).default("active"),
  mls_number: z.string().optional(),
  list_price: z.number().positive().optional(),
  showing_window_start: z.string().optional(),
  showing_window_end: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = createListingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...parsed.data,
      list_price: parsed.data.list_price ?? null,
      mls_number: parsed.data.mls_number || null,
      showing_window_start: parsed.data.showing_window_start || null,
      showing_window_end: parsed.data.showing_window_end || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
