import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, section, rating, tags, comment, event_type } = body;

    const supabase = await createClient();

    const { error } = await supabase.from("help_events").insert({
      event_type: event_type || "feedback",
      slug,
      data: { rating, tags, comment, section },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
