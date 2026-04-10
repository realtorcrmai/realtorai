import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function POST(req: Request) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { contactId, contextType, text } = await req.json();
    if (!contactId || !text) {
      return NextResponse.json({ error: "contactId and text required" }, { status: 400 });
    }

    const { data, error } = await tc
      .from("contact_context")
      .insert({ contact_id: contactId, context_type: contextType || "info", text })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { id, isResolved, resolvedNote } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await tc
      .from("contact_context")
      .update({ is_resolved: isResolved, resolved_note: resolvedNote || null })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
