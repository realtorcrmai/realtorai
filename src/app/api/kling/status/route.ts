import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getTaskStatus } from "@/lib/kling/client";

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
    const status = await getTaskStatus(taskId);
    return NextResponse.json(status);
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
