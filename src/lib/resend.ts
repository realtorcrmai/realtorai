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

export async function sendEmail(params: SendEmailParams) {
  const resend = getResend();
  const fromEmail = params.from || process.env.RESEND_FROM_EMAIL || "newsletters@listingflow.com";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
    tags: params.tags,
    headers: {
      "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/newsletters/unsubscribe>`,
      ...params.headers,
    },
  });

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

  // Send in batches of 10 to respect rate limits
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
        errors.push(result.reason?.message || "Unknown error");
      }
    }

    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { sent, failed, errors };
}
