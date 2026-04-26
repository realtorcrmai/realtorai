// SOC 2 CC6.6 — MFA enrollment endpoint
//
// POST /api/auth/mfa/enroll
//   Begin (or restart) TOTP enrollment for the authenticated user.
//   Returns the otpauth:// URL (for QR rendering) + 10 backup codes
//   exactly ONCE. The caller must surface them to the user immediately;
//   the server keeps only encrypted copies.
//
//   This endpoint does NOT enable MFA — it only seeds a row with
//   enrolled_at = NULL. The user must POST /api/auth/mfa/verify with
//   their first 6-digit code to flip enrolled_at = now().
//
// Audit: MFA_ENROLLED is logged on the *start* of enrollment so the
// trail captures intent even if the user abandons the flow. A separate
// MFA_VERIFIED is logged when the verify step succeeds.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startEnrollment } from "@/lib/mfa";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

// In-memory rate limiter (resets on cold start). Keeps abusive clients
// from spamming new secrets to flood the audit log.
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
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 5 enroll starts per hour per user — generous enough for legitimate
  // retries (camera issues, app re-installs) without enabling abuse.
  if (!checkRateLimit(`mfa-enroll:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many enrollment attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    const { otpauthUrl, backupCodes } = await startEnrollment(
      session.user.id,
      session.user.email
    );

    await logAuditEvent({
      action: AUDIT_ACTIONS.MFA_ENROLLED,
      severity: "info",
      actor: { id: session.user.id, email: session.user.email },
      resource: { type: "mfa_credentials", id: session.user.id },
      tenantId: session.user.id,
      metadata: { source: "api", endpoint: "/api/auth/mfa/enroll" },
      ip,
      userAgent,
    });

    // NOTE: `secret` (raw base32) is intentionally NOT returned. Clients
    // should render the QR from otpauthUrl. Manual entry is supported by
    // having the client extract the secret from the otpauth URL itself.
    return NextResponse.json({
      otpauthUrl,
      backupCodes, // plaintext, one-shot — never returned again
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mfa-enroll] error", message);
    return NextResponse.json(
      { error: "Failed to start MFA enrollment" },
      { status: 500 }
    );
  }
}
