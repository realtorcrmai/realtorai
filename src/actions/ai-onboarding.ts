"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic();
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ═══ A1: AI Bio Generator ═══

export async function generateBio(userId?: string): Promise<{ bio: string } | { error: string }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("name, brokerage, onboarding_market, onboarding_experience")
    .eq("id", uid)
    .single();

  if (!user?.name) return { error: "Please enter your name first" };

  const experienceMap: Record<string, string> = {
    new: "less than 1 year",
    "1_3_years": "1-3 years",
    "3_10_years": "3-10 years",
    "10_plus": "over 10 years",
  };

  try {
    const response = await createWithRetry(anthropic, {
      model: HAIKU_MODEL,
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Write a professional 2-3 sentence bio for a real estate agent.
Name: ${user.name}
Brokerage: ${user.brokerage || "Independent"}
Market: ${user.onboarding_market || "residential"} real estate in British Columbia
Experience: ${experienceMap[user.onboarding_experience || "new"] || "new to real estate"}

Tone: warm, professional, confident. Do NOT fabricate awards, certifications, sales statistics, or specific numbers. Keep it genuine and concise.`,
      }],
    });

    const bio = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Save to DB
    await supabase.from("users").update({ bio }).eq("id", uid);

    return { bio };
  } catch (err) {
    console.error("[ai-onboarding] generateBio failed:", err);
    return { error: "AI generation unavailable — please write your bio manually" };
  }
}

// ═══ A2: Contact Categorizer ═══

interface ContactCategory {
  id: string;
  name: string;
  suggestedType: string;
  confidence: "high" | "medium" | "low";
}

export async function categorizeContacts(userId?: string): Promise<{ categories: ContactCategory[] } | { error: string }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  // Get uncategorized contacts (no type set, or type = 'other')
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, phone, notes")
    .eq("realtor_id", uid)
    .or("type.is.null,type.eq.other")
    .limit(50);

  if (!contacts?.length) return { categories: [] };

  // Build prompt with contact data
  const contactList = contacts.map((c) => (
    `- ${c.name || "Unknown"} (email: ${c.email || "none"}, notes: ${c.notes?.slice(0, 50) || "none"})`
  )).join("\n");

  try {
    const response = await createWithRetry(anthropic, {
      model: HAIKU_MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Categorize these real estate contacts by type. Return ONLY a JSON array.

Contacts:
${contactList}

Types: buyer, seller, agent, investor, other
Confidence: high (clear signal like email domain @remax.ca = agent), medium, low

Return format: [{"name": "...", "type": "buyer", "confidence": "high"}]
No explanation, just the JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    // Extract JSON from response (may have markdown backticks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch?.[0] || "[]") as { name: string; type: string; confidence: string }[];

    // Map back to contact IDs
    const categories: ContactCategory[] = contacts.map((c) => {
      const match = parsed.find((p) => p.name === c.name);
      return {
        id: c.id,
        name: c.name || "Unknown",
        suggestedType: match?.type || "other",
        confidence: (match?.confidence || "low") as "high" | "medium" | "low",
      };
    });

    return { categories };
  } catch (err) {
    console.error("[ai-onboarding] categorizeContacts failed:", err);
    return { error: "Categorization unavailable — you can tag contacts manually later" };
  }
}

/** Apply AI-suggested categories to contacts */
export async function applyCategorizations(categories: { id: string; type: string }[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  for (const cat of categories) {
    await supabase.from("contacts").update({ type: cat.type }).eq("id", cat.id).eq("realtor_id", session.user.id);
  }
  return { success: true, updated: categories.length };
}

// ═══ A3: Dashboard Briefing ═══

interface BriefingItem {
  title: string;
  description: string;
  cta_href: string;
}

export async function generateDashboardBriefing(userId?: string): Promise<{ items: BriefingItem[] } | { error: string }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  // Check if briefing already exists
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_briefing, onboarding_persona, onboarding_market, name")
    .eq("id", uid)
    .single();

  if (user?.onboarding_briefing) {
    return { items: user.onboarding_briefing as BriefingItem[] };
  }

  // Get counts for context
  const [{ count: contactCount }, { count: listingCount }] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("realtor_id", uid).neq("is_sample", true),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("realtor_id", uid),
  ]);

  try {
    const response = await createWithRetry(anthropic, {
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You're an AI CRM assistant. This realtor just completed onboarding.

Profile: ${user?.onboarding_persona || "solo agent"}, ${user?.onboarding_market || "residential"} market
Data: ${contactCount ?? 0} contacts, ${listingCount ?? 0} listings

Suggest exactly 3 specific next actions. Return ONLY a JSON array:
[{"title": "short title", "description": "1 sentence", "cta_href": "/path"}]

Available paths: /contacts, /contacts/new, /listings, /newsletters, /calendar, /content, /showings
Make suggestions relevant to their data (e.g., if 0 contacts, suggest importing).`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const items = JSON.parse(jsonMatch?.[0] || "[]") as BriefingItem[];

    // Cache in DB
    await supabase.from("users").update({ onboarding_briefing: items }).eq("id", uid);

    return { items };
  } catch (err) {
    console.error("[ai-onboarding] generateDashboardBriefing failed:", err);
    // Hardcoded fallback
    return {
      items: [
        { title: "Import your contacts", description: "Your CRM works best with your real client data", cta_href: "/contacts/new" },
        { title: "Add your first listing", description: "Watch AI generate MLS remarks instantly", cta_href: "/listings" },
        { title: "Connect your calendar", description: "Never double-book a showing again", cta_href: "/calendar" },
      ],
    };
  }
}

// ═══ A6: Suggested Automations ═══

interface AutomationSuggestion {
  title: string;
  description: string;
  contacts_affected: number;
  trigger: string;
}

export async function suggestAutomations(userId?: string): Promise<{ suggestions: AutomationSuggestion[] } | { error: string }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  // Get contact stats
  const { data: contacts } = await supabase
    .from("contacts")
    .select("type, last_activity_date")
    .eq("realtor_id", uid)
    .neq("is_sample", true);

  if (!contacts?.length) {
    return {
      suggestions: [
        { title: "New Lead Welcome", description: "Import contacts first to personalize suggestions", contacts_affected: 0, trigger: "contact_created" },
        { title: "Monthly Market Update", description: "Send market stats to all contacts monthly", contacts_affected: 0, trigger: "monthly" },
        { title: "Listing Anniversary", description: "Celebrate purchase anniversaries yearly", contacts_affected: 0, trigger: "yearly" },
      ],
    };
  }

  const buyerCount = contacts.filter((c) => c.type === "buyer").length;
  const sellerCount = contacts.filter((c) => c.type === "seller").length;
  const staleCount = contacts.filter((c) => {
    if (!c.last_activity_date) return true;
    return Date.now() - new Date(c.last_activity_date).getTime() > 30 * 24 * 60 * 60 * 1000;
  }).length;

  try {
    const response = await createWithRetry(anthropic, {
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Suggest 3 email automation workflows for a realtor with:
- ${contacts.length} total contacts (${buyerCount} buyers, ${sellerCount} sellers)
- ${staleCount} contacts not contacted in 30+ days

Return ONLY a JSON array:
[{"title": "...", "description": "1 sentence why", "contacts_affected": N, "trigger": "..."}]

Be specific about numbers. Example triggers: "weekly", "monthly", "on_new_lead", "on_30_day_inactive"`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = JSON.parse(jsonMatch?.[0] || "[]") as AutomationSuggestion[];

    return { suggestions };
  } catch (err) {
    console.error("[ai-onboarding] suggestAutomations failed:", err);
    return {
      suggestions: [
        { title: "Re-engage Stale Contacts", description: `${staleCount} contacts haven't heard from you in 30+ days`, contacts_affected: staleCount, trigger: "on_30_day_inactive" },
        { title: "Monthly Market Update", description: "Keep all contacts informed with market stats", contacts_affected: contacts.length, trigger: "monthly" },
        { title: "New Lead Follow-up", description: "Auto-send welcome email when new contacts are added", contacts_affected: 0, trigger: "on_new_lead" },
      ],
    };
  }
}

// ═══ A7: Smart First Actions ═══

export async function suggestFirstActions(userId?: string): Promise<{ actions: { title: string; description: string; href: string }[] } | { error: string }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  // Get 3 most recent non-sample contacts
  const { data: recentContacts } = await supabase
    .from("contacts")
    .select("id, name, email, type")
    .eq("realtor_id", uid)
    .neq("is_sample", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!recentContacts?.length) {
    return {
      actions: [
        { title: "Import your contacts", description: "Get your client data into Magnate", href: "/contacts/new" },
      ],
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return {
    actions: recentContacts.map((c) => ({
      title: `Send a hello to ${c.name || "your contact"}`,
      description: c.type === "buyer" ? "Check in about their home search" : "Touch base and stay top of mind",
      href: `/contacts/${c.id}`,
    })),
  };
}
