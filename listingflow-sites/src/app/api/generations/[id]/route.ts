import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8768";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${AGENT_URL}/api/generations/${id}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Agent proxy error:", e);
    return NextResponse.json(
      { error: "Failed to connect to agent service" },
      { status: 502 }
    );
  }
}
