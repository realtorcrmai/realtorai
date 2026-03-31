// ============================================================
// A24: Communication Summarizer — synthesize contact history
// Uses Claude Haiku for fast summarization of comms timeline
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { MODELS } from './constants';
const SUMMARIZE_TIMEOUT = 30000;

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Summarize a contact's full communication history into 3-5 bullet points.
 * Fetches communications + appointments, builds a timeline, and sends to Haiku.
 */
export async function summarizeContactHistory(contactId: string): Promise<string> {
  const admin = getAdmin();

  // 1. Fetch contact info + communications + appointments in parallel
  const [contactRes, commsRes, appointmentsRes] = await Promise.all([
    admin
      .from('contacts')
      .select('id, name, email, phone, type, created_at')
      .eq('id', contactId)
      .single(),
    admin
      .from('communications')
      .select('id, direction, channel, body, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
      .limit(100),
    admin
      .from('appointments')
      .select('id, listing_id, start_time, status, buyer_agent_name, listings(address)')
      .or(`buyer_agent_name.ilike.%${contactId}%`)
      .order('start_time', { ascending: true })
      .limit(50),
  ]);

  const contact = contactRes.data;
  if (!contact) {
    return 'Contact not found. Please check the contact ID.';
  }

  const comms = commsRes.data ?? [];
  const appointments = appointmentsRes.data ?? [];

  // 2. Build a timeline string
  const timelineParts: string[] = [];

  timelineParts.push(
    `Contact: ${contact.name} (${contact.type ?? 'unknown type'}) — created ${contact.created_at?.split('T')[0] ?? 'unknown'}`
  );

  if (comms.length === 0 && appointments.length === 0) {
    return `No communication history found for ${contact.name}. This contact was created on ${contact.created_at?.split('T')[0] ?? 'unknown date'} but has no recorded interactions yet.`;
  }

  // Add communications to timeline
  for (const c of comms) {
    const date = c.created_at?.split('T')[0] ?? '?';
    const dir = c.direction === 'inbound' ? '←' : '→';
    const channel = c.channel ?? 'unknown';
    const body = (c.body ?? '').slice(0, 200);
    timelineParts.push(`[${date}] ${dir} ${channel}: ${body}`);
  }

  // Add appointments to timeline
  for (const a of appointments) {
    const date = a.start_time?.split('T')[0] ?? '?';
    const addr =
      a.listings && typeof a.listings === 'object' && 'address' in a.listings
        ? (a.listings as { address: string }).address
        : 'unknown property';
    timelineParts.push(`[${date}] Showing at ${addr} — ${a.status ?? 'unknown status'}`);
  }

  const timeline = timelineParts.join('\n');

  // 3. Send to Claude Haiku for summarization
  const summaryPrompt = `Summarize this contact's interaction history in 3-5 bullet points.
Focus on:
- Last contact date and method
- Communication frequency (how often they interact)
- Key topics discussed or actions taken
- Any pending actions or follow-ups needed
- Overall relationship health (active, cooling off, dormant)

Be concise and actionable. Use bullet points with dashes.

Timeline:
${timeline}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUMMARIZE_TIMEOUT);

    const response = await anthropic.messages.create(
      {
        model: MODELS.TIER1_PLANNER,
        max_tokens: 500,
        system: 'You are a CRM assistant summarizing contact interaction histories for a real estate agent. Be brief, specific, and actionable.',
        messages: [{ role: 'user', content: summaryPrompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text || 'Unable to generate summary.';
  } catch {
    // Fallback: return a basic summary without AI
    const lastComm = comms[comms.length - 1];
    const lastDate = lastComm?.created_at?.split('T')[0] ?? 'unknown';
    return [
      `- ${comms.length} communication(s) on record, ${appointments.length} showing(s)`,
      `- Last interaction: ${lastDate} via ${lastComm?.channel ?? 'unknown'}`,
      `- Contact type: ${contact.type ?? 'unknown'}`,
    ].join('\n');
  }
}
