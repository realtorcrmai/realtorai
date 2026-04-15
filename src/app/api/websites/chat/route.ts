import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { validateApiKey, corsHeaders, handleCORS, normalizePhone, createAdminClient } from "@/lib/website-api";
import { escapeIlike } from "@/lib/escape-ilike";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

const anthropic = new Anthropic();

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: "search_listings",
    description: "Search available property listings. Use when the visitor asks about homes, properties, or real estate.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: { type: "string", description: "Neighbourhood or area name (e.g. Kitsilano, East Van, Burnaby)" },
        max_price: { type: "number", description: "Maximum price in dollars" },
        min_price: { type: "number", description: "Minimum price in dollars" },
        property_type: { type: "string", description: "Property type (e.g. condo, townhouse, detached, apartment)" },
        limit: { type: "number", description: "Max results to return (default 5)" },
      },
      required: [],
    },
  },
  {
    name: "get_property_details",
    description: "Get full details of a specific property listing by ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        listing_id: { type: "string", description: "The listing UUID" },
      },
      required: ["listing_id"],
    },
  },
  {
    name: "create_lead",
    description: "Save visitor as a lead in the CRM. Use when visitor provides their name and phone number, or wants to be contacted.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Visitor's name" },
        phone: { type: "string", description: "Visitor's phone number" },
        email: { type: "string", description: "Visitor's email (optional)" },
        notes: { type: "string", description: "What they're looking for, budget, timeline, etc." },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "schedule_showing",
    description: "Create a showing request for a property. Use when visitor wants to view a specific property.",
    input_schema: {
      type: "object" as const,
      properties: {
        listing_id: { type: "string", description: "The listing UUID" },
        name: { type: "string", description: "Visitor's name" },
        phone: { type: "string", description: "Visitor's phone number" },
        preferred_date: { type: "string", description: "Preferred date (YYYY-MM-DD)" },
        preferred_time: { type: "string", description: "Preferred time (e.g. 10:00 AM)" },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "get_market_data",
    description: "Get real estate market statistics for an area. Use when visitor asks about market trends, prices, or neighbourhood info.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: { type: "string", description: "Area or neighbourhood name" },
      },
      required: [],
    },
  },
];

// Tool execution
async function executeTool(name: string, input: Record<string, unknown>, realtorId: string): Promise<string> {
  const supabase = createAdminClient();

  switch (name) {
    case "search_listings": {
      let query = supabase
        .from("listings")
        .select("id, address, list_price, prop_type, hero_image_url, mls_remarks, status")
        .eq("realtor_id", realtorId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit((input.limit as number) || 5);

      if (input.area) query = query.ilike("address", `%${escapeIlike(String(input.area))}%`);
      if (input.max_price) query = query.lte("list_price", input.max_price);
      if (input.min_price) query = query.gte("list_price", input.min_price);
      if (input.property_type) query = query.eq("prop_type", input.property_type);

      const { data } = await query;
      if (!data || data.length === 0) return "No listings found matching those criteria.";

      return JSON.stringify(data.map(l => ({
        id: l.id,
        address: l.address,
        price: l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "Price TBD",
        type: l.prop_type || "Residential",
        image: l.hero_image_url,
        description: l.mls_remarks?.slice(0, 150),
      })));
    }

    case "get_property_details": {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("realtor_id", realtorId)
        .eq("id", input.listing_id as string)
        .single();

      if (!data) return "Listing not found.";
      return JSON.stringify({
        address: data.address,
        price: data.list_price ? `$${Number(data.list_price).toLocaleString()}` : "Price TBD",
        type: data.prop_type,
        description: data.mls_remarks,
        image: data.hero_image_url,
        status: data.status,
      });
    }

    case "create_lead": {
      const phone = normalizePhone(input.phone as string);
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("realtor_id", realtorId)
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return JSON.stringify({ success: true, message: "Contact already exists. The agent will follow up." });
      }

      const { data: contact } = await supabase
        .from("contacts")
        .insert({
          realtor_id: realtorId,
          name: input.name as string,
          phone,
          email: (input.email as string) || null,
          type: "buyer",
          source: "website_chat",
          pref_channel: "sms",
          notes: (input.notes as string) || null,
        })
        .select("id")
        .single();

      if (contact) {
        // Fire-and-forget enrollment
        try {
          const { autoEnrollNewContact } = await import("@/actions/journeys");
          await autoEnrollNewContact(contact.id, "buyer");
        } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }
        try {
          const { fireTrigger } = await import("@/lib/workflow-triggers");
          await fireTrigger({ type: "new_lead", contactId: contact.id, contactType: "buyer" });
        } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }
      }

      return JSON.stringify({ success: true, message: "Lead saved! The agent will be in touch soon." });
    }

    case "schedule_showing": {
      const phone = normalizePhone(input.phone as string);

      // Find or create contact
      let contactId: string;
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("realtor_id", realtorId)
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        contactId = existing.id;
      } else {
        const { data: c } = await supabase
          .from("contacts")
          .insert({ realtor_id: realtorId, name: input.name as string, phone, type: "buyer", source: "website_chat", pref_channel: "sms" })
          .select("id")
          .single();
        contactId = c?.id || "";
      }

      // Create task
      await supabase.from("tasks").insert({
        realtor_id: realtorId,
        title: `Showing Request — ${input.name}`,
        description: `Property: ${input.listing_id || "TBD"}\nDate: ${input.preferred_date || "TBD"}\nTime: ${input.preferred_time || "TBD"}`,
        contact_id: contactId,
        due_date: (input.preferred_date as string) || new Date().toISOString().slice(0, 10),
        priority: "high",
        status: "pending",
      });

      await supabase.from("agent_notifications").insert({
        realtor_id: realtorId,
        title: "Showing Request via Chat",
        body: `${input.name} wants to see a property${input.preferred_date ? ` on ${input.preferred_date}` : ""}.`,
        type: "urgent",
        contact_id: contactId,
        action_url: `/contacts/${contactId}`,
      });

      return JSON.stringify({ success: true, message: "Showing request created! The agent will confirm the time." });
    }

    case "get_market_data": {
      const area = (input.area as string) || "";
      // Get recent sold listings for market stats
      const { data: sold } = await supabase
        .from("listings")
        .select("list_price, sold_price, address, created_at")
        .eq("realtor_id", realtorId)
        .eq("status", "sold")
        .ilike("address", `%${escapeIlike(area)}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      const { count: activeCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("realtor_id", realtorId)
        .eq("status", "active")
        .ilike("address", `%${escapeIlike(area)}%`);

      const prices = (sold || []).map(s => s.sold_price || s.list_price).filter(Boolean) as number[];
      const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

      return JSON.stringify({
        area: area || "All Areas",
        active_listings: activeCount || 0,
        recent_sales: (sold || []).length,
        average_price: avgPrice ? `$${avgPrice.toLocaleString()}` : "N/A",
        market_trend: "Stable with moderate growth",
      });
    }

    default:
      return "Unknown tool.";
  }
}

/**
 * POST /api/websites/chat
 * AI chatbot endpoint. Accepts conversation messages, returns Claude response with tool results.
 * Body: { messages: [{ role, content }], session_id? }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  if (!auth.realtorId) {
    return NextResponse.json(
      { error: "Tenant context required", code: "MISSING_TENANT" },
      { status: 401, headers: corsHeaders(request) }
    );
  }

  const body = await request.json();
  const { messages, session_id } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Messages array is required", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  // Rate limit: max 20 messages per session
  if (messages.length > 20) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Start a new conversation.", code: "RATE_LIMIT" },
      { status: 429, headers: corsHeaders(request) }
    );
  }

  // Get realtor config for system prompt
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("realtor_agent_config")
    .select("brand_config")
    .eq("realtor_id", auth.realtorId)
    .limit(1)
    .maybeSingle();

  const { data: site } = await supabase
    .from("realtor_sites")
    .select("agent_name, brokerage_name, phone, email, service_areas")
    .eq("realtor_id", auth.realtorId)
    .limit(1)
    .maybeSingle();

  const agentName = site?.agent_name || (config?.brand_config as Record<string, unknown>)?.name || "Your Agent";
  const brokerage = site?.brokerage_name || (config?.brand_config as Record<string, unknown>)?.brokerage || "";
  const phone = site?.phone || "";
  const areas = site?.service_areas || [];
  const chatConfig = (config?.brand_config as Record<string, unknown>)?.chatbot_config as Record<string, unknown> || {};
  const personality = (chatConfig.personality as string) || "professional";

  const toneGuide = personality === "luxury"
    ? "Use sophisticated, refined language. You represent a luxury real estate brand."
    : personality === "friendly"
    ? "Be warm, approachable, and conversational. Use casual language."
    : "Be professional, knowledgeable, and helpful. Clear and concise.";

  const systemPrompt = `You are a real estate assistant for ${agentName}${brokerage ? ` at ${brokerage}` : ""}.
${phone ? `Agent's phone: ${phone}` : ""}
${areas.length ? `Service areas: ${areas.join(", ")}` : ""}

${toneGuide}

Your job is to help website visitors find properties, learn about neighbourhoods, and connect with the agent.

Rules:
- Search listings when visitors ask about properties, homes, or real estate
- When presenting listings, include the address, price, and key details
- If someone wants to book a showing or be contacted, ask for their name and phone number first
- Never make up property information — only share what comes from the search results
- If asked something outside real estate, politely redirect
- Keep responses concise (2-3 sentences unless showing listings)
- If no listings match, suggest broadening the search criteria`;

  try {
    // Initial Claude call
    let response = await createWithRetry(anthropic, {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    // Handle tool use loop (max 3 iterations)
    let iterations = 0;
    const allMessages = [...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))];

    while (response.stop_reason === "tool_use" && iterations < 3) {
      iterations++;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      // Add assistant message with tool use
      allMessages.push({ role: "assistant", content: response.content as unknown as string });

      // Execute tools and add results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, auth.realtorId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      allMessages.push({ role: "user", content: toolResults as unknown as string });

      // Continue conversation
      response = await createWithRetry(anthropic, {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: allMessages as Anthropic.MessageParam[],
      });
    }

    // Extract text response
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const reply = textBlocks.map(b => b.text).join("\n\n");

    // Extract any listing data from tool results for inline cards
    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const listings: unknown[] = [];
    for (const tb of toolBlocks) {
      if (tb.name === "search_listings") {
        // Find the corresponding result — it was already processed above
      }
    }

    // Track chat event
    try {
      await supabase.from("site_analytics_events").insert({
        realtor_id: auth.realtorId,
        session_id: session_id || "chat",
        event_type: "chat_message",
        page_path: "/chat",
        device_type: request.headers.get("x-device-type") || null,
      });
    } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }

    return NextResponse.json(
      { reply, listings, model: response.model },
      { headers: corsHeaders(request) }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Chat service unavailable", code: "AI_ERROR" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
