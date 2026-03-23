import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

const CONTENT_SERVICE_URL =
  process.env.CONTENT_GENERATOR_URL ?? "http://localhost:8769";

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();

    const res = await fetch(`${CONTENT_SERVICE_URL}/api/mls-remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate remarks",
      },
      { status: 500 }
    );
  }
}
