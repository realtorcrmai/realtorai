import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

const CONTENT_SERVICE_URL =
  process.env.CONTENT_GENERATOR_URL ?? "http://localhost:8769";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const taskId = req.nextUrl.searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { error: "Missing taskId parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${CONTENT_SERVICE_URL}/api/media/status?taskId=${encodeURIComponent(taskId)}`
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to check task status",
      },
      { status: 500 }
    );
  }
}
