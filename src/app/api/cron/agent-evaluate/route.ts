import { NextResponse } from "next/server";
import { processEventBatch } from "@/lib/ai-agent/contact-evaluator";
import { evaluateGreetings } from "@/lib/ai-agent/greeting-agent";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = parseInt(process.env.AGENT_EVAL_BATCH_SIZE ?? "100", 10);

export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check kill switch
  if (process.env.AI_AGENT_ENABLED === "false") {
    return NextResponse.json({ ok: true, skipped: true, reason: "AI_AGENT_ENABLED=false" });
  }

  try {
    // Process contact events (existing)
    const eventResult = await processEventBatch(BATCH_SIZE);

    // Evaluate greeting automations (new)
    let greetingResult = { candidates: 0, decisions: [] as any[], errors: 0 };
    try {
      greetingResult = await evaluateGreetings();
    } catch (e) {
      console.error("[cron/agent-evaluate] Greeting evaluation error:", e);
    }

    return NextResponse.json({
      ok: true,
      events: eventResult,
      greetings: {
        candidates: greetingResult.candidates,
        sent: greetingResult.decisions.filter(d => d.action === "send").length,
        skipped: greetingResult.decisions.filter(d => d.action === "skip").length,
        errors: greetingResult.errors,
      },
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/agent-evaluate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
