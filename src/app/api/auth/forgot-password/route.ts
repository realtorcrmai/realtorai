import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient as createSystemClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createSystemClient();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with this email, a reset link has been sent.",
    });

    const { data: user } = await supabase
      .from("users")
      .select("id, email, name, password_hash")
      .eq("email", email.toLowerCase().trim())
      .single();

    // Only users with password_hash can reset (not Google-only users)
    if (!user || !user.password_hash) {
      return successResponse;
    }

    // Generate reset token (expires in 1 hour)
    const reset_token = randomUUID();
    const reset_token_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase
      .from("users")
      .update({ reset_token, reset_token_expires })
      .eq("id", user.id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${reset_token}`;

    // Send reset email via Resend
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your password — Magnate",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #2D3E50; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #64748b; line-height: 1.6;">
              Hi${user.name ? ` ${user.name.split(" ")[0]}` : ""},
            </p>
            <p style="color: #64748b; line-height: 1.6;">
              We received a request to reset your password. Click the button below to choose a new one:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #2D3E50; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">— Magnate Team</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[forgot-password] Email send failed:", emailErr);
    }

    return successResponse;
  } catch (err) {
    console.error("[forgot-password] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
