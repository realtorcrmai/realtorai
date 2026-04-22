import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Google Actions Fulfillment Webhook
// ---------------------------------------------------------------------------
// Handles intents from Google Assistant for the Magnate voice agent.
// Validates the authorization header, maps intents to CRM queries, and
// returns SSML-formatted responses.
// ---------------------------------------------------------------------------

interface GoogleRequest {
  handler: { name: string };
  intent: { name: string; params: Record<string, { resolved: string }> };
  session: { id: string; params: Record<string, unknown> };
  user?: { accessToken?: string };
}

interface GoogleResponse {
  session: { id: string; params: Record<string, unknown> };
  prompt: { firstSimple: { speech: string; text: string } };
}

/** Extract tenant ID from the OAuth access token on the Google request. */
async function extractTenantFromGoogle(
  req: GoogleRequest
): Promise<string | null> {
  const token = req.user?.accessToken;
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_agent_tokens")
    .select("tenant_id")
    .eq("access_token", token)
    .single();

  return data?.tenant_id ?? null;
}

/** Wrap plain text in SSML. */
function ssml(text: string): string {
  return `<speak>${text}</speak>`;
}

/** Build a standard Google response object. */
function googleResponse(
  sessionId: string,
  sessionParams: Record<string, unknown>,
  speech: string,
  displayText?: string
): GoogleResponse {
  return {
    session: { id: sessionId, params: sessionParams },
    prompt: {
      firstSimple: {
        speech: ssml(speech),
        text: displayText ?? speech,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

async function handleCheckLeads(tenantId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, type, created_at")
    .eq("tenant_id", tenantId)
    .eq("type", "buyer")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    return "You have no new leads right now.";
  }

  const names = data.map((c) => c.name).join(", ");
  return `You have ${data.length} recent lead${data.length === 1 ? "" : "s"}: ${names}.`;
}

async function handleScheduleShowing(
  tenantId: string,
  params: Record<string, { resolved: string }>
) {
  const listingAddress = params?.listing?.resolved;
  const dateTime = params?.datetime?.resolved;

  if (!listingAddress || !dateTime) {
    return "I need both a listing address and a date and time to schedule a showing. Could you provide those?";
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
    return `I couldn't find a listing matching "${listingAddress}". Please try again with the full address.`;
  }

  const { error } = await supabase.from("appointments").insert({
    tenant_id: tenantId,
    listing_id: listing.id,
    start_time: dateTime,
    status: "pending",
  });

  if (error) {
    return "Sorry, I had trouble scheduling that showing. Please try again later.";
  }

  return `I've scheduled a showing at ${listing.address} for ${new Date(dateTime).toLocaleString()}.`;
}

async function handleGetPipeline(tenantId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, address, status, list_price")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "pending", "coming_soon"]);

  if (error || !data?.length) {
    return "Your pipeline is empty right now.";
  }

  const summary = data
    .map(
      (l) =>
        `${l.address} is ${l.status}${l.list_price ? ` at $${Number(l.list_price).toLocaleString()}` : ""}`
    )
    .join(". ");

  return `You have ${data.length} listing${data.length === 1 ? "" : "s"} in your pipeline. ${summary}.`;
}

async function handleLogNote(
  tenantId: string,
  params: Record<string, { resolved: string }>
) {
  const contactName = params?.contact?.resolved;
  const noteBody = params?.note?.resolved;

  if (!contactName || !noteBody) {
    return "I need a contact name and a note to log. Could you provide both?";
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
    return `I couldn't find a contact named "${contactName}".`;
  }

  const { error } = await supabase.from("communications").insert({
    tenant_id: tenantId,
    contact_id: contact.id,
    direction: "internal",
    channel: "voice_note",
    body: noteBody,
  });

  if (error) {
    return "Sorry, I had trouble logging that note. Please try again.";
  }

  return `Done. I've logged a note for ${contact.name}.`;
}

async function handleGetSchedule(tenantId: string) {
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
    return "You have no showings scheduled for the rest of today.";
  }

  const items = data
    .map((a) => {
      const time = new Date(a.start_time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const address =
        (a.listings as unknown as { address: string })?.address ?? "unknown address";
      return `${time} at ${address}`;
    })
    .join(", ");

  return `You have ${data.length} showing${data.length === 1 ? "" : "s"} today: ${items}.`;
}

async function handleGetListingDetails(
  tenantId: string,
  params: Record<string, { resolved: string }>
) {
  const address = params?.listing?.resolved;
  if (!address) {
    return "Which listing would you like details for?";
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
    return `I couldn't find a listing matching "${address}".`;
  }

  const price = listing.list_price
    ? `$${Number(listing.list_price).toLocaleString()}`
    : "no price set";
  return `${listing.address} is ${listing.status} at ${price}. It's currently in phase ${listing.current_phase ?? "unknown"} of the workflow.`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as GoogleRequest;
    const { handler, intent, session } = body;

    const tenantId = await extractTenantFromGoogle(body);
    if (!tenantId) {
      return NextResponse.json(
        googleResponse(
          session.id,
          session.params,
          "I couldn't verify your account. Please re-link your Magnate account in the Google Home app."
        ),
        { status: 200 }
      );
    }

    // Persist tenant in session for subsequent turns
    const sessionParams = { ...session.params, tenantId };

    const intentName = handler?.name ?? intent?.name ?? "";
    let speech: string;

    switch (intentName) {
      case "CheckLeads":
        speech = await handleCheckLeads(tenantId);
        break;
      case "ScheduleShowing":
        speech = await handleScheduleShowing(tenantId, intent.params);
        break;
      case "GetPipeline":
        speech = await handleGetPipeline(tenantId);
        break;
      case "LogNote":
        speech = await handleLogNote(tenantId, intent.params);
        break;
      case "GetSchedule":
        speech = await handleGetSchedule(tenantId);
        break;
      case "GetListingDetails":
        speech = await handleGetListingDetails(tenantId, intent.params);
        break;
      default:
        speech =
          "I can check your leads, schedule showings, get your pipeline, log notes, check your schedule, or get listing details. What would you like?";
    }

    return NextResponse.json(
      googleResponse(session.id, sessionParams, speech),
      { status: 200 }
    );
  } catch (err) {
    console.error("[voice-agent/google-webhook] Error:", err);
    return NextResponse.json(
      {
        prompt: {
          firstSimple: {
            speech: "<speak>Sorry, something went wrong. Please try again.</speak>",
            text: "Sorry, something went wrong. Please try again.",
          },
        },
      },
      { status: 200 }
    );
  }
}
