import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createHouseholdSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/voice-agent/households
 * List all households with member count.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const supabase = createAdminClient();
    const params = req.nextUrl.searchParams;

    const limit = params.get("limit");

    const { data, error } = await supabase
      .from("households")
      .select("id, name, address, notes, created_at, updated_at")
      .order("name", { ascending: true })
      .limit(limit ? Math.min(Number(limit), 100) : 50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ households: [], count: 0 });
    }

    // Fetch member counts for all households
    const householdIds = data.map((h) => h.id);
    const { data: memberCounts } = await supabase
      .from("contacts")
      .select("household_id")
      .in("household_id", householdIds);

    const countMap: Record<string, number> = {};
    for (const row of memberCounts ?? []) {
      if (row.household_id) {
        countMap[row.household_id] = (countMap[row.household_id] ?? 0) + 1;
      }
    }

    const households = data.map((h) => ({
      ...h,
      member_count: countMap[h.id] ?? 0,
    }));

    return NextResponse.json({ households, count: households.length });
  } catch (err) {
    console.error("[voice-agent] households GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/voice-agent/households
 * Create a new household.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const body = await req.json();
    const parsed = createHouseholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("households")
      .insert({
        name: parsed.data.name,
        address: parsed.data.address ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select("id, name, address, notes, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, name: data.name }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("[voice-agent] households POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
