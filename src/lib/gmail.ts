/**
 * Gmail API Integration
 *
 * Uses the Google OAuth2 tokens (stored in google_tokens table)
 * to send emails and fetch recent messages for contacts.
 */

import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptGoogleToken,
  encryptGoogleTokenFields,
} from "@/lib/google-tokens";

async function getOAuth2Client(userEmail?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("google_tokens").select("*");
  if (userEmail) {
    query = query.eq("user_email", userEmail);
  }
  const { data: rawTokenRow } = await query.limit(1).single();

  if (!rawTokenRow) throw new Error("No Google token found");

  // Decrypt access_token / refresh_token before handing to googleapis.
  // Legacy plaintext rows pass through unchanged (see google-tokens.ts).
  const tokenRow = decryptGoogleToken(rawTokenRow)!;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from("google_tokens")
        .update(
          encryptGoogleTokenFields({
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date ?? null,
            updated_at: new Date().toISOString(),
          })
        )
        .eq("user_email", tokenRow.user_email);
    }
  });

  return { oauth2Client, userEmail: tokenRow.user_email };
}

/**
 * Send an email via Gmail API
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  userEmail?: string;
}): Promise<{ messageId: string; threadId: string }> {
  const { to, subject, body, userEmail } = params;
  const { oauth2Client, userEmail: senderEmail } = await getOAuth2Client(userEmail);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build RFC 2822 formatted email
  const rawMessage = [
    `From: ${senderEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    body,
  ].join("\r\n");

  // Base64url encode
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    messageId: response.data.id || "",
    threadId: response.data.threadId || "",
  };
}

/**
 * Fetch recent emails for a specific contact email address.
 * Returns last N messages exchanged with this email.
 */
export async function fetchContactEmails(params: {
  contactEmail: string;
  maxResults?: number;
  userEmail?: string;
}): Promise<
  {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    snippet: string;
    body: string;
    direction: "inbound" | "outbound";
  }[]
> {
  const { contactEmail, maxResults = 20, userEmail } = params;
  const { oauth2Client, userEmail: agentEmail } = await getOAuth2Client(userEmail);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Search for messages involving this contact
  const query = `from:${contactEmail} OR to:${contactEmail}`;
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  if (!listResponse.data.messages) return [];

  const messages = await Promise.all(
    listResponse.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      const from = getHeader("From");
      const to = getHeader("To");
      const subject = getHeader("Subject");
      const date = getHeader("Date");

      // Extract plain text body
      let body = "";
      const payload = detail.data.payload;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, "base64").toString("utf-8");
      } else if (payload?.parts) {
        const textPart = payload.parts.find(
          (p) => p.mimeType === "text/plain"
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
        }
      }

      // Determine direction
      const isFromContact = from.toLowerCase().includes(contactEmail.toLowerCase());
      const direction: "inbound" | "outbound" = isFromContact
        ? "inbound"
        : "outbound";

      return {
        id: detail.data.id || "",
        threadId: detail.data.threadId || "",
        subject,
        from,
        to,
        date,
        snippet: detail.data.snippet || "",
        body: body.slice(0, 2000), // Limit body length
        direction,
      };
    })
  );

  return messages;
}

/**
 * Sync emails for a contact into the communications table.
 * Only imports emails not already logged.
 */
export async function syncContactEmails(
  contactId: string,
  contactEmail: string
): Promise<{ imported: number; errors: string[] }> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let imported = 0;

  try {
    const emails = await fetchContactEmails({ contactEmail, maxResults: 50 });

    for (const email of emails) {
      // Check if already imported (by checking for similar body + date)
      const emailDate = new Date(email.date);
      const { data: existing } = await supabase
        .from("communications")
        .select("id")
        .eq("contact_id", contactId)
        .eq("channel", "email")
        .gte("created_at", new Date(emailDate.getTime() - 60000).toISOString())
        .lte("created_at", new Date(emailDate.getTime() + 60000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      const bodyWithSubject = email.subject
        ? `Subject: ${email.subject}\n\n${email.body}`
        : email.body;

      const { error } = await supabase.from("communications").insert({
        contact_id: contactId,
        direction: email.direction,
        channel: "email",
        body: bodyWithSubject.slice(0, 5000),
        created_at: emailDate.toISOString(),
      });

      if (error) {
        errors.push(`Failed to import email ${email.id}: ${error.message}`);
      } else {
        imported++;
      }
    }
  } catch (err) {
    errors.push(`Gmail API error: ${String(err)}`);
  }

  return { imported, errors };
}
