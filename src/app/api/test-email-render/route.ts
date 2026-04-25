import { NextRequest, NextResponse } from "next/server";
import { assembleEmail, type EmailData } from "@/lib/email-blocks";

/**
 * Test-only endpoint — renders an email template with provided data.
 * Used by scripts/test-journey-emails.mjs for full HTML rendering tests.
 *
 * POST /api/test-email-render
 * Body: { emailType: string, data: EmailData, phase?: string }
 * Returns: { html: string }
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { emailType, data, phase } = body as {
      emailType: string;
      data: EmailData;
      phase?: string;
    };

    if (!emailType || !data) {
      return NextResponse.json({ error: "emailType and data are required" }, { status: 400 });
    }

    const html = assembleEmail(emailType, data, undefined, phase);

    return NextResponse.json({ html, length: html.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
