"use server";

import { signIn } from "@/lib/auth";

/**
 * Demo account slots — emails are semi-public demo addresses.
 * Passwords come exclusively from DEMO_PASSWORD env var (never hardcoded).
 * Admin demo login is intentionally absent — use the email/password form with secure credentials.
 */
const DEMO_SLOTS = [
  { label: "Kunal (Pro)", email: process.env.DEMO_EMAIL || "demo@realestatecrm.com" },
  { label: "Sarah (Studio)", email: process.env.DEMO_EMAIL_SARAH || "sarah@realtors360.com" },
  { label: "Mike (Pro)", email: process.env.DEMO_EMAIL_MIKE || "mike@realtors360.com" },
  { label: "Priya (Free)", email: process.env.DEMO_EMAIL_PRIYA || "priya@realtors360.com" },
] as const;

export async function loginAsDemo(slot: number): Promise<{ error?: string }> {
  const s = DEMO_SLOTS[slot as 0 | 1 | 2 | 3];
  if (!s) return { error: "Invalid demo slot" };

  const password = process.env.DEMO_PASSWORD;
  if (!password) return { error: "Demo accounts not configured" };

  try {
    await signIn("credentials", {
      email: s.email,
      password,
      redirectTo: "/",
    });
  } catch (err: unknown) {
    // NEXT_REDIRECT is a special error Next.js throws to redirect — must rethrow
    const digest = (err as { digest?: string })?.digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) throw err;

    console.error("[loginAsDemo] slot", slot, err instanceof Error ? err.message : err);
    return { error: "Login failed. Please try again." };
  }

  return {};
}
