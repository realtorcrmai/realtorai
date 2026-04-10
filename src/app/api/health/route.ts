import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/health
 *
 * Public health check endpoint for post-deploy probes, uptime monitors,
 * and load balancer health checks. No auth required.
 *
 * Returns 200 with a JSON body if the app + database are healthy.
 * Returns 503 with details if any check fails.
 *
 * Checks:
 * 1. App is running (implicit — the handler is executing)
 * 2. Supabase is reachable (SELECT 1 against the DB)
 * 3. Required env vars are present (spot-check, not exhaustive)
 *
 * Added: 2026-04-09 (production readiness audit).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
  const start = Date.now();

  // 1. App alive — always true if we got here
  checks.app = { ok: true };

  // 2. Supabase reachable
  try {
    const dbStart = Date.now();
    const supabase = createAdminClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    const ms = Date.now() - dbStart;
    checks.database = error
      ? { ok: false, ms, error: error.message }
      : { ok: true, ms };
  } catch (err) {
    checks.database = {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }

  // 3. Env vars spot-check (never reveal values, just presence)
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
  ];
  const missingVars = requiredVars.filter((v) => !process.env[v]);
  checks.env = {
    ok: missingVars.length === 0,
    ...(missingVars.length > 0 && { error: `missing: ${missingVars.join(", ")}` }),
  };

  // Overall status
  const allOk = Object.values(checks).every((c) => c.ok);
  const totalMs = Date.now() - start;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
      totalMs,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    },
    { status: allOk ? 200 : 503 }
  );
}
