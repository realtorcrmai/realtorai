import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "@/actions/calendar";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const events = await getCalendarEvents(start, end);
    return NextResponse.json(events);
  } catch (err) {
    console.error("Calendar events API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
