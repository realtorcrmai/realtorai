import { NextResponse } from "next/server";
import { processEventBatch } from "@/lib/ai-agent/contact-evaluator";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = parseInt(process.env.AGENT_EVAL_BATCH_SIZE ?? "100", 10);

export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check kill switch
  if (process.env.AI_AGENT_ENABLED === "false") {
    return NextResponse.json({ ok: true, skipped: true, reason: "AI_AGENT_ENABLED=false" });
  }

  try {
    const result = await processEventBatch(BATCH_SIZE);
    return NextResponse.json({
      ok: true,
      ...result,
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
