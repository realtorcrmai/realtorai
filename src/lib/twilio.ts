import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

type Channel = "whatsapp" | "sms";

function formatNumber(phone: string, channel: Channel): string {
  if (!phone || phone.trim().length === 0) {
    throw new Error("Phone number is required");
  }
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10) {
    throw new Error(`Invalid phone number: too short (${clean.length} digits)`);
  }
  const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
  return channel === "whatsapp" ? `whatsapp:${e164}` : e164;
}

export async function sendShowingRequest(params: {
  to: string;
  channel: Channel;
  address: string;
  startTime: Date;
  buyerAgentName: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, channel, address, startTime, buyerAgentName } = params;

  const timeStr = startTime.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const body = `🏠 *Showing Request*\n\nProperty: ${address}\nDate/Time: ${timeStr}\nBuyer's Agent: ${buyerAgentName}\n\nReply *YES* to confirm or *NO* to decline.\n\nReply *STOP* to opt out of messages.`;

  const from =
    channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER!
      : process.env.TWILIO_PHONE_NUMBER!;

  try {
    const message = await client.messages.create({
      body,
      from,
      to: formatNumber(to, channel),
    });
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error("[twilio] Send failed:", err instanceof Error ? err.message : err);
    return { success: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

export async function sendLockboxCode(params: {
  to: string;
  channel: Channel;
  address: string;
  lockboxCode: string;
  showingTime: Date;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, channel, address, lockboxCode, showingTime } = params;

  const timeStr = showingTime.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const body = `✅ *Showing Confirmed!*\n\nProperty: ${address}\nTime: ${timeStr}\nLockbox Code: *${lockboxCode}*\n\nPlease ensure the property is secured after your showing. Thank you!\n\nReply *STOP* to opt out of messages.`;

  const from =
    channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER!
      : process.env.TWILIO_PHONE_NUMBER!;

  try {
    const message = await client.messages.create({
      body,
      from,
      to: formatNumber(to, channel),
    });
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error("[twilio] Send failed:", err instanceof Error ? err.message : err);
    return { success: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

export async function sendGenericMessage(params: {
  to: string;
  channel: Channel;
  body: string;
}) {
  const { to, channel, body } = params;

  const from =
    channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER!
      : process.env.TWILIO_PHONE_NUMBER!;

  const message = await client.messages.create({
    body,
    from,
    to: formatNumber(to, channel),
  });

  return message.sid;
}

export async function sendShowingDenied(params: {
  to: string;
  address: string;
  showingTime: Date;
}) {
  const { to, address, showingTime } = params;

  const timeStr = showingTime.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const body = `Unfortunately, the showing request for ${address} on ${timeStr} has been declined by the seller. Please contact the listing agent to arrange an alternate time.\n\nReply *STOP* to opt out of messages.`;

  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: formatNumber(to, "sms"),
  });
}
