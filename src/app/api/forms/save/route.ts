import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const saveFormSchema = z.object({
  listingId: z.string().uuid(),
  formKey: z.string().min(1).max(100),
  formData: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/forms/save
 * Body: { listingId: string, formKey: string, formData: Record<string, unknown> }
 *
 * Upserts a form_submissions row as 'draft' with the field values as JSON.
 * Called by auto-save (every 30s) and the manual "Save Draft" button.
 */
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const parsed = saveFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { listingId, formKey, formData } = parsed.data;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("form_submissions")
      .upsert(
        {
          listing_id: listingId,
          form_key: formKey,
          form_data: formData,
          status: "draft",
        },
        { onConflict: "listing_id,form_key" }
      )
      .select("id, updated_at")
      .single();

    if (error) {
      console.error("[/api/forms/save] Upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      savedAt: data.updated_at,
    });
  } catch (err) {
    console.error("[/api/forms/save]", err);
    return NextResponse.json(
      { error: "Failed to save form draft" },
      { status: 500 }
    );
  }
}
