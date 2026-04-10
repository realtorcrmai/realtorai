import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function POST(req: Request) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { contactId, instructionText, instructionType } = await req.json();
    if (!contactId || !instructionText) {
      return NextResponse.json({ error: "contactId and instructionText required" }, { status: 400 });
    }

    const { data, error } = await tc
      .from("contact_instructions")
      .insert({
        contact_id: contactId,
        instruction_text: instructionText,
        instruction_type: instructionType || "constraint",
        is_active: true,
      })
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

export async function DELETE(req: Request) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await tc
      .from("contact_instructions")
      .update({ is_active: false })
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
