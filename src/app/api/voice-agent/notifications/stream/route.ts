import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const agentEmail = searchParams.get("agent_email");
  const lastEventId = request.headers.get("Last-Event-ID");

  if (!agentEmail) {
    return NextResponse.json({ error: "agent_email is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let eventCounter = parseInt(lastEventId ?? "0", 10);
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createAdminClient();

      // If reconnecting, replay missed notifications
      if (lastEventId) {
        const { data: missed } = await supabase
          .from("voice_notifications")
          .select("*")
          .eq("tenant_id", auth.tenantId)
          .eq("agent_email", agentEmail)
          .is("read_at", null)
          .order("created_at", { ascending: true });

        if (missed) {
          for (const notif of missed) {
            eventCounter++;
            const event = `id: ${eventCounter}\nevent: notification\ndata: ${JSON.stringify(notif)}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        }
      }

      // Poll for new notifications every 3 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const { data: notifications } = await supabase
            .from("voice_notifications")
            .select("*")
            .eq("tenant_id", auth.tenantId)
            .eq("agent_email", agentEmail)
            .is("sent_at", null)
            .order("priority", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(5);

          if (notifications && notifications.length > 0) {
            for (const notif of notifications) {
              eventCounter++;
              const event = `id: ${eventCounter}\nevent: notification\ndata: ${JSON.stringify(notif)}\n\n`;
              controller.enqueue(encoder.encode(event));

              // Mark as sent
              await supabase
                .from("voice_notifications")
                .update({ sent_at: new Date().toISOString() })
                .eq("id", notif.id)
                .eq("tenant_id", auth.tenantId);
            }
          }

          // Heartbeat every poll cycle
          eventCounter++;
          const heartbeat = `id: ${eventCounter}\nevent: heartbeat\ndata: {"status":"alive","time":"${new Date().toISOString()}"}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Connection may be closed
          clearInterval(interval);
        }
      }, 3000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
