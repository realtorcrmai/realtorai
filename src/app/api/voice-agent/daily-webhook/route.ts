import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

/**
 * Daily.co webhook handler — receives room events (participant joined/left, recording ready).
 * Configure in Daily.co dashboard: POST https://your-domain/api/voice-agent/daily-webhook
 *
 * Validates webhook signature using DAILY_WEBHOOK_SECRET for security.
 */
export async function POST(request: Request) {
  // Validate Daily.co webhook signature
  const signature = request.headers.get("x-daily-signature");
  const webhookSecret = process.env.DAILY_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
    }

    const rawBody = await request.clone().text();
    const expectedSig = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSig && signature !== `v0=${expectedSig}`) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  const body = await request.json();
  const { event, payload } = body;

  const supabase = createAdminClient();

  switch (event) {
    case "participant.joined": {
      const roomName = payload?.room_name;
      if (roomName) {
        await supabase
          .from("voice_sessions")
          .update({ status: "active", last_activity_at: new Date().toISOString() })
          .eq("daily_room_name", roomName);
      }
      break;
    }

    case "participant.left": {
      const roomName = payload?.room_name;
      if (roomName) {
        await supabase
          .from("voice_sessions")
          .update({ status: "idle", last_activity_at: new Date().toISOString() })
          .eq("daily_room_name", roomName)
          .eq("status", "active");
      }
      break;
    }

    case "room.exp": {
      const roomName = payload?.room_name;
      if (roomName) {
        await supabase
          .from("voice_sessions")
          .update({
            status: "expired",
            ended_at: new Date().toISOString(),
          })
          .eq("daily_room_name", roomName);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
