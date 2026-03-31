import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteRoom } from "@/lib/daily-webrtc";

export const maxDuration = 60;

/**
 * Voice Session Cleanup Cron
 * Schedule: Every 30 minutes
 * - Expires sessions idle >30 minutes
 * - Deletes associated Daily.co rooms
 * - Updates status to 'expired'
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Find stale active sessions
    const { data: staleSessions, error: fetchError } = await supabase
      .from("voice_sessions")
      .select("id, daily_room_name, agent_email")
      .eq("status", "active")
      .lt("last_activity_at", thirtyMinutesAgo);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!staleSessions || staleSessions.length === 0) {
      return NextResponse.json({ expired: 0, rooms_deleted: 0 });
    }

    let roomsDeleted = 0;

    // Expire each session and clean up Daily.co rooms
    for (const session of staleSessions) {
      // Update status to expired
      await supabase
        .from("voice_sessions")
        .update({
          status: "expired",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      // Delete Daily.co room if exists
      if (session.daily_room_name) {
        try {
          await deleteRoom(session.daily_room_name);
          roomsDeleted++;
        } catch {
          // Room may already be expired/deleted — non-blocking
        }
      }
    }

    return NextResponse.json({
      expired: staleSessions.length,
      rooms_deleted: roomsDeleted,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
