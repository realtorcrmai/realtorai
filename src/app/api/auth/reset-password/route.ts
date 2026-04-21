import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient as createSystemClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const supabase = createSystemClient();

    // Find user by reset token
    const { data: user } = await supabase
      .from("users")
      .select("id, reset_token_expires")
      .eq("reset_token", token)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Check token expiry
    if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      await supabase
        .from("users")
        .update({ reset_token: null, reset_token_expires: null })
        .eq("id", user.id);

      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Hash new password and clear reset token
    const password_hash = await bcrypt.hash(password, 12);

    await supabase
      .from("users")
      .update({ password_hash, reset_token: null, reset_token_expires: null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
