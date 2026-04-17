import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Send a 6-digit OTP code via Twilio SMS.
 * Plain text message (no links) — carrier-friendly, avoids spam filters.
 * Reuses the same Twilio account as showing requests (src/lib/twilio.ts).
 */
export async function sendOtpSms(phone: string, otp: string): Promise<string> {
  const message = await client.messages.create({
    body: `Your Magnate verification code is: ${otp}. Expires in 10 minutes. If you didn't request this, ignore this message.`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone, // E.164 format: +16045551234
  });

  return message.sid;
}
