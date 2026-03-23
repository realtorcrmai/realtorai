import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { syncAllPublicTemplates } from "@/lib/forms/template-sync";

/**
 * POST /api/forms/templates/sync
 * Downloads and updates all publicly available form templates.
 * Currently: FINTRAC Individual Identification Record.
 */
export async function POST() {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const results = await syncAllPublicTemplates();
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[/api/forms/templates/sync]", err);
    return NextResponse.json(
      { error: "Failed to sync templates" },
      { status: 500 }
    );
  }
}
