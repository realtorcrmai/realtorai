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

    // 1. Extract voice rules from the edit diff
    const newRules = await extractVoiceRules(
      realtorId,
      originalSubject || "",
      originalBody || "",
      editedSubject || "",
      editedBody || ""
    );

    // 2. Update the newsletter record with edited content (tenant-scoped)
    const { error: updateError } = await tc
      .from("newsletters")
      .update({
        subject: editedSubject,
        html_content: editedBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update newsletter: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newsletterId,
      rulesExtracted: newRules.length,
      newRules,
    });
  } catch (error) {
    console.error("Newsletter edit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
