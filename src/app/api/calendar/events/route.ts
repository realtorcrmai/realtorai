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

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return NextResponse.json(
      { error: "start and end must be valid ISO date strings" },
      { status: 400 }
    );
  }
  if (startTime > endTime) {
    return NextResponse.json(
      { error: "start must be before end" },
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
