import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

const FORM_SERVER = process.env.FORM_SERVER_URL ?? "http://127.0.0.1:8767";

/**
 * POST /api/forms
 * Body: { form_key: string, listing: object, cfg: object }
 * Proxies to Python form server → returns HTML of the editable BC form.
 */
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const res = await fetch(`${FORM_SERVER}/api/form/html`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Form server error: ${err}` },
        { status: res.status }
      );
    }

    const html = await res.text();
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/forms]", err);
    return NextResponse.json(
      {
        error:
          "Could not reach the form server. Please ensure the Python form server is running (python server.py) and FORM_SERVER_URL is configured.",
      },
      { status: 503 }
    );
  }
}
