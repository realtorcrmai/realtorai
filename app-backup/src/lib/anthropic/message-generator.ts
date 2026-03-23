import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generateMessageContent(
  intent: string,
  channel: "email" | "sms" | "whatsapp",
  contact: {
    name: string;
    type: string;
    stage_bar?: string | null;
  },
  listing?: {
    address?: string;
    list_price?: number;
  } | null,
  agentName?: string,
): Promise<{ subject?: string; body: string }> {
  const channelGuidance = channel === "sms" || channel === "whatsapp"
    ? "Keep the message under 160 characters. Be casual and friendly."
    : "Write a professional but warm email. Include a greeting and sign-off.";

  const prompt = `You are a real estate assistant writing a ${channel} message for a BC realtor.

Context:
- Contact: ${contact.name} (${contact.type}, stage: ${contact.stage_bar || "unknown"})
- Agent: ${agentName || "the realtor"}
${listing ? `- Property: ${listing.address || "N/A"}, Price: $${listing.list_price?.toLocaleString() || "N/A"}` : ""}

Intent: ${intent}

${channelGuidance}

${channel === "email" ? 'Return JSON: { "subject": "...", "body": "..." }' : 'Return JSON: { "body": "..." }'}

Return ONLY valid JSON, no markdown.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    return JSON.parse(text);
  } catch {
    // If JSON parsing fails, use the raw text as body
    return { body: text };
  }
}
