import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TutorUser } from "./types";

interface AuthSuccess {
  authorized: true;
  error: null;
  user: TutorUser;
}

interface AuthFailure {
  authorized: false;
  error: NextResponse;
  user: null;
}

/**
 * Require Bearer token authentication for English Tutor API routes.
 * Looks up the API key in tutor_users table to identify the user.
 */
export async function requireTutorAuth(
  request: Request
): Promise<AuthSuccess | AuthFailure> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const apiKey = auth.replace("Bearer ", "");
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("tutor_users")
    .select("*")
    .eq("api_key", apiKey)
    .single();

  if (error || !user) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      ),
      user: null,
    };
  }

  return { authorized: true, error: null, user: user as TutorUser };
}
