import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptGoogleToken,
  encryptGoogleTokenFields,
} from "@/lib/google-tokens";

async function getOAuth2Client(userEmail: string) {
  const supabase = createAdminClient();
  const { data: rawTokenRow } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (!rawTokenRow) {
    console.warn(`[google-calendar] No token row found for user: ${userEmail}`);
    throw new Error("No Google token found for user");
  }

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
      try {
        await supabase
          .from("google_tokens")
          .update(
            encryptGoogleTokenFields({
              access_token: tokens.access_token,
              expiry_date: tokens.expiry_date ?? null,
              updated_at: new Date().toISOString(),
            })
          )
          .eq("user_email", userEmail);
      } catch (err) {
        console.error("[google-calendar] Token refresh DB update failed:", err instanceof Error ? err.message : err);
      }
    }
  });

  return oauth2Client;
}

export async function fetchBusyBlocks(
  userEmail: string,
  startDate: Date,
  endDate: Date
) {
  const auth = await getOAuth2Client(userEmail);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  return response.data.calendars?.primary?.busy ?? [];
}

export async function fetchCalendarEvents(
  userEmail: string,
  startDate: Date,
  endDate: Date
) {
  const auth = await getOAuth2Client(userEmail);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items ?? [];
}

export async function createCalendarEvent(
  userEmail: string,
  appointment: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
  }
) {
  const auth = await getOAuth2Client(userEmail);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: appointment.title,
      description: appointment.description,
      location: appointment.location,
      start: {
        dateTime: appointment.startTime,
        timeZone: "America/Vancouver",
      },
      end: { dateTime: appointment.endTime, timeZone: "America/Vancouver" },
      colorId: "2",
    },
  });

  return response.data;
}

export async function deleteCalendarEvent(
  userEmail: string,
  eventId: string
) {
  const auth = await getOAuth2Client(userEmail);
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId: "primary", eventId });
}

export function isSlotAvailable(
  busyBlocks: Array<{ start?: string | null; end?: string | null }>,
  proposedStart: Date,
  proposedEnd: Date
): boolean {
  return !busyBlocks.some((block) => {
    if (!block.start || !block.end) return false;
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    return proposedStart < blockEnd && proposedEnd > blockStart;
  });
}
