// SOC 2 CC6.6 — MFA session elevation endpoint
//
// POST /api/auth/mfa/elevate
//   Called from the /mfa-challenge page after the user enters their
//   second-factor code. On success, the response is 200; the client
//   then calls NextAuth's `update({ mfaVerified: true })` to flip the
//   JWT claim, after which the dashboard layout stops redirecting to
//   /mfa-challenge.
//
// Why a separate endpoint from /api/auth/mfa/verify?
//   - /verify handles enrollment confirmation AND ongoing challenges
//     in a single endpoint, but its semantics are "did this code
//     match?" — it doesn't know about session elevation.
//   - /elevate is specifically about elevating the *current session*.
//     Keeping the two endpoints separate makes the audit log easier
//     to read (MFA_VERIFIED here always means "session elevated at
//     login", not "user confirmed enrollment").
//
// Audit:
//   - MFA_VERIFIED on success
//   - MFA_FAILED on bad code
//
// Rate limit: 10 attempts per 15 minutes (same as /verify).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyChallenge, getMfaRow } from "@/lib/mfa";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!checkRateLimit(`mfa-elevate:${session.user.id}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code || code.length < 6 || code.length > 16) {
    return NextResponse.json(
      { error: "Invalid code format" },
      { status: 422 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Defensive: if the user somehow reached this endpoint without active
  // MFA, treat it as a 409 rather than silently succeeding.
  const row = await getMfaRow(session.user.id);
  if (!row || !row.enrolled_at || row.disabled_at) {
    return NextResponse.json(
      { error: "MFA is not active for this account" },
      { status: 409 }
    );
  }

  const result = await verifyChallenge(session.user.id, code);
  if (!result.ok) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.MFA_FAILED,
      severity: "warning",
      actor: { id: session.user.id, email: session.user.email },
      resource: { type: "mfa_credentials", id: session.user.id },
      tenantId: session.user.id,
      metadata: {
        source: "api",
        endpoint: "/api/auth/mfa/elevate",
        reason: result.reason ?? "invalid_code",
        success: false,
      },
      ip,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 422 });
  }

  await logAuditEvent({
    action: AUDIT_ACTIONS.MFA_VERIFIED,
    severity: "info",
    actor: { id: session.user.id, email: session.user.email },
    resource: { type: "mfa_credentials", id: session.user.id },
    tenantId: session.user.id,
    metadata: {
      source: "api",
      endpoint: "/api/auth/mfa/elevate",
      success: true,
      ...(result.usedBackupCode ? { reason: "backup_code_used" } : {}),
    },
    ip,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    usedBackupCode: result.usedBackupCode ?? false,
  });
}
