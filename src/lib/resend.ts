"use server";

import { Resend } from "resend";

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
}

async function sendWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRetryable = e?.statusCode === 429 || e?.statusCode === 503 || e?.statusCode >= 500;
      if (!isRetryable || attempt === maxRetries) throw e;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function sendEmail(params: SendEmailParams) {
  // Basic email validation
  if (!params.to || !params.to.includes("@")) {
    throw new Error(`Invalid email address: ${params.to}`);
  }

  const resend = getResend();
  const fromEmail = params.from || process.env.RESEND_FROM_EMAIL || "newsletters@listingflow.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await sendWithRetry(() =>
    resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags?.filter(t => t.value != null && t.value !== ""),
      headers: {
        "List-Unsubscribe": `<${appUrl}/api/newsletters/unsubscribe>, <mailto:unsubscribe@listingflow.com>`,
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

  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((email) => sendEmail(email))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        const msg = result.reason?.message || "Unknown error";
        errors.push(msg);
        console.error("Batch email send error:", msg);
      }
    }

    // Rate limit between batches
    if (i + batchSize < emails.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { sent, failed, errors };
}
