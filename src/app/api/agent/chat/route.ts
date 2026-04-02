import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAgentTools } from '@/lib/agent/tools';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a helpful AI assistant for Realtors360, a real estate CRM for British Columbia realtors.

You have access to tools that let you search CRM data and take actions. Use them when the user asks about contacts, listings, showings, tasks, calendar, or knowledge.

Rules:
- Always search before answering questions about CRM data — never make up information.
- When you find data, cite the source (contact name, listing address, etc.).
- For write operations (create task, draft email), confirm with the user before executing.
- Be concise and professional. Realtors are busy.
- If you don't know something, say so — don't hallucinate.
- Never expose sensitive data (SIN, passport numbers, bank details).
- Respect the context: if the user is on a specific contact or listing page, prioritize that entity.

BC Real Estate Knowledge:
- FINTRAC identity verification required for sellers
- CASL consent required before outbound messages
- Standard forms: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3
- MLS remarks max 500 characters each (public + REALTOR)
- Listing workflow: 8 phases from intake to MLS submission
`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, uiContext } = await req.json();

    const isAdmin = (session.user as { role?: string }).role === 'admin';
    const db = isAdmin
      ? createAdminClient()
      : (await getAuthenticatedTenantClient()).raw;

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;
    if (uiContext?.page_type) {
      contextPrompt += `\n\nThe user is currently on the ${uiContext.page_type} page.`;
    }
    if (uiContext?.contact_id) {
      contextPrompt += ` They're viewing contact ID: ${uiContext.contact_id}. Prioritize this contact in your responses.`;
    }
    if (uiContext?.listing_id) {
      contextPrompt += ` They're viewing listing ID: ${uiContext.listing_id}. Prioritize this listing in your responses.`;
    }

    // Create tenant-scoped tools
    const tools = createAgentTools(db);

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: contextPrompt,
      messages,
      tools,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('Agent chat error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
