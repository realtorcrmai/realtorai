// SOC 2 CC6.6 — MFA disable endpoint
//
// POST /api/auth/mfa/disable
//   Soft-disable MFA for the authenticated user. Body MUST include a
//   currently-valid TOTP code or backup code — disabling MFA is a
//   security-sensitive action and must require possession of the
//   second factor, not just the session cookie. (A stolen session
//   without the device should not be able to drop MFA.)
//
//   On success the row's disabled_at = now(); enrolled_at and
//   backup_codes are retained for audit. Re-enabling later requires
//   a fresh enrollment (new secret, new backup codes).
//
// Audit:
//   - MFA_DISABLED on success (severity: warning — privileged action)
//   - MFA_FAILED on a bad code (do NOT disable; let the user retry)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyChallenge, disableMfa, getMfaRow } from "@/lib/mfa";
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

  // Same cap as verify — disable is just verify + a flag flip.
  if (!checkRateLimit(`mfa-disable:${session.user.id}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: unknown;
  };
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

  // Pre-flight — must be currently enrolled to disable.
  const row = await getMfaRow(session.user.id);
  if (!row || !row.enrolled_at || row.disabled_at) {
    return NextResponse.json(
      { error: "MFA is not active for this account" },
      { status: 409 }
    );
  }

  // Require a currently-valid second-factor code BEFORE disabling.
  const challenge = await verifyChallenge(session.user.id, code);
  if (!challenge.ok) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.MFA_FAILED,
      severity: "warning",
      actor: { id: session.user.id, email: session.user.email },
      resource: { type: "mfa_credentials", id: session.user.id },
      tenantId: session.user.id,
      metadata: {
        source: "api",
        endpoint: "/api/auth/mfa/disable",
        reason: challenge.reason ?? "invalid_code",
        success: false,
      },
      ip,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 422 });
  }

  const result = await disableMfa(session.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to disable MFA" },
      { status: 500 }
    );
  }

  await logAuditEvent({
    action: AUDIT_ACTIONS.MFA_DISABLED,
    severity: "warning",
    actor: { id: session.user.id, email: session.user.email },
    resource: { type: "mfa_credentials", id: session.user.id },
    tenantId: session.user.id,
    metadata: {
      source: "api",
      endpoint: "/api/auth/mfa/disable",
      success: true,
      ...(challenge.usedBackupCode ? { reason: "backup_code_used" } : {}),
    },
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true });
}
