"use server";

import { Resend } from "resend";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

// ---------------------------------------------------------------------------
// DEV_EMAIL_MODE — local email intercept
// Set DEV_EMAIL_MODE=preview in .env.local to capture all outbound emails to
// /tmp/dev-emails/ as HTML files instead of sending via Resend.
// ---------------------------------------------------------------------------
async function devCapture(params: SendEmailParams): Promise<{ messageId: string }> {
  const { writeFile, mkdir } = await import("fs/promises")
  const { join } = await import("path")
  const dir = join(process.env.TMPDIR || "/tmp", "dev-emails")
  await mkdir(dir, { recursive: true })
  const ts = Date.now()
  const safe = (params.subject || "email").replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 60).trim().replace(/ /g, "-")
  const file = join(dir, `${ts}-${safe}.html`)
  const preview = `<!-- DEV EMAIL PREVIEW
  From: ${params.from || process.env.RESEND_FROM_EMAIL || "newsletters@magnate360.com"}
  To: ${params.to}
  Subject: ${params.subject}
  Captured: ${new Date().toISOString()}
-->
${params.html}`
  await writeFile(file, preview, "utf-8")
  console.log(`[DEV_EMAIL] Captured → ${file}`)
  console.log(`[DEV_EMAIL] Open: open "${file}"`)
  return { messageId: `dev-${ts}` }
}

// H-14: Fail fast at import time in production if the API key is missing.
// In development/test environments, this is a warning only so local dev still works.
if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
  throw new Error("[resend] RESEND_API_KEY environment variable is required in production");
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
  /**
   * When set, the email is sent on behalf of the realtor:
   *   From: "Jazz Grewal" <newsletters@magnate360.com>
   *   Reply-To: jazz@24krealty.ca
   * The buyer sees the realtor's name and can reply directly.
   */
  realtorBranding?: {
    name: string;
    email?: string;
  } | null;
  /** Metadata injected as a banner at the top of the email for BCC monitoring */
  metadata?: {
    workflowName?: string;
    stepName?: string;
    emailType?: string;
    journeyPhase?: string;
    contactName?: string;
    contactType?: string;
    contactId?: string;
    triggeredBy?: string;
  };
}

async function sendWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      const statusCode = err?.statusCode ?? 500;

      // H-13: Do NOT retry permanent 4xx client errors (except 429 rate limit).
      // Only retry on 429 (rate limit) or 5xx (server errors).
      const isPermanentClientError =
        statusCode >= 400 && statusCode < 500 && statusCode !== 429;
      if (isPermanentClientError || attempt === maxRetries) throw e;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("sendWithRetry: unreachable");
}

export async function sendEmail(params: SendEmailParams) {
  // Basic email validation
  if (!params.to || !params.to.includes("@")) {
    throw new Error(`Invalid email address: ${params.to}`);
  }

  // DEV_EMAIL_MODE=preview → capture to local file, never hit Resend
  if (process.env.DEV_EMAIL_MODE === "preview") {
    return devCapture(params)
  }

  const resend = getResend();
  const baseDomain = process.env.RESEND_FROM_EMAIL || "newsletters@magnate360.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const monitorEmail = process.env.EMAIL_MONITOR_BCC || "";

  // If realtorBranding is provided, send on behalf of the realtor:
  //   From: "Jazz Grewal" <newsletters@magnate360.com>
  //   Reply-To: jazz@24krealty.ca
  // This way the buyer sees the realtor's name and can reply directly.
  const fromEmail = params.from
    || (params.realtorBranding?.name ? `${params.realtorBranding.name} <${baseDomain}>` : baseDomain);
  const replyTo = params.replyTo || params.realtorBranding?.email || undefined;

  // Inject metadata banner into HTML for BCC monitoring
  let html = params.html;
  if (monitorEmail && params.metadata) {
    const m = params.metadata;
    const rows = [
      m.workflowName && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Workflow</td><td style="padding:2px 8px;">${m.workflowName}</td></tr>`,
      m.stepName && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Step</td><td style="padding:2px 8px;">${m.stepName}</td></tr>`,
      m.emailType && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Email Type</td><td style="padding:2px 8px;">${m.emailType}</td></tr>`,
      m.journeyPhase && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Journey Phase</td><td style="padding:2px 8px;">${m.journeyPhase}</td></tr>`,
      m.contactName && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Contact</td><td style="padding:2px 8px;">${m.contactName} (${m.contactType || "unknown"})</td></tr>`,
      m.triggeredBy && `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Triggered By</td><td style="padding:2px 8px;">${m.triggeredBy}</td></tr>`,
      `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Sent To</td><td style="padding:2px 8px;">${params.to}</td></tr>`,
      `<tr><td style="padding:2px 8px;font-weight:600;color:#6b21a8;">Sent At</td><td style="padding:2px 8px;">${new Date().toISOString()}</td></tr>`,
    ].filter(Boolean).join("");

    const banner = `<div style="background:#faf5ff;border:2px solid #d8b4fe;border-radius:8px;padding:12px;margin-bottom:16px;font-family:sans-serif;font-size:12px;color:#374151;">
      <div style="font-weight:700;color:#6b21a8;margin-bottom:6px;font-size:13px;">Magnate Test Metadata</div>
      <table style="border-collapse:collapse;width:100%;">${rows}</table>
    </div>`;

    // Insert after <body> tag or at the start
    if (html.includes("<body")) {
      html = html.replace(/(<body[^>]*>)/i, `$1${banner}`);
    } else {
      html = banner + html;
    }
  }

  const { data, error } = await sendWithRetry(() =>
    resend.emails.send({
      from: fromEmail,
      to: params.to,
      ...(monitorEmail ? { bcc: monitorEmail } : {}),
      subject: params.subject,
      html,
      text: params.text,
      replyTo,
      tags: params.tags?.filter(t => t.value != null && t.value !== ""),
      headers: {
        "List-Unsubscribe": params.metadata?.contactId
          ? `<${buildUnsubscribeUrl(params.metadata.contactId)}>`
          : `<${appUrl}/api/newsletters/unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        ...params.headers,
      },
    })
  );

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { messageId: data?.id };
}

export async function sendBatchEmails(
  emails: SendEmailParams[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend enforces 5 req/s. Sending concurrently in batches of 10 hits
  // the rate limit reliably when blasting to large agent lists. Fix: send
  // sequentially with a 220ms gap between each email (≈4.5 emails/sec —
  // safely under the 5/sec ceiling with headroom for retries).
  for (let i = 0; i < emails.length; i++) {
    try {
      await sendEmail(emails[i]);
      sent++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(msg);
      console.error("Batch email send error:", msg);
    }

    // 220ms gap → ≈4.5 sends/sec, safely under Resend's 5 req/s limit.
    // Skip gap after the last email.
    if (i < emails.length - 1) {
      await new Promise((r) => setTimeout(r, 220));
    }
  }

  return { sent, failed, errors };
}
