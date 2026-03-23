import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PUT /api/forms/templates/:formKey/mapping
 * Body: { field_mapping: Record<string, string> }
 *
 * Updates the field_mapping JSONB on a form template.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { formKey } = await params;
    const { field_mapping } = await req.json();

    if (!field_mapping || typeof field_mapping !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid field_mapping" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("form_templates")
      .update({ field_mapping })
      .eq("form_key", formKey);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/forms/templates/mapping]", err);
    return NextResponse.json(
      { error: "Failed to update field mapping" },
      { status: 500 }
    );
  }
}
