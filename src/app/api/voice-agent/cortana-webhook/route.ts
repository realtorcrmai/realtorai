import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Cortana / Bot Framework Handler
// ---------------------------------------------------------------------------
// Handles message activities from the Microsoft Bot Framework. Parses natural
// language intent from the activity text, maps to CRM queries, and returns
// adaptive card responses in Bot Framework compatible format.
// ---------------------------------------------------------------------------

interface BotFrameworkActivity {
  type: "message" | "conversationUpdate" | "event";
  id: string;
  timestamp: string;
  channelId: string;
  from: { id: string; name?: string };
  conversation: { id: string; tenantId?: string };
  recipient: { id: string; name?: string };
  text?: string;
  value?: Record<string, unknown>;
  channelData?: {
    tenantId?: string;
    accessToken?: string;
  };
  serviceUrl: string;
}

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: string;
  body: Array<{
    type: string;
    text?: string;
    size?: string;
    weight?: string;
    wrap?: boolean;
    items?: Array<{ type: string; text: string; wrap?: boolean }>;
  }>;
}

interface BotFrameworkResponse {
  type: "message";
  text: string;
  attachments?: Array<{
    contentType: string;
    content: AdaptiveCard;
  }>;
}

/** Extract tenant ID from Bot Framework activity. */
async function extractTenantFromBotFramework(
  activity: BotFrameworkActivity
): Promise<string | null> {
  // Try channel data first (OAuth token flow)
  const token = activity.channelData?.accessToken;
  if (token) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("voice_agent_tokens")
      .select("tenant_id")
      .eq("access_token", token)
      .single();

    if (data?.tenant_id) return data.tenant_id;
  }

  // Fall back to conversation tenant ID (Teams / Cortana)
  const conversationTenantId =
    activity.conversation?.tenantId ??
    activity.channelData?.tenantId;

  if (conversationTenantId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("voice_agent_tokens")
      .select("tenant_id")
      .eq("platform_tenant_id", conversationTenantId)
      .limit(1)
      .single();

    return data?.tenant_id ?? null;
  }

  return null;
}

/** Build a Bot Framework text response. */
function textResponse(text: string): BotFrameworkResponse {
  return { type: "message", text };
}

/** Build a Bot Framework response with an adaptive card. */
function cardResponse(
  title: string,
  text: string,
  items?: string[]
): BotFrameworkResponse {
  const card: AdaptiveCard = {
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      { type: "TextBlock", text: title, size: "Large", weight: "Bolder" },
      { type: "TextBlock", text, wrap: true },
    ],
  };

  if (items?.length) {
    card.body.push({
      type: "Container",
      items: items.map((item) => ({
        type: "TextBlock",
        text: `- ${item}`,
        wrap: true,
      })),
    });
  }

  return {
    type: "message",
    text,
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };
}

/** Simple intent detection from natural language text. */
function detectIntent(
  text: string
): {
  intent: string;
  params: Record<string, string>;
} {
  const lower = text.toLowerCase().trim();

  if (/\b(leads?|new contacts?|new buyers?)\b/.test(lower)) {
    return { intent: "CheckLeads", params: {} };
  }

  if (/\b(schedule|book)\b.*\b(showing|appointment|viewing)\b/.test(lower)) {
    // Try to extract address and datetime from the text
    const addressMatch = lower.match(
      /(?:at|for)\s+(.+?)(?:\s+(?:on|at|for)\s+|$)/
    );
    const dateMatch = lower.match(
      /(?:on|at|for)\s+((?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d).+)/i
    );
    return {
      intent: "ScheduleShowing",
      params: {
        ...(addressMatch ? { listing: addressMatch[1] } : {}),
        ...(dateMatch ? { datetime: dateMatch[1] } : {}),
      },
    };
  }

  if (/\b(pipeline|active listings?|my listings?)\b/.test(lower)) {
    return { intent: "GetPipeline", params: {} };
  }

  if (/\b(log|add|save)\b.*\b(note|memo|comment)\b/.test(lower)) {
    const contactMatch = lower.match(
      /(?:for|about|on)\s+([a-z]+(?:\s+[a-z]+)?)/
    );
    const noteMatch = lower.match(
      /(?:saying|that|note:?)\s+(.+)/i
    );
    return {
      intent: "LogNote",
      params: {
        ...(contactMatch ? { contact: contactMatch[1] } : {}),
        ...(noteMatch ? { note: noteMatch[1] } : {}),
      },
    };
  }

  if (/\b(schedule|calendar|today|showings? today)\b/.test(lower)) {
    return { intent: "GetSchedule", params: {} };
  }

  if (/\b(details?|info|about)\b.*\b(listing|property|house|home)\b/.test(lower)) {
    const addressMatch = lower.match(
      /(?:at|for|on|about)\s+(.+?)(?:\s*$)/
    );
    return {
      intent: "GetListingDetails",
      params: addressMatch ? { listing: addressMatch[1] } : {},
    };
  }

  return { intent: "Unknown", params: {} };
}

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

async function handleCheckLeads(
  tenantId: string
): Promise<BotFrameworkResponse> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, type, created_at")
    .eq("tenant_id", tenantId)
    .eq("type", "buyer")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    return textResponse("You have no new leads right now.");
  }

  return cardResponse(
    "Recent Leads",
    `You have ${data.length} recent lead${data.length === 1 ? "" : "s"}.`,
    data.map((c) => `${c.name} (${c.type})`)
  );
}

async function handleScheduleShowing(
  tenantId: string,
  params: Record<string, string>
): Promise<BotFrameworkResponse> {
  const { listing: listingAddress, datetime } = params;

  if (!listingAddress || !datetime) {
    return textResponse(
      "I need both a listing address and a date/time to schedule a showing. Try: 'Schedule a showing at 123 Main St on Friday at 2pm'."
    );
  }

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, address")
    .eq("tenant_id", tenantId)
    .ilike("address", `%${listingAddress}%`)
    .limit(1)
    .single();

  if (!listing) {
    return textResponse(
      `I couldn't find a listing matching "${listingAddress}". Please try again with the full address.`
    );
  }

  const { error } = await supabase.from("appointments").insert({
    tenant_id: tenantId,
    listing_id: listing.id,
    start_time: datetime,
    status: "pending",
  });

  if (error) {
    return textResponse(
      "Sorry, I had trouble scheduling that showing. Please try again later."
    );
  }

  return cardResponse(
    "Showing Scheduled",
    `Showing at ${listing.address} scheduled for ${datetime}.`
  );
}

async function handleGetPipeline(
  tenantId: string
): Promise<BotFrameworkResponse> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, address, status, list_price")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "pending", "coming_soon"]);

  if (error || !data?.length) {
    return textResponse("Your pipeline is empty right now.");
  }

  return cardResponse(
    "Pipeline",
    `You have ${data.length} listing${data.length === 1 ? "" : "s"} in your pipeline.`,
    data.map(
      (l) =>
        `${l.address} - ${l.status}${l.list_price ? ` ($${Number(l.list_price).toLocaleString()})` : ""}`
    )
  );
}

async function handleLogNote(
  tenantId: string,
  params: Record<string, string>
): Promise<BotFrameworkResponse> {
  const { contact: contactName, note: noteBody } = params;

  if (!contactName || !noteBody) {
    return textResponse(
      "I need a contact name and a note. Try: 'Log a note for John saying interested in downtown condos'."
    );
  }

  const supabase = createAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${contactName}%`)
    .limit(1)
    .single();

  if (!contact) {
    return textResponse(
      `I couldn't find a contact named "${contactName}".`
    );
  }

  const { error } = await supabase.from("communications").insert({
    tenant_id: tenantId,
    contact_id: contact.id,
    direction: "internal",
    channel: "voice_note",
    body: noteBody,
  });

  if (error) {
    return textResponse(
      "Sorry, I had trouble logging that note. Please try again."
    );
  }

  return cardResponse(
    "Note Logged",
    `Note logged for ${contact.name}: "${noteBody}"`
  );
}

async function handleGetSchedule(
  tenantId: string
): Promise<BotFrameworkResponse> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("appointments")
    .select("id, start_time, listing_id, listings(address)")
    .eq("tenant_id", tenantId)
    .gte("start_time", now)
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: true });

  if (error || !data?.length) {
    return textResponse(
      "You have no showings scheduled for the rest of today."
    );
  }

  return cardResponse(
    "Today's Schedule",
    `You have ${data.length} showing${data.length === 1 ? "" : "s"} today.`,
    data.map((a) => {
      const time = new Date(a.start_time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const address =
        (a.listings as unknown as { address: string })?.address ??
        "unknown address";
      return `${time} at ${address}`;
    })
  );
}

async function handleGetListingDetails(
  tenantId: string,
  params: Record<string, string>
): Promise<BotFrameworkResponse> {
  const { listing: address } = params;
  if (!address) {
    return textResponse("Which listing would you like details for?");
  }

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", tenantId)
    .ilike("address", `%${address}%`)
    .limit(1)
    .single();

  if (!listing) {
    return textResponse(
      `I couldn't find a listing matching "${address}".`
    );
  }

  const price = listing.list_price
    ? `$${Number(listing.list_price).toLocaleString()}`
    : "no price set";

  return cardResponse("Listing Details", `${listing.address}`, [
    `Status: ${listing.status}`,
    `Price: ${price}`,
    `Workflow Phase: ${listing.current_phase ?? "N/A"}`,
  ]);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const activity = (await request.json()) as BotFrameworkActivity;

    // Only handle message activities
    if (activity.type !== "message") {
      return NextResponse.json(
        textResponse(""),
        { status: 200 }
      );
    }

    const tenantId = await extractTenantFromBotFramework(activity);
    if (!tenantId) {
      return NextResponse.json(
        textResponse(
          "I couldn't verify your account. Please sign in to Magnate through Microsoft Teams or Cortana."
        ),
        { status: 200 }
      );
    }

    const userText = activity.text ?? "";
    if (!userText.trim()) {
      return NextResponse.json(
        textResponse(
          "I can check your leads, schedule showings, get your pipeline, log notes, check your schedule, or get listing details. What would you like?"
        ),
        { status: 200 }
      );
    }

    const { intent, params } = detectIntent(userText);
    let response: BotFrameworkResponse;

    switch (intent) {
      case "CheckLeads":
        response = await handleCheckLeads(tenantId);
        break;
      case "ScheduleShowing":
        response = await handleScheduleShowing(tenantId, params);
        break;
      case "GetPipeline":
        response = await handleGetPipeline(tenantId);
        break;
      case "LogNote":
        response = await handleLogNote(tenantId, params);
        break;
      case "GetSchedule":
        response = await handleGetSchedule(tenantId);
        break;
      case "GetListingDetails":
        response = await handleGetListingDetails(tenantId, params);
        break;
      default:
        response = textResponse(
          "I can check your leads, schedule showings, get your pipeline, log notes, check your schedule, or get listing details. What would you like to do?"
        );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[voice-agent/cortana-webhook] Error:", err);
    return NextResponse.json(
      textResponse("Sorry, something went wrong. Please try again."),
      { status: 200 }
    );
  }
}
