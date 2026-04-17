import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { extractVoiceRules } from "@/lib/voice-learning";

export async function POST(req: Request) {
  try {
    // Authenticate and get tenant-scoped client
    let tc;
    try {
      tc = await getAuthenticatedTenantClient();
    } catch {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      newsletterId,
      editedSubject,
      editedBody,
      originalSubject,
      originalBody,
    } = body;

    if (!newsletterId) {
      return NextResponse.json(
        { error: "newsletterId is required" },
        { status: 400 }
      );
    }

    // Use authenticated realtor ID — never accept from request body
    const realtorId = tc.realtorId;

    // H4: Verify ownership before updating — only the owning realtor can edit
    const { data: existing, error: fetchError } = await tc
      .from("newsletters")
      .select("id")
      .eq("id", newsletterId)
      .eq("realtor_id", realtorId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Newsletter not found or access denied" },
        { status: 403 }
      );
    }

    // H4 + H8: Update the newsletter record first, then run voice learning only on success
    const { error: updateError } = await tc
      .from("newsletters")
      .update({
        subject: editedSubject,
        html_body: editedBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId)
      .eq("realtor_id", realtorId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update newsletter: ${updateError.message}` },
        { status: 500 }
      );
    }

    // H8: Extract voice rules AFTER confirmed successful DB update
    const newRules = await extractVoiceRules(
      realtorId,
      originalSubject || "",
      originalBody || "",
      editedSubject || "",
      editedBody || ""
    );

    return NextResponse.json({
      success: true,
      newsletterId,
      rulesExtracted: newRules?.length ?? 0,
    });
  } catch (error) {
    console.error("Newsletter edit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
