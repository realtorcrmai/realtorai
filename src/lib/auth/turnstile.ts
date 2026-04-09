/**
 * Verify Cloudflare Turnstile token server-side.
 * Returns true if valid, false if invalid/expired.
 * Fails open (returns true) if Turnstile is down or not configured.
 */
export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Graceful degradation: if no secret configured, skip check
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn("[turnstile] Verification failed:", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] API call failed:", err);
    return true; // Fail open — don't block legitimate users if Turnstile is down
  }
}
