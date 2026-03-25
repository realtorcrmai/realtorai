import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractVoiceRules } from "@/lib/voice-learning";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      newsletterId,
      editedSubject,
      editedBody,
      originalSubject,
      originalBody,
      realtorId,
    } = body;

    if (!newsletterId || !realtorId) {
      return NextResponse.json(
        { error: "newsletterId and realtorId are required" },
        { status: 400 }
      );
    }

    // 1. Extract voice rules from the edit diff
    const newRules = await extractVoiceRules(
      realtorId,
      originalSubject || "",
      originalBody || "",
      editedSubject || "",
      editedBody || ""
    );

    // 2. Update the newsletter record with edited content
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
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
