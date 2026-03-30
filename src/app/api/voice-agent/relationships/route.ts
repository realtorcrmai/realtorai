import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createRelationshipSchema = z.object({
  contact_a_id: z.string().uuid(),
  contact_b_id: z.string().uuid(),
  relationship_type: z.enum([
    "spouse", "parent", "child", "sibling", "friend",
    "colleague", "neighbour", "referral", "other",
  ]),
  relationship_label: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/voice-agent/relationships
 * List relationships for a contact (both directions).
 * Query param: contact_id (required)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const supabase = createAdminClient();
    const params = req.nextUrl.searchParams;

    const contactId = params.get("contact_id");
    if (!contactId) {
      return NextResponse.json(
        { error: "contact_id query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch both directions and enrich with contact names
    const { data, error } = await supabase
      .from("contact_relationships")
      .select(`
        id, relationship_type, relationship_label, notes, created_at,
        contact_a_id, contact_b_id,
        contact_a:contacts!contact_relationships_contact_a_id_fkey(id, name, phone, email, type),
        contact_b:contacts!contact_relationships_contact_b_id_fkey(id, name, phone, email, type)
      `)
      .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalise: always present the "other" contact from the perspective of contact_id
    const relationships = (data ?? []).map((rel) => {
      const isA = rel.contact_a_id === contactId;
      const other = isA ? rel.contact_b : rel.contact_a;
      return {
        id: rel.id,
        relationship_type: rel.relationship_type,
        relationship_label: rel.relationship_label,
        notes: rel.notes,
        created_at: rel.created_at,
        related_contact: other,
        direction: isA ? "a_to_b" : "b_to_a",
      };
    });

    return NextResponse.json({ relationships, count: relationships.length });
  } catch (err) {
    console.error("[voice-agent] relationships GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/voice-agent/relationships
 * Create a relationship between two contacts.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const body = await req.json();
    const parsed = createRelationshipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.contact_a_id === parsed.data.contact_b_id) {
      return NextResponse.json(
        { error: "A contact cannot have a relationship with themselves" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("contact_relationships")
      .insert({
        contact_a_id: parsed.data.contact_a_id,
        contact_b_id: parsed.data.contact_b_id,
        relationship_type: parsed.data.relationship_type,
        relationship_label: parsed.data.relationship_label ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select("id, relationship_type, relationship_label, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A relationship between these contacts already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, relationship_type: data.relationship_type }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("[voice-agent] relationships POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/voice-agent/relationships
 * Delete a relationship by id (query param: id).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const params = req.nextUrl.searchParams;
    const id = params.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("contact_relationships")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[voice-agent] relationships DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
