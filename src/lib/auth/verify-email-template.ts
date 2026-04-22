/**
 * Branded magic link verification email template.
 * Inline styles only (email client compatibility).
 * Tested layout: Gmail, Outlook, Apple Mail.
 */
export function renderVerifyEmail(props: { name: string; verifyUrl: string }): string {
  const { name, verifyUrl } = props;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,53,210,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f35d2,#3d28a8);padding:32px 40px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
            <tr><td style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;text-align:center;vertical-align:middle;">
              <span style="color:#fff;font-size:20px;font-weight:700;line-height:48px;">R</span>
            </td></tr>
          </table>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">Verify your email</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="color:#1a1535;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
          <p style="color:#4a4a68;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Thanks for signing up for Magnate! Click the button below to verify your email address and get started.
          </p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
            <a href="${verifyUrl}" style="display:inline-block;background:#4f35d2;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;mso-padding-alt:0;">
              Verify my email
            </a>
          </td></tr></table>
          <p style="color:#9994b3;font-size:12px;line-height:1.6;margin:24px 0 8px;text-align:center;">
            This link expires in 15 minutes.<br>If you didn't create an account, you can safely ignore this email.
          </p>
          <!-- Fallback link -->
          <p style="color:#9994b3;font-size:11px;line-height:1.6;margin:0;text-align:center;word-break:break-all;">
            Button not working? Copy this link:<br>
            <a href="${verifyUrl}" style="color:#4f35d2;">${verifyUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#9994b3;font-size:11px;margin:0;">Magnate &mdash; AI-Powered Real Estate CRM</p>
          <p style="color:#9994b3;font-size:11px;margin:4px 0 0;">
            <a href="${appUrl}" style="color:#4f35d2;text-decoration:underline;">Visit Dashboard</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
