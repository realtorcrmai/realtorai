import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Require authentication for API routes.
 * Returns the session if authenticated, or a 401 NextResponse.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session) {
    return {
      session: null,
      unauthorized: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { session, unauthorized: null };
}
