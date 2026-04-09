"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorConfig } from "@/actions/config";
import type { GreetingRule } from "@/actions/config";
import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";

// ── Types ───────────────────────────────────────────────────
interface GreetingCandidate {
  contactId: string;
  contactName: string;
  contactType: string;
  contactEmail: string;
  occasion: string;
  occasionLabel: string;
  rule: GreetingRule;
  engagementScore: number;
  relationshipContext: string;
}

interface GreetingDecision {
  contactId: string;
  occasion: string;
  action: "send" | "skip" | "defer";
  reasoning: string;
  subject: string;
  emailBody: string;
  priority: "hot" | "warm" | "info";
  optimalSendHour: number;
}

// ── Occasion Date Matching ──────────────────────────────────
const FIXED_DATES: Record<string, { month: number; day: number }[]> = {
  christmas: [{ month: 12, day: 24 }, { month: 12, day: 25 }],
  new_year: [{ month: 12, day: 31 }, { month: 1, day: 1 }],
  canada_day: [{ month: 7, day: 1 }],
  valentines: [{ month: 2, day: 14 }],
};

// Variable dates for 2026-2028
const VARIABLE_DATES: Record<string, Record<number, { month: number; day: number }>> = {
  diwali: { 2026: { month: 10, day: 19 }, 2027: { month: 11, day: 8 }, 2028: { month: 10, day: 28 } },
  lunar_new_year: { 2026: { month: 2, day: 17 }, 2027: { month: 2, day: 6 }, 2028: { month: 1, day: 26 } },
};

function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, nth: number): number {
  const first = new Date(year, month - 1, 1);
  const firstOccurrence = ((dayOfWeek - first.getDay() + 7) % 7) + 1;
  return firstOccurrence + (nth - 1) * 7;
}

function isOccasionToday(occasion: string, today: Date): boolean {
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  // Fixed dates
  if (FIXED_DATES[occasion]) {
    return FIXED_DATES[occasion].some(d => d.month === month && d.day === day);
  }

  // Variable dates (lookup table)
  if (VARIABLE_DATES[occasion]) {
    const d = VARIABLE_DATES[occasion][year];
    if (d) return d.month === month && d.day === day;
    return false;
  }

  // Calculated dates
  if (occasion === "thanksgiving") {
    // 2nd Monday of October
    return month === 10 && day === getNthDayOfMonth(year, 10, 1, 2);
  }
  if (occasion === "mothers_day") {
    // 2nd Sunday of May
    return month === 5 && day === getNthDayOfMonth(year, 5, 0, 2);
  }
  if (occasion === "fathers_day") {
    // 3rd Sunday of June
    return month === 6 && day === getNthDayOfMonth(year, 6, 0, 3);
  }

  // birthday and home_anniversary are per-contact, not calendar-based
  return false;
}

function getOccasionLabel(occasion: string): string {
  const labels: Record<string, string> = {
    birthday: "Birthday", home_anniversary: "Home Anniversary",
    christmas: "Christmas", new_year: "New Year",
    diwali: "Diwali", lunar_new_year: "Lunar New Year",
    canada_day: "Canada Day", thanksgiving: "Thanksgiving",
    valentines: "Valentine's Day", mothers_day: "Mother's Day",
    fathers_day: "Father's Day",
  };
  return labels[occasion] || occasion;
}

// ── Main Agent Entry Point ──────────────────────────────────

/**
 * Called by the agent-evaluate cron. Scans all enabled greeting rules,
 * finds contacts who should receive a greeting today, and uses Claude
 * to decide whether to send and what to write.
 *
 * Returns decisions that feed into the AI Agent Queue.
 */
export async function evaluateGreetings(): Promise<{
  candidates: number;
  decisions: GreetingDecision[];
  errors: number;
}> {
  const config = await getRealtorConfig();
  if (!config?.brand_config) return { candidates: 0, decisions: [], errors: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const greetingRules: GreetingRule[] = (config.brand_config as any).greeting_rules || [];
  const enabledRules = greetingRules.filter(r => r.enabled);
  if (enabledRules.length === 0) return { candidates: 0, decisions: [], errors: 0 };

  const supabase = createAdminClient();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brand = config.brand_config as any;
  const agentName = brand.realtorName || "Your Realtor";

  // Collect all candidates across all occasions
  const candidates: GreetingCandidate[] = [];
  let errors = 0;

  for (const rule of enabledRules) {
    try {
      let contactIds: string[] = [];

      // Personal milestones — match from contact dates
      if (rule.occasion === "birthday") {
        // DATE type can't use LIKE — fetch all birthdays, filter by month/day in code
        const { data } = await supabase
          .from("contact_dates")
          .select("contact_id, date")
          .ilike("label", "%birthday%");
        contactIds = (data || [])
          .filter((d: { contact_id: string; date: string }) => {
            const dParts = String(d.date).split("-");
            return parseInt(dParts[1]) === month && parseInt(dParts[2]) === day;
          })
          .map((d: { contact_id: string; date: string }) => d.contact_id);
      } else if (rule.occasion === "home_anniversary") {
        const { data } = await supabase
          .from("contact_dates")
          .select("contact_id, date")
          .or("label.ilike.%anniversary%,label.ilike.%closing%");
        contactIds = (data || [])
          .filter((d: { contact_id: string; date: string }) => {
            const dParts = String(d.date).split("-");
            return parseInt(dParts[1]) === month && parseInt(dParts[2]) === day;
          })
          .map((d: { contact_id: string; date: string }) => d.contact_id);
      } else {
        // Calendar-based holidays
        if (!isOccasionToday(rule.occasion, today)) continue;
        contactIds = await getContactIdsByRecipients(supabase, rule.recipients);
      }

      if (contactIds.length === 0) continue;

      // Check for already-sent greetings this year (dedup)
      const yearStart = new Date(year, 0, 1).toISOString();
      const { data: alreadySent } = await supabase
        .from("newsletters")
        .select("contact_id")
        .eq("email_type", `greeting_${rule.occasion}`)
        .gte("created_at", yearStart)
        .in("status", ["sent", "draft", "approved", "sending"]);
      const sentSet = new Set((alreadySent || []).map((n: { contact_id: string }) => n.contact_id));
      contactIds = contactIds.filter(id => !sentSet.has(id));

      if (contactIds.length === 0) continue;

      // Fetch contact details
      // Exclude agents from greetings — they only receive listing blasts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, type, email, newsletter_unsubscribed, newsletter_intelligence, stage_bar, notes")
        .in("id", contactIds)
        .eq("newsletter_unsubscribed", false)
        .not("email", "is", null)
        .not("type", "eq", "agent")
        .limit(200);

      for (const c of contacts || []) {
        const intel = (c.newsletter_intelligence as Record<string, unknown>) || {};
        candidates.push({
          contactId: c.id,
          contactName: c.name,
          contactType: c.type,
          contactEmail: c.email!,
          occasion: rule.occasion,
          occasionLabel: getOccasionLabel(rule.occasion),
          rule,
          engagementScore: (intel.engagement_score as number) || 0,
          relationshipContext: [
            c.type && `Type: ${c.type}`,
            c.stage_bar && `Stage: ${c.stage_bar}`,
            intel.total_opens && `Opens: ${intel.total_opens}`,
            (intel.inferred_interests as Record<string, string[]> | undefined)?.areas?.length && `Areas: ${(intel.inferred_interests as Record<string, string[]>).areas.join(", ")}`,
            c.notes && `Notes: ${(c.notes as string).slice(0, 100)}`,
          ].filter(Boolean).join(" | "),
        });
      }
    } catch (e) {
      errors++;
    }
  }

  if (candidates.length === 0) return { candidates: 0, decisions: [], errors };

  // Use Claude to generate personalized greetings for each candidate
  const decisions: GreetingDecision[] = [];

  // Batch candidates to reduce API calls (up to 10 per Claude call)
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10);
    try {
      const batchDecisions = await generateGreetingBatch(batch, agentName);
      decisions.push(...batchDecisions);
    } catch (e) {
      errors += batch.length;
    }
  }

  // Save decisions to agent_recommendations + queue emails
  for (const decision of decisions) {
    if (decision.action !== "send") continue;

    try {
      // Save as agent recommendation
      await supabase.from("agent_recommendations").insert({
        contact_id: decision.contactId,
        action_type: "send_greeting",
        reasoning: decision.reasoning,
        priority: decision.priority,
        status: "pending",
        action_config: {
          occasion: decision.occasion,
          subject: decision.subject,
          email_body: decision.emailBody,
          optimal_send_hour: decision.optimalSendHour,
        },
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      });

      // Queue the newsletter
      const candidate = candidates.find(c => c.contactId === decision.contactId && c.occasion === decision.occasion);
      // Use Apple-quality email block system
      const { buildEmailFromType } = await import("@/lib/email-blocks");
      const emailBlockType = decision.occasion === "home_anniversary" ? "home_anniversary" : "welcome";
      const html = buildEmailFromType(
        emailBlockType,
        candidate?.contactName || "Friend",
        candidate?.contactType || "buyer",
        decision.subject,
        decision.emailBody.replace(/<[^>]+>/g, ""), // Strip HTML tags — blocks system adds its own
        "Get in Touch",
      );

      await supabase.from("newsletters").insert({
        contact_id: decision.contactId,
        email_type: `greeting_${decision.occasion}`,
        journey_phase: "greeting",
        subject: decision.subject,
        html_body: html,
        status: candidate?.rule.approval === "auto" ? "approved" : "draft",
        send_mode: candidate?.rule.approval || "review",
        ai_context: {
          greeting: true,
          occasion: decision.occasion,
          reasoning: decision.reasoning,
          priority: decision.priority,
          confidence: 1.0,
          agent_generated: true,
        },
      });

      // Auto-send if approval mode is auto
      if (candidate?.rule.approval === "auto") {
        const { data: nl } = await supabase
          .from("newsletters")
          .select("id")
          .eq("contact_id", decision.contactId)
          .eq("email_type", `greeting_${decision.occasion}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (nl) {
          try {
            const { sendNewsletter } = await import("@/actions/newsletters");
            await sendNewsletter(nl.id);
          } catch {}
        }
      }
    } catch (e) {
      errors++;
    }
  }

  return { candidates: candidates.length, decisions, errors };
}

// ── Claude Greeting Generation ──────────────────────────────

async function generateGreetingBatch(
  candidates: GreetingCandidate[],
  agentName: string,
): Promise<GreetingDecision[]> {
  const anthropic = new Anthropic();

  const contactList = candidates.map((c, i) =>
    `${i + 1}. ${c.contactName} (${c.contactType}) — Occasion: ${c.occasionLabel}
   Engagement: ${c.engagementScore}/100
   Context: ${c.relationshipContext}
   ${c.rule.personalNote ? `Realtor's note: "${c.rule.personalNote}"` : ""}`
  ).join("\n\n");

  const prompt = `You are an AI assistant for ${agentName}, a BC real estate agent. Write personalized greeting emails for these contacts.

CONTACTS:
${contactList}

For EACH contact, generate:
1. A warm, personalized subject line (no generic "Dear valued client" — use their name)
2. A 2-3 paragraph email body that:
   - Opens with the greeting specific to the occasion
   - References something personal (their property type interest, neighbourhood, relationship stage)
   - Ends with a warm sign-off (NOT a sales pitch, but subtly reminds them you're there for real estate needs)
3. Whether to send, skip, or defer
4. Priority: hot (birthday/anniversary — personal), warm (major holiday), info (minor occasion)

RULES:
- Birthday and anniversary greetings should be VERY personal — mention how long you've known them, their home, their area
- Holiday greetings should be warm but lighter — don't over-personalize holidays
- If engagement score < 10, consider skipping (they may not want to hear from you)
- Keep emails under 150 words — warm and concise, not a newsletter
- Write in the realtor's voice: professional but friendly, Canadian English
- Do NOT include property listings or market stats in greetings — this is a relationship touch, not a marketing email

Return JSON array:
[{
  "index": 1,
  "action": "send",
  "subject": "Happy Birthday, Sarah!",
  "email_body": "<p>The HTML email body...</p>",
  "reasoning": "Why this greeting makes sense",
  "priority": "hot",
  "optimal_send_hour": 9
}]`;

  try {
    const model = process.env.AI_SCORING_MODEL || "claude-sonnet-4-20250514";
    const msg = await createWithRetry(anthropic, {
      model,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((item: any) => {
      const candidate = candidates[(item.index || 1) - 1];
      if (!candidate) return null;
      return {
        contactId: candidate.contactId,
        occasion: candidate.occasion,
        action: item.action || "send",
        reasoning: item.reasoning || "",
        subject: item.subject || `${candidate.occasionLabel} Wishes`,
        emailBody: item.email_body || "",
        priority: item.priority || "warm",
        optimalSendHour: item.optimal_send_hour || 9,
      };
    }).filter(Boolean) as GreetingDecision[];
  } catch (e) {
    // Fallback: generate static greetings without Claude
    return candidates.map(c => ({
      contactId: c.contactId,
      occasion: c.occasion,
      action: "send" as const,
      reasoning: `${c.occasionLabel} greeting for ${c.contactName} (fallback — AI unavailable)`,
      subject: `Happy ${c.occasionLabel}, ${c.contactName.split(" ")[0]}!`,
      emailBody: `<p>Wishing you a wonderful ${c.occasionLabel}! Thank you for being part of my community. I hope today brings you joy and happiness.</p><p>Warm regards,<br>${agentName}</p>`,
      priority: (c.occasion === "birthday" || c.occasion === "home_anniversary" ? "hot" : "warm") as "hot" | "warm",
      optimalSendHour: 9,
    }));
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function getContactIdsByRecipients(supabase: ReturnType<typeof createAdminClient>, recipients: string): Promise<string[]> {
  let query = supabase
    .from("contacts")
    .select("id")
    .eq("newsletter_unsubscribed", false)
    .not("email", "is", null)
    .not("type", "eq", "agent"); // Agents only get listing blasts, not greetings

  switch (recipients) {
    case "all_buyers": query = query.eq("type", "buyer"); break;
    case "all_sellers": query = query.eq("type", "seller"); break;
    case "past_clients": query = query.eq("stage_bar", "closed"); break;
    case "active_clients": query = query.in("stage_bar", ["active_search", "active_listing", "under_contract"]); break;
  }

  const { data } = await query.limit(500);
  return (data || []).map((c: { id: string }) => c.id);
}

function wrapGreetingHtml(body: string, occasion: string, agentName: string, brokerage: string): string {
  const colors: Record<string, string> = {
    birthday: "#ec4899", home_anniversary: "#4f35d2", christmas: "#16a34a",
    new_year: "#7c3aed", diwali: "#f59e0b", lunar_new_year: "#dc2626",
    canada_day: "#dc2626", thanksgiving: "#ea580c", valentines: "#ec4899",
    mothers_day: "#ec4899", fathers_day: "#2563eb",
  };
  const emojis: Record<string, string> = {
    birthday: "🎂", home_anniversary: "🏠", christmas: "🎄",
    new_year: "🎆", diwali: "🪔", lunar_new_year: "🧧",
    canada_day: "🍁", thanksgiving: "🦃", valentines: "💝",
    mothers_day: "💐", fathers_day: "👔",
  };
  const color = colors[occasion] || "#4f35d2";
  const emoji = emojis[occasion] || "✨";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');</style>
</head><body style="margin:0;padding:0;background:#f5f5f7;font-family:'Inter',-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:24px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td><div style="background:linear-gradient(135deg,${color}22,${color}11);padding:32px;text-align:center;">
    <div style="font-size:40px;margin-bottom:8px;">${emoji}</div>
  </div></td></tr>
  <tr><td style="padding:24px 32px;">${body}</td></tr>
  <tr><td style="padding:0 32px 24px;">
    <table width="100%" style="border-top:1px solid #e5e7eb;padding-top:16px;">
    <tr><td width="36"><div style="width:36px;height:36px;border-radius:50%;background:${color};text-align:center;line-height:36px;color:#fff;font-weight:700;font-size:15px;">${agentName[0]}</div></td>
    <td style="padding-left:10px;"><div style="font-size:13px;font-weight:600;color:#1d1d1f;">${agentName}</div><div style="font-size:11px;color:#6b7280;">${brokerage}</div></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:12px 32px 16px;text-align:center;background:#f9fafb;border-top:1px solid #f3f4f6;">
    <p style="font-size:10px;color:#9ca3af;margin:0;"><a href="#" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
