// SOC 2 CC6.6 — MFA verification endpoint
//
// POST /api/auth/mfa/verify
//   Verify a 6-digit TOTP code OR an 8-char backup code for the
//   authenticated user. Two flows share this endpoint:
//
//   1. First-time confirmation (enrolled_at IS NULL):
//        TOTP only — flips enrolled_at = now() on success.
//        Backup codes are NOT accepted here; they only become valid
//        once enrollment is confirmed.
//
//   2. Ongoing challenge (enrolled_at IS NOT NULL):
//        TOTP first, then backup-code fallback. Used at login (D3) and
//        before destructive operations (e.g., disable MFA).
//
// Audit:
//   - MFA_VERIFIED on success (severity: info)
//   - MFA_FAILED on every wrong code (severity: warning)
//   Do NOT log the code itself — even hashed. The action name is enough.
//
// Rate limit: 10 attempts per 15 minutes. Stricter than enroll because
// each call here is a brute-force attempt against the second factor.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmEnrollment, verifyChallenge, getMfaRow } from "@/lib/mfa";
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

  if (!checkRateLimit(`mfa-verify:${session.user.id}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: unknown;
  };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  // Reject obviously malformed input early so bad clients don't pollute
  // the audit log with MFA_FAILED noise on every keystroke.
  if (!code || code.length < 6 || code.length > 16) {
    return NextResponse.json(
      { error: "Invalid code format" },
      { status: 422 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Branch on enrollment state — a single endpoint avoids leaking
  // "user has already enrolled" vs "user hasn't enrolled" via 404s.
  const row = await getMfaRow(session.user.id);
  if (!row) {
    return NextResponse.json(
      { error: "No MFA enrollment in progress" },
      { status: 409 }
    );
  }

  const isFirstTime = !row.enrolled_at;

  let result: { ok: boolean; reason?: string; usedBackupCode?: boolean };
  if (isFirstTime) {
    // First-time confirmation — TOTP only, no backup-code fallback.
    result = await confirmEnrollment(session.user.id, code);
  } else {
    result = await verifyChallenge(session.user.id, code);
  }

  if (!result.ok) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.MFA_FAILED,
      severity: "warning",
      actor: { id: session.user.id, email: session.user.email },
      resource: { type: "mfa_credentials", id: session.user.id },
      tenantId: session.user.id,
      metadata: {
        source: "api",
        endpoint: "/api/auth/mfa/verify",
        reason: result.reason ?? "invalid_code",
        success: false,
      },
      ip,
      userAgent,
    });
    return NextResponse.json(
      { error: "Invalid code" },
      { status: 422 }
    );
  }

  await logAuditEvent({
    action: AUDIT_ACTIONS.MFA_VERIFIED,
    severity: "info",
    actor: { id: session.user.id, email: session.user.email },
    resource: { type: "mfa_credentials", id: session.user.id },
    tenantId: session.user.id,
    metadata: {
      source: "api",
      endpoint: "/api/auth/mfa/verify",
      success: true,
      // Record whether a backup code was burned so an auditor can spot
      // a user running low. The code itself is not logged.
      ...(result.usedBackupCode ? { reason: "backup_code_used" } : {}),
    },
    ip,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    enrolled: !isFirstTime || true, // both branches end with enrolled = true
    usedBackupCode: result.usedBackupCode ?? false,
  });
}
