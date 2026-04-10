/**
 * Twilio SMS/WhatsApp wrapper.
 *
 * Ported from `realestate-crm/src/lib/twilio.ts` (M3-E). Only the
 * `sendGenericMessage` function is needed — the showing-specific functions
 * (sendShowingRequest, sendLockboxCode, etc.) stay in the CRM.
 */

import twilio from 'twilio';
import { config } from '../config.js';
import { logger } from './logger.js';

type Channel = 'sms' | 'whatsapp';

let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> {
  if (!_client) {
    _client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

function formatNumber(phone: string, channel: Channel): string {
  const clean = phone.replace(/\D/g, '');
  const e164 = clean.startsWith('1') ? `+${clean}` : `+1${clean}`;
  return channel === 'whatsapp' ? `whatsapp:${e164}` : e164;
}

/**
 * Send a plain-text message via Twilio (SMS or WhatsApp).
 * Returns the Twilio message SID on success.
 */
export async function sendGenericMessage(params: {
  to: string;
  channel: Channel;
  body: string;
}): Promise<string> {
  const from =
    params.channel === 'whatsapp'
      ? config.TWILIO_WHATSAPP_NUMBER
      : config.TWILIO_PHONE_NUMBER;

  const message = await getClient().messages.create({
    body: params.body,
    from,
    to: formatNumber(params.to, params.channel),
  });

  logger.info(
    { sid: message.sid, to: params.to, channel: params.channel },
    'twilio: message sent'
  );

  return message.sid;
}
