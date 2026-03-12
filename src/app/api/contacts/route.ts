import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search");
  const type = searchParams.get("type");

  let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (type && (type === "buyer" || type === "seller")) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const createContactSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["buyer", "seller"]),
  pref_channel: z.enum(["whatsapp", "sms"]).default("sms"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
