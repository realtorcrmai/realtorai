import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

/**
 * Rule resolution + frequency capping for `email_event_rules`.
 *
 * N3 fix: frequency cap now counts all newsletter statuses except 'failed'
 * (including 'pending_review', 'sending', 'sent'). The original only
 * counted `.gte('sent_at', ...)` which silently missed pending-review drafts
 * — a realtor with 50 queued drafts could trigger 50 more for the same
 * contact because the cap only saw sent rows.
 *
 * N4: CASL consent is checked in the pipeline runner (`_runner.ts`) AFTER
 * rule resolution. The rule resolver deals with rate limits; the runner
 * deals with legal compliance. Separation of concerns.
 */

export type ResolvedRule = {
  rule_id: string;
  email_type: string;
  template_id: string;
  send_mode: 'review' | 'auto';
  frequency_cap_per_week: number;
  min_hours_between_sends: number;
  priority: number;
};

export type RuleResolution =
  | { ok: true; rule: ResolvedRule }
  | { ok: false; reason: 'no_rule' | 'cap_exceeded' | 'too_soon' | 'disabled'; detail?: string };

export async function resolveRuleForEvent(args: {
  realtor_id: string;
  event_type: string;
  contact_id: string | null;
}): Promise<RuleResolution> {
  // 1. Find best rule
  const { data: rules, error } = await supabase
    .from('email_event_rules')
    .select('*')
    .eq('realtor_id', args.realtor_id)
    .eq('event_type', args.event_type)
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .limit(1);

  if (error) {
    logger.error({ err: error }, 'rules: query failed');
    return { ok: false, reason: 'no_rule', detail: error.message };
  }

  const rule = rules?.[0];
  if (!rule) return { ok: false, reason: 'no_rule' };

  const resolved: ResolvedRule = {
    rule_id: rule.id,
    email_type: rule.email_type,
    template_id: rule.template_id,
    send_mode: rule.send_mode,
    frequency_cap_per_week: rule.frequency_cap_per_week,
    min_hours_between_sends: rule.min_hours_between_sends,
    priority: rule.priority,
  };

  // 2. Frequency cap (only meaningful if we have a contact)
  if (args.contact_id) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // N3 fix: count ALL rows created in the last week that aren't failures.
    // This captures pending_review, sending, and sent. Without this, a
    // realtor in review-mode could pile up unlimited drafts per contact.
    const { count: weekCount, error: weekErr } = await supabase
      .from('newsletters')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', args.contact_id)
      .eq('realtor_id', args.realtor_id)
      .neq('status', 'failed')
      .gte('created_at', oneWeekAgo);

    if (weekErr) logger.warn({ err: weekErr }, 'rules: week count failed');
    if ((weekCount ?? 0) >= resolved.frequency_cap_per_week) {
      return { ok: false, reason: 'cap_exceeded', detail: `${weekCount} sends in last 7 days` };
    }

    // Min hours between sends — same fix: use created_at not sent_at.
    const minHoursAgo = new Date(
      Date.now() - resolved.min_hours_between_sends * 60 * 60 * 1000
    ).toISOString();
    const { count: recentCount } = await supabase
      .from('newsletters')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', args.contact_id)
      .eq('realtor_id', args.realtor_id)
      .neq('status', 'failed')
      .gte('created_at', minHoursAgo);

    if ((recentCount ?? 0) > 0) {
      return { ok: false, reason: 'too_soon', detail: `sent within last ${resolved.min_hours_between_sends}h` };
    }
  }

  return { ok: true, rule: resolved };
}
