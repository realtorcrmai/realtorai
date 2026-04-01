// ============================================================
// Unified Agent — CRM Tool Definitions (Vercel AI SDK)
// ============================================================
// Factory that creates 10 tenant-scoped tools for the unified agent.
// Each tool receives a SupabaseClient via closure — the caller creates
// the tenant-scoped client and passes it in.
// ============================================================

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { retrieveContext } from '@/lib/rag/retriever';
import type { ContentType } from '@/lib/rag/types';

// ---------------------------------------------------------------------------
// Parameter schemas (extracted for z.infer typing on execute callbacks)
// ---------------------------------------------------------------------------

const searchKnowledgeParams = z.object({
  query: z.string().describe('Natural-language search query'),
  content_type: z
    .array(
      z.enum([
        'message', 'email', 'activity', 'profile', 'listing',
        'recommendation', 'template', 'offer', 'faq', 'playbook',
        'script', 'process', 'explainer', 'competitor', 'social_post',
      ])
    )
    .optional()
    .describe('Optional filter by content type(s)'),
  contact_id: z.string().uuid().optional().describe('Scope results to a specific contact'),
  listing_id: z.string().uuid().optional().describe('Scope results to a specific listing'),
  top_k: z.number().int().min(1).max(20).optional().describe('Number of results (default 5)'),
});

const searchContactsParams = z.object({
  query: z.string().min(1).describe('Search term — name, email, or phone fragment'),
});

const getContactParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const searchListingsParams = z.object({
  query: z.string().min(1).describe('Address or address fragment to search'),
  status: z
    .enum(['active', 'pending', 'sold', 'expired', 'withdrawn', 'draft'])
    .optional()
    .describe('Optional status filter'),
});

const getListingParams = z.object({
  listing_id: z.string().uuid().describe('The listing UUID'),
});

const createTaskParams = z.object({
  title: z.string().min(1).describe('Task title'),
  description: z.string().optional().describe('Optional detailed description'),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .default('medium')
    .describe('Task priority'),
  category: z
    .enum([
      'follow_up', 'showing', 'document', 'listing',
      'marketing', 'inspection', 'closing', 'general',
    ])
    .default('general')
    .describe('Task category'),
  due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
  contact_id: z.string().uuid().optional().describe('Link task to a contact'),
  listing_id: z.string().uuid().optional().describe('Link task to a listing'),
});

const getTasksParams = z.object({
  contact_id: z.string().uuid().optional().describe('Filter tasks by contact'),
  listing_id: z.string().uuid().optional().describe('Filter tasks by listing'),
  status: z
    .enum(['pending', 'in_progress', 'completed'])
    .default('pending')
    .describe('Task status filter'),
  limit: z.number().int().min(1).max(25).default(10).describe('Max results'),
});

const checkCalendarParams = z.object({
  from_date: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format (defaults to today)'),
  listing_id: z.string().uuid().optional().describe('Filter by listing'),
  status: z
    .enum(['pending', 'confirmed', 'denied', 'cancelled', 'completed'])
    .optional()
    .describe('Filter by appointment status'),
  limit: z.number().int().min(1).max(25).default(10).describe('Max results'),
});

const draftEmailParams = z.object({
  contact_id: z.string().uuid().describe('Recipient contact ID'),
  subject: z.string().min(1).describe('Email subject line'),
  body: z.string().min(1).describe('Email body text (plain text or markdown)'),
  listing_id: z.string().uuid().optional().describe('Related listing for context'),
});

const getShowingsParams = z.object({
  status: z
    .enum(['pending', 'confirmed', 'denied', 'cancelled', 'completed'])
    .optional()
    .describe('Filter by showing status (omit for all)'),
  listing_id: z.string().uuid().optional().describe('Filter by listing'),
  limit: z.number().int().min(1).max(25).default(10).describe('Max results'),
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAgentTools(db: SupabaseClient) {
  return {
    // -----------------------------------------------------------------------
    // 1. RAG Knowledge Search
    // -----------------------------------------------------------------------
    searchKnowledge: tool({
      description:
        'Search the knowledge base using semantic (RAG) search. Use this to find answers about real estate processes, BCREA forms, compliance rules, past communications, listing details, or any factual question the realtor might ask.',
      inputSchema: searchKnowledgeParams,
      execute: async (params: z.infer<typeof searchKnowledgeParams>) => {
        const { query, content_type, contact_id, listing_id, top_k } = params;
        const result = await retrieveContext(
          db,
          query,
          {
            content_type: content_type as ContentType[] | undefined,
            contact_id,
            listing_id,
          },
          top_k ?? 5,
        );
        return {
          context: result.formatted,
          sources: result.sources,
          result_count: result.results.length,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 2. Search Contacts
    // -----------------------------------------------------------------------
    searchContacts: tool({
      description:
        'Search CRM contacts by name, email, or phone number. Returns up to 5 matching contacts with key fields. Use this when the realtor asks about a person or wants to find a client.',
      inputSchema: searchContactsParams,
      execute: async (params: z.infer<typeof searchContactsParams>) => {
        const { query } = params;
        const pattern = `%${query}%`;
        const { data, error } = await db
          .from('contacts')
          .select('id, name, phone, email, type, stage_bar, lead_status')
          .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(5);

        if (error) return { error: error.message, contacts: [] };
        return { contacts: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 3. Get Contact Details
    // -----------------------------------------------------------------------
    getContact: tool({
      description:
        'Get full details for a single contact by ID, including a count of recent communications. Use this after searchContacts to drill into a specific person.',
      inputSchema: getContactParams,
      execute: async (params: z.infer<typeof getContactParams>) => {
        const { contact_id } = params;
        const [contactRes, commsRes] = await Promise.all([
          db.from('contacts').select('*').eq('id', contact_id).single(),
          db
            .from('communications')
            .select('id', { count: 'exact', head: true })
            .eq('contact_id', contact_id),
        ]);

        if (contactRes.error) return { error: contactRes.error.message, contact: null };

        return {
          contact: contactRes.data,
          recent_communications_count: commsRes.count ?? 0,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 4. Search Listings
    // -----------------------------------------------------------------------
    searchListings: tool({
      description:
        'Search property listings by address. Returns up to 5 matching listings with key fields like price, status, phase, and property type.',
      inputSchema: searchListingsParams,
      execute: async (params: z.infer<typeof searchListingsParams>) => {
        const { query, status } = params;
        let q = db
          .from('listings')
          .select('id, address, list_price, status, current_phase, property_type')
          .ilike('address', `%${query}%`)
          .limit(5);

        if (status) q = q.eq('status', status);

        const { data, error } = await q;
        if (error) return { error: error.message, listings: [] };
        return { listings: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 5. Get Listing Details
    // -----------------------------------------------------------------------
    getListing: tool({
      description:
        'Get full details for a single listing by ID. Returns all listing fields including price, phase, forms status, enrichment data, and seller info.',
      inputSchema: getListingParams,
      execute: async (params: z.infer<typeof getListingParams>) => {
        const { listing_id } = params;
        const { data, error } = await db
          .from('listings')
          .select('*, contacts!listings_seller_id_fkey(id, name, phone, email)')
          .eq('id', listing_id)
          .single();

        if (error) return { error: error.message, listing: null };
        return { listing: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 6. Create Task
    // -----------------------------------------------------------------------
    createTask: tool({
      description:
        'Create a new task in the CRM. Use this when the realtor asks you to remind them of something, schedule a follow-up, or track an action item.',
      inputSchema: createTaskParams,
      execute: async (params: z.infer<typeof createTaskParams>) => {
        const { title, description, priority, category, due_date, contact_id, listing_id } = params;
        const { data, error } = await db
          .from('tasks')
          .insert({
            title,
            description: description ?? null,
            priority,
            category,
            due_date: due_date ?? null,
            contact_id: contact_id ?? null,
            listing_id: listing_id ?? null,
          })
          .select()
          .single();

        if (error) return { error: error.message, task: null };
        return { task: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 7. Get Tasks
    // -----------------------------------------------------------------------
    getTasks: tool({
      description:
        'Get open tasks, optionally filtered by contact. Returns up to 10 tasks ordered by due date (soonest first). Use this when the realtor asks "what do I need to do" or "any tasks for [contact]".',
      inputSchema: getTasksParams,
      execute: async (params: z.infer<typeof getTasksParams>) => {
        const { contact_id, listing_id, status, limit } = params;
        let q = db
          .from('tasks')
          .select('*')
          .eq('status', status)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(limit);

        if (contact_id) q = q.eq('contact_id', contact_id);
        if (listing_id) q = q.eq('listing_id', listing_id);

        const { data, error } = await q;
        if (error) return { error: error.message, tasks: [] };
        return { tasks: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 8. Check Calendar / Upcoming Appointments
    // -----------------------------------------------------------------------
    checkCalendar: tool({
      description:
        'Check upcoming showings and appointments. Returns the next 10 appointments from today onwards. Use this when the realtor asks about their schedule or availability.',
      inputSchema: checkCalendarParams,
      execute: async (params: z.infer<typeof checkCalendarParams>) => {
        const { from_date, listing_id, status, limit } = params;
        const startDate = from_date ?? new Date().toISOString().split('T')[0];

        let q = db
          .from('appointments')
          .select('*, listings(id, address)')
          .gte('start_time', `${startDate}T00:00:00`)
          .order('start_time', { ascending: true })
          .limit(limit);

        if (listing_id) q = q.eq('listing_id', listing_id);
        if (status) q = q.eq('status', status);

        const { data, error } = await q;
        if (error) return { error: error.message, appointments: [] };
        return { appointments: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 9. Draft Email
    // -----------------------------------------------------------------------
    draftEmail: tool({
      description:
        'Compose an email draft for a contact. Does NOT send — returns the draft for the realtor to review and approve. Use this when the realtor asks to write or send an email.',
      inputSchema: draftEmailParams,
      execute: async (params: z.infer<typeof draftEmailParams>) => {
        const { contact_id, subject, body, listing_id } = params;
        // Look up the contact to include their name/email in the draft
        const { data: contact, error: contactErr } = await db
          .from('contacts')
          .select('id, name, email')
          .eq('id', contact_id)
          .single();

        if (contactErr || !contact) {
          return { error: contactErr?.message ?? 'Contact not found', draft: null };
        }

        if (!contact.email) {
          return { error: `Contact "${contact.name}" has no email address on file`, draft: null };
        }

        return {
          draft: {
            to_name: contact.name,
            to_email: contact.email,
            subject,
            body,
            contact_id,
            listing_id: listing_id ?? null,
            status: 'draft',
            created_at: new Date().toISOString(),
          },
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 10. Get Showing Requests
    // -----------------------------------------------------------------------
    getShowings: tool({
      description:
        'Get showing requests (appointments) with optional status filter. Returns showings with the linked listing address. Use this when the realtor asks about pending showings, confirmed viewings, etc.',
      inputSchema: getShowingsParams,
      execute: async (params: z.infer<typeof getShowingsParams>) => {
        const { status, listing_id, limit } = params;
        let q = db
          .from('appointments')
          .select('*, listings(id, address)')
          .order('start_time', { ascending: false })
          .limit(limit);

        if (status) q = q.eq('status', status);
        if (listing_id) q = q.eq('listing_id', listing_id);

        const { data, error } = await q;
        if (error) return { error: error.message, showings: [] };
        return { showings: data ?? [] };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Type export for consumers
// ---------------------------------------------------------------------------
export type AgentTools = ReturnType<typeof createAgentTools>;
