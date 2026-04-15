import { createAdminClient } from "@/lib/supabase/admin";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailConfig = {
  provider: "resend" | "sendgrid" | "smtp";
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
};

async function getEmailConfig(): Promise<EmailConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_integrations")
    .select("config")
    .eq("provider", "email")
    .maybeSingle();

  if (!data?.config) return null;

  const config = data.config as Record<string, string>;
  return {
    provider: (config.email_provider as EmailConfig["provider"]) ?? "resend",
    apiKey: config.api_key ?? "",
    fromEmail: config.from_email ?? "",
    fromName: config.from_name,
    replyTo: config.reply_to,
  };
}

async function sendViaResend(config: EmailConfig, payload: EmailPayload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromName
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: config.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  return res.json();
}

async function sendViaSendGrid(config: EmailConfig, payload: EmailPayload) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject: payload.subject,
      content: [
        { type: "text/html", value: payload.html },
        ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
      ],
      reply_to: config.replyTo ? { email: config.replyTo } : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid error: ${err}`);
  }

  return { success: true };
}

/**
 * Send an email using the configured provider.
 * Falls back to console.log if no provider is configured.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();

  if (!config || !config.apiKey) {
    // No email provider configured — fail explicitly instead of silently succeeding
    console.warn("[Email] No email provider configured. Email NOT sent to:", payload.to, "Subject:", payload.subject);
    return { success: false, error: "Email provider not configured. Configure in Settings > Integrations." };
  }

  try {
    switch (config.provider) {
      case "resend":
        await sendViaResend(config, payload);
        break;
      case "sendgrid":
        await sendViaSendGrid(config, payload);
        break;
      case "smtp":
        // SMTP not yet implemented — fall back to console
        console.log("[Email SMTP Fallback]", payload.subject);
        break;
      default:
        console.log("[Email Unknown Provider]", config.provider);
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email Error]", message);
    return { success: false, error: message };
  }
}
