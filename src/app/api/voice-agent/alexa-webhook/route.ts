import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Alexa Skill Handler
// ---------------------------------------------------------------------------
// Handles LaunchRequest, IntentRequest, and SessionEndedRequest from the
// Alexa Skills Kit. Maps custom intents to CRM queries and returns
// SSML-formatted responses with session attribute persistence.
// ---------------------------------------------------------------------------

interface AlexaSlot {
  name: string;
  value?: string;
  confirmationStatus?: string;
}

interface AlexaIntent {
  name: string;
  confirmationStatus?: string;
  slots?: Record<string, AlexaSlot>;
}

interface AlexaRequest {
  session: {
    sessionId: string;
    application: { applicationId: string };
    user: { userId: string; accessToken?: string };
    attributes?: Record<string, unknown>;
    new: boolean;
  };
  request: {
    type: "LaunchRequest" | "IntentRequest" | "SessionEndedRequest";
    requestId: string;
    timestamp: string;
    intent?: AlexaIntent;
    reason?: string;
  };
  version: string;
}

interface AlexaResponse {
  version: string;
  sessionAttributes: Record<string, unknown>;
  response: {
    outputSpeech: { type: "SSML"; ssml: string };
    card?: { type: "Simple"; title: string; content: string };
    shouldEndSession: boolean;
  };
}

/** Extract tenant ID from the Alexa account-linked access token. */
async function extractTenantFromAlexa(
  alexaReq: AlexaRequest
): Promise<string | null> {
  const token = alexaReq.session.user.accessToken;
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_agent_tokens")
    .select("tenant_id")
    .eq("access_token", token)
    .single();

  return data?.tenant_id ?? null;
}

/** Build a standard Alexa response. */
function alexaResponse(
  speech: string,
  sessionAttributes: Record<string, unknown>,
  shouldEndSession: boolean,
  cardTitle?: string
): AlexaResponse {
  return {
    version: "1.0",
    sessionAttributes,
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${speech}</speak>`,
      },
      ...(cardTitle
        ? { card: { type: "Simple", title: cardTitle, content: speech } }
        : {}),
      shouldEndSession,
    },
  };
}

/** Get a slot value by name. */
function slotValue(
  intent: AlexaIntent | undefined,
  name: string
): string | undefined {
  return intent?.slots?.[name]?.value;
}

// ---------------------------------------------------------------------------
// Intent handlers (reuse CRM query logic)
// ---------------------------------------------------------------------------

async function handleCheckLeads(tenantId: string): Promise<string> {
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
  intent?: AlexaIntent
): Promise<string> {
  const listingAddress = slotValue(intent, "listing");
  const dateTime = slotValue(intent, "datetime");

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

  return `I've scheduled a showing at ${listing.address} for ${dateTime}.`;
}

async function handleGetPipeline(tenantId: string): Promise<string> {
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
  intent?: AlexaIntent
): Promise<string> {
  const contactName = slotValue(intent, "contact");
  const noteBody = slotValue(intent, "note");

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

async function handleGetSchedule(tenantId: string): Promise<string> {
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
        (a.listings as unknown as { address: string })?.address ??
        "unknown address";
      return `${time} at ${address}`;
    })
    .join(", ");

  return `You have ${data.length} showing${data.length === 1 ? "" : "s"} today: ${items}.`;
}

async function handleGetListingDetails(
  tenantId: string,
  intent?: AlexaIntent
): Promise<string> {
  const address = slotValue(intent, "listing");
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
    const body = (await request.json()) as AlexaRequest;
    const { session, request: alexaReq } = body;
    const sessionAttrs = session.attributes ?? {};

    // Handle SessionEndedRequest — no response expected
    if (alexaReq.type === "SessionEndedRequest") {
      return NextResponse.json(
        alexaResponse("Goodbye!", {}, true),
        { status: 200 }
      );
    }

    // Handle LaunchRequest
    if (alexaReq.type === "LaunchRequest") {
      const tenantId = await extractTenantFromAlexa(body);
      if (!tenantId) {
        return NextResponse.json(
          alexaResponse(
            "Welcome to RealtorAI. Please link your account in the Alexa app to get started.",
            {},
            true,
            "Account Linking Required"
          ),
          { status: 200 }
        );
      }

      return NextResponse.json(
        alexaResponse(
          "Welcome to RealtorAI. You can check leads, schedule showings, get your pipeline, log notes, check your schedule, or get listing details. What would you like?",
          { ...sessionAttrs, tenantId },
          false,
          "RealtorAI"
        ),
        { status: 200 }
      );
    }

    // Handle IntentRequest
    const tenantId =
      (sessionAttrs.tenantId as string) ??
      (await extractTenantFromAlexa(body));

    if (!tenantId) {
      return NextResponse.json(
        alexaResponse(
          "I couldn't verify your account. Please link your RealtorAI account in the Alexa app.",
          {},
          true,
          "Account Linking Required"
        ),
        { status: 200 }
      );
    }

    const updatedAttrs = { ...sessionAttrs, tenantId };
    const intentName = alexaReq.intent?.name ?? "";
    let speech: string;
    let shouldEnd = false;

    switch (intentName) {
      case "CheckLeadsIntent":
        speech = await handleCheckLeads(tenantId);
        break;
      case "ScheduleShowingIntent":
        speech = await handleScheduleShowing(tenantId, alexaReq.intent);
        break;
      case "GetPipelineIntent":
        speech = await handleGetPipeline(tenantId);
        break;
      case "LogNoteIntent":
        speech = await handleLogNote(tenantId, alexaReq.intent);
        break;
      case "GetScheduleIntent":
        speech = await handleGetSchedule(tenantId);
        break;
      case "GetListingDetailsIntent":
        speech = await handleGetListingDetails(tenantId, alexaReq.intent);
        break;
      case "AMAZON.HelpIntent":
        speech =
          "You can say things like: check my leads, schedule a showing, get my pipeline, log a note for a contact, check my schedule, or get details on a listing. What would you like?";
        break;
      case "AMAZON.CancelIntent":
      case "AMAZON.StopIntent":
        speech = "Goodbye!";
        shouldEnd = true;
        break;
      case "AMAZON.FallbackIntent":
        speech =
          "I didn't understand that. You can check leads, schedule showings, get your pipeline, log notes, check your schedule, or get listing details. What would you like?";
        break;
      default:
        speech =
          "I'm not sure how to help with that. Try saying: check my leads, or get my pipeline.";
    }

    return NextResponse.json(
      alexaResponse(speech, updatedAttrs, shouldEnd, "RealtorAI"),
      { status: 200 }
    );
  } catch (err) {
    console.error("[voice-agent/alexa-webhook] Error:", err);
    return NextResponse.json(
      alexaResponse(
        "Sorry, something went wrong. Please try again.",
        {},
        true,
        "Error"
      ),
      { status: 200 }
    );
  }
}
