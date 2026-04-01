// ============================================================
// Unified Agent — CRM Tool Definitions (Vercel AI SDK)
// ============================================================
// Factory that creates 36 tenant-scoped tools for the unified agent.
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
// Phase 2 parameter schemas (tools 11-20)
// ---------------------------------------------------------------------------

const createShowingRequestParams = z.object({
  listing_id: z.string().uuid().describe('The listing to schedule a showing for'),
  buyer_agent_name: z.string().min(1).describe('Name of the buyer agent'),
  buyer_agent_phone: z.string().min(1).describe('Phone number of the buyer agent'),
  buyer_agent_email: z.string().email().optional().describe('Email of the buyer agent'),
  start_time: z.string().describe('Showing start time in ISO 8601 format'),
  notes: z.string().optional().describe('Optional notes for the showing'),
});

const getShowingDetailsParams = z.object({
  showing_id: z.string().uuid().describe('The appointment UUID'),
});

const updateShowingStatusParams = z.object({
  showing_id: z.string().uuid().describe('The appointment UUID'),
  status: z
    .enum(['confirmed', 'denied', 'cancelled', 'completed'])
    .describe('New status for the showing'),
});

const getWorkflowStatusParams = z.object({
  listing_id: z.string().uuid().describe('The listing UUID'),
});

const getNewsletterDraftsParams = z.object({});

const approveNewsletterParams = z.object({
  newsletter_id: z.string().uuid().describe('The newsletter UUID to approve'),
});

const getDealDetailsParams = z.object({
  contact_id: z.string().uuid().optional().describe('Filter by contact'),
  listing_id: z.string().uuid().optional().describe('Filter by listing'),
});

const getContactCommunicationsParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
  limit: z.number().int().min(1).max(50).default(10).describe('Max results'),
});

const addContactNoteParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
  body: z.string().min(1).describe('Note content'),
});

const getListingDocumentsParams = z.object({
  listing_id: z.string().uuid().describe('The listing UUID'),
});

// ---------------------------------------------------------------------------
// Phase 3 parameter schemas (tools 21-36)
// ---------------------------------------------------------------------------

const completeTaskParams = z.object({
  task_id: z.string().uuid().describe('The task UUID to complete'),
});

const updateTaskPriorityParams = z.object({
  task_id: z.string().uuid().describe('The task UUID'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('New priority'),
});

const searchKnowledgeArticlesParams = z.object({
  query: z.string().min(1).describe('Search term for article title or body'),
});

const getContactJourneyParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const getEngagementScoreParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const generateMLSRemarksParams = z.object({
  listing_id: z.string().uuid().describe('The listing UUID to generate remarks for'),
});

const getContactTagsParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const updateContactStageParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
  stage: z.string().min(1).describe('New stage value for stage_bar'),
});

const getHouseholdMembersParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const getReferralsParams = z.object({
  contact_id: z.string().uuid().describe('The contact UUID'),
});

const getFormStatusParams = z.object({
  listing_id: z.string().uuid().describe('The listing UUID'),
});

const emptyParams = z.object({});

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

    // =======================================================================
    // Phase 2 Tools (11-20)
    // =======================================================================

    // -----------------------------------------------------------------------
    // 11. Create Showing Request
    // -----------------------------------------------------------------------
    createShowingRequest: tool({
      description:
        'Create a new showing request (appointment) for a listing. Inserts into the appointments table with status "requested". Use this when a buyer agent wants to schedule a viewing.',
      inputSchema: createShowingRequestParams,
      execute: async (params: z.infer<typeof createShowingRequestParams>) => {
        const { listing_id, buyer_agent_name, buyer_agent_phone, buyer_agent_email, start_time, notes } = params;
        const { data, error } = await db
          .from('appointments')
          .insert({
            listing_id,
            buyer_agent_name,
            buyer_agent_phone,
            buyer_agent_email: buyer_agent_email ?? null,
            start_time,
            notes: notes ?? null,
            status: 'requested',
          })
          .select()
          .single();

        if (error) return { error: error.message, appointment: null };
        return { appointment: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 12. Get Showing Details
    // -----------------------------------------------------------------------
    getShowingDetails: tool({
      description:
        'Get full details for a single showing (appointment) by ID, including the linked listing. Use this to drill into a specific showing request.',
      inputSchema: getShowingDetailsParams,
      execute: async (params: z.infer<typeof getShowingDetailsParams>) => {
        const { showing_id } = params;
        const { data, error } = await db
          .from('appointments')
          .select('*, listings(id, address, list_price, status)')
          .eq('id', showing_id)
          .single();

        if (error) return { error: error.message, showing: null };
        return { showing: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 13. Update Showing Status
    // -----------------------------------------------------------------------
    updateShowingStatus: tool({
      description:
        'Update the status of a showing request. Use this to confirm, deny, cancel, or mark a showing as completed.',
      inputSchema: updateShowingStatusParams,
      execute: async (params: z.infer<typeof updateShowingStatusParams>) => {
        const { showing_id, status } = params;
        const { data, error } = await db
          .from('appointments')
          .update({ status })
          .eq('id', showing_id)
          .select()
          .single();

        if (error) return { error: error.message, showing: null };
        return { showing: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 14. Get Workflow Status
    // -----------------------------------------------------------------------
    getWorkflowStatus: tool({
      description:
        'Get the current workflow phase for a listing. Returns the phase number and a human-readable description of what that phase involves.',
      inputSchema: getWorkflowStatusParams,
      execute: async (params: z.infer<typeof getWorkflowStatusParams>) => {
        const { listing_id } = params;
        const { data, error } = await db
          .from('listings')
          .select('id, address, current_phase, status')
          .eq('id', listing_id)
          .single();

        if (error) return { error: error.message, workflow: null };

        const phaseDescriptions: Record<number, string> = {
          1: 'Seller Intake — FINTRAC identity, property details, commissions',
          2: 'Data Enrichment — BC Geocoder, ParcelMap, LTSA, Assessment',
          3: 'CMA Analysis — Comparable market analysis',
          4: 'Pricing & Review — List price confirmation, marketing tier',
          5: 'Form Generation — 12 BCREA forms auto-filled',
          6: 'E-Signature — DocuSign envelope tracking',
          7: 'MLS Preparation — AI remarks generation, photo management',
          8: 'MLS Submission — Final submission step',
        };

        return {
          workflow: {
            listing_id: data.id,
            address: data.address,
            current_phase: data.current_phase,
            phase_description: phaseDescriptions[data.current_phase] ?? 'Unknown phase',
            listing_status: data.status,
          },
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 15. Get Newsletter Drafts
    // -----------------------------------------------------------------------
    getNewsletterDrafts: tool({
      description:
        'Get newsletter drafts awaiting approval. Returns up to 10 drafts ordered by creation date. Use this when the realtor asks about pending emails or the approval queue.',
      inputSchema: getNewsletterDraftsParams,
      execute: async (_params: z.infer<typeof getNewsletterDraftsParams>) => {
        const { data, error } = await db
          .from('newsletters')
          .select('id, subject, contact_id, listing_id, status, quality_score, created_at')
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) return { error: error.message, drafts: [] };
        return { drafts: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 16. Approve Newsletter
    // -----------------------------------------------------------------------
    approveNewsletter: tool({
      description:
        'Approve a newsletter draft, changing its status from "draft" to "approved". Use this when the realtor wants to approve a pending email.',
      inputSchema: approveNewsletterParams,
      execute: async (params: z.infer<typeof approveNewsletterParams>) => {
        const { newsletter_id } = params;
        const { data, error } = await db
          .from('newsletters')
          .update({ status: 'approved' })
          .eq('id', newsletter_id)
          .eq('status', 'draft')
          .select()
          .single();

        if (error) return { error: error.message, newsletter: null };
        return { newsletter: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 17. Get Deal Details
    // -----------------------------------------------------------------------
    getDealDetails: tool({
      description:
        'Get deal/pipeline details for a contact or listing. Use this when the realtor asks about the status of a deal or transaction.',
      inputSchema: getDealDetailsParams,
      execute: async (params: z.infer<typeof getDealDetailsParams>) => {
        const { contact_id, listing_id } = params;
        let q = db
          .from('deals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (contact_id) q = q.eq('contact_id', contact_id);
        if (listing_id) q = q.eq('listing_id', listing_id);

        const { data, error } = await q;
        if (error) return { error: error.message, deals: [] };
        return { deals: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 18. Get Contact Communications
    // -----------------------------------------------------------------------
    getContactCommunications: tool({
      description:
        'Get recent communications (emails, SMS, notes) for a contact. Use this when the realtor asks about past interactions with a client.',
      inputSchema: getContactCommunicationsParams,
      execute: async (params: z.infer<typeof getContactCommunicationsParams>) => {
        const { contact_id, limit } = params;
        const { data, error } = await db
          .from('communications')
          .select('*')
          .eq('contact_id', contact_id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) return { error: error.message, communications: [] };
        return { communications: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 19. Add Contact Note
    // -----------------------------------------------------------------------
    addContactNote: tool({
      description:
        'Add a note to a contact\'s communication timeline. Use this when the realtor wants to log a note, observation, or reminder about a client.',
      inputSchema: addContactNoteParams,
      execute: async (params: z.infer<typeof addContactNoteParams>) => {
        const { contact_id, body } = params;
        const { data, error } = await db
          .from('communications')
          .insert({
            contact_id,
            direction: 'internal',
            channel: 'note',
            body,
          })
          .select()
          .single();

        if (error) return { error: error.message, note: null };
        return { note: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 20. Get Listing Documents
    // -----------------------------------------------------------------------
    getListingDocuments: tool({
      description:
        'Get all documents associated with a listing (forms, disclosures, contracts). Use this when the realtor asks about paperwork status for a property.',
      inputSchema: getListingDocumentsParams,
      execute: async (params: z.infer<typeof getListingDocumentsParams>) => {
        const { listing_id } = params;
        const { data, error } = await db
          .from('listing_documents')
          .select('*')
          .eq('listing_id', listing_id)
          .order('created_at', { ascending: false });

        if (error) return { error: error.message, documents: [] };
        return { documents: data ?? [] };
      },
    }),

    // =======================================================================
    // Phase 3 Tools (21-36)
    // =======================================================================

    // -----------------------------------------------------------------------
    // 21. Complete Task
    // -----------------------------------------------------------------------
    completeTask: tool({
      description:
        'Mark a task as completed and record the completion timestamp. Use this when the realtor says they finished a task.',
      inputSchema: completeTaskParams,
      execute: async (params: z.infer<typeof completeTaskParams>) => {
        const { task_id } = params;
        const { data, error } = await db
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', task_id)
          .select()
          .single();

        if (error) return { error: error.message, task: null };
        return { task: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 22. Update Task Priority
    // -----------------------------------------------------------------------
    updateTaskPriority: tool({
      description:
        'Change the priority of a task. Use this when the realtor wants to escalate or de-escalate a task.',
      inputSchema: updateTaskPriorityParams,
      execute: async (params: z.infer<typeof updateTaskPriorityParams>) => {
        const { task_id, priority } = params;
        const { data, error } = await db
          .from('tasks')
          .update({ priority })
          .eq('id', task_id)
          .select()
          .single();

        if (error) return { error: error.message, task: null };
        return { task: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 23. Search Knowledge Articles
    // -----------------------------------------------------------------------
    searchKnowledgeArticles: tool({
      description:
        'Search knowledge base articles by title or body text. Use this when the realtor asks about processes, compliance rules, or how-to questions.',
      inputSchema: searchKnowledgeArticlesParams,
      execute: async (params: z.infer<typeof searchKnowledgeArticlesParams>) => {
        const { query } = params;
        const pattern = `%${query}%`;
        const { data, error } = await db
          .from('knowledge_articles')
          .select('id, title, body, category, created_at')
          .or(`title.ilike.${pattern},body.ilike.${pattern}`)
          .limit(10);

        if (error) return { error: error.message, articles: [] };
        return { articles: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 24. Get Contact Journey
    // -----------------------------------------------------------------------
    getContactJourney: tool({
      description:
        'Get the email journey enrollment(s) for a contact — their current phase, trust level, and next scheduled email. Use this to understand where a contact is in their nurture sequence.',
      inputSchema: getContactJourneyParams,
      execute: async (params: z.infer<typeof getContactJourneyParams>) => {
        const { contact_id } = params;
        const { data, error } = await db
          .from('contact_journeys')
          .select('*')
          .eq('contact_id', contact_id)
          .order('created_at', { ascending: false });

        if (error) return { error: error.message, journeys: [] };
        return { journeys: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 25. Get Engagement Score
    // -----------------------------------------------------------------------
    getEngagementScore: tool({
      description:
        'Get a contact\'s newsletter engagement score and intelligence data (open rates, click history, interests). Use this to understand how engaged a contact is with emails.',
      inputSchema: getEngagementScoreParams,
      execute: async (params: z.infer<typeof getEngagementScoreParams>) => {
        const { contact_id } = params;
        const { data, error } = await db
          .from('contacts')
          .select('id, name, newsletter_intelligence')
          .eq('id', contact_id)
          .single();

        if (error) return { error: error.message, engagement: null };
        return {
          engagement: {
            contact_id: data.id,
            name: data.name,
            intelligence: data.newsletter_intelligence,
          },
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 26. Get Active Listings
    // -----------------------------------------------------------------------
    getActiveListings: tool({
      description:
        'Get all listings with status "active". Use this for a quick overview of the realtor\'s current active inventory.',
      inputSchema: emptyParams,
      execute: async (_params: z.infer<typeof emptyParams>) => {
        const { data, error } = await db
          .from('listings')
          .select('id, address, list_price, current_phase, property_type, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) return { error: error.message, listings: [] };
        return { listings: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 27. Get Pending Showings
    // -----------------------------------------------------------------------
    getPendingShowings: tool({
      description:
        'Get all showings with status "requested" or "pending". Use this when the realtor asks what showings need attention.',
      inputSchema: emptyParams,
      execute: async (_params: z.infer<typeof emptyParams>) => {
        const { data, error } = await db
          .from('appointments')
          .select('*, listings(id, address)')
          .in('status', ['requested', 'pending'])
          .order('start_time', { ascending: true });

        if (error) return { error: error.message, showings: [] };
        return { showings: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 28. Get Overdue Tasks
    // -----------------------------------------------------------------------
    getOverdueTasks: tool({
      description:
        'Get tasks that are past due (due_date before now and not completed). Use this when the realtor asks about overdue items or things they missed.',
      inputSchema: emptyParams,
      execute: async (_params: z.infer<typeof emptyParams>) => {
        const { data, error } = await db
          .from('tasks')
          .select('*')
          .lt('due_date', new Date().toISOString())
          .neq('status', 'completed')
          .order('due_date', { ascending: true });

        if (error) return { error: error.message, tasks: [] };
        return { tasks: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 29. Get Recent Activity
    // -----------------------------------------------------------------------
    getRecentActivity: tool({
      description:
        'Get the last 10 communications across all contacts. Use this for a quick activity feed or when the realtor asks "what happened recently".',
      inputSchema: emptyParams,
      execute: async (_params: z.infer<typeof emptyParams>) => {
        const { data, error } = await db
          .from('communications')
          .select('*, contacts(id, name)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) return { error: error.message, activities: [] };
        return { activities: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 30. Generate MLS Remarks
    // -----------------------------------------------------------------------
    generateMLSRemarks: tool({
      description:
        'Generate AI-powered MLS public and realtor remarks for a listing. Fetches listing details and calls the content service to produce remarks. Use this when the realtor is preparing a listing for MLS.',
      inputSchema: generateMLSRemarksParams,
      execute: async (params: z.infer<typeof generateMLSRemarksParams>) => {
        const { listing_id } = params;

        // Fetch listing data for context
        const { data: listing, error: listingErr } = await db
          .from('listings')
          .select('*')
          .eq('id', listing_id)
          .single();

        if (listingErr || !listing) {
          return { error: listingErr?.message ?? 'Listing not found', remarks: null };
        }

        const contentServiceUrl = process.env.CONTENT_GENERATOR_URL ?? 'http://localhost:8769';
        try {
          const res = await fetch(`${contentServiceUrl}/api/mls-remarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listing }),
          });

          if (!res.ok) {
            return { error: `Content service returned ${res.status}`, remarks: null };
          }

          const data = await res.json();
          return {
            remarks: {
              listing_id,
              public_remarks: data.public_remarks ?? null,
              realtor_remarks: data.realtor_remarks ?? null,
            },
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : 'Failed to generate MLS remarks',
            remarks: null,
          };
        }
      },
    }),

    // -----------------------------------------------------------------------
    // 31. Get Contact Tags
    // -----------------------------------------------------------------------
    getContactTags: tool({
      description:
        'Get tags associated with a contact. Use this when the realtor asks about a contact\'s categories or labels.',
      inputSchema: getContactTagsParams,
      execute: async (params: z.infer<typeof getContactTagsParams>) => {
        const { contact_id } = params;
        const { data, error } = await db
          .from('contacts')
          .select('id, name, tags')
          .eq('id', contact_id)
          .single();

        if (error) return { error: error.message, tags: [] };
        return { contact_id: data.id, name: data.name, tags: data.tags ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 32. Update Contact Stage
    // -----------------------------------------------------------------------
    updateContactStage: tool({
      description:
        'Update a contact\'s pipeline stage (stage_bar field). Use this when the realtor moves a contact through their pipeline.',
      inputSchema: updateContactStageParams,
      execute: async (params: z.infer<typeof updateContactStageParams>) => {
        const { contact_id, stage } = params;
        const { data, error } = await db
          .from('contacts')
          .update({ stage_bar: stage })
          .eq('id', contact_id)
          .select('id, name, stage_bar')
          .single();

        if (error) return { error: error.message, contact: null };
        return { contact: data };
      },
    }),

    // -----------------------------------------------------------------------
    // 33. Get Household Members
    // -----------------------------------------------------------------------
    getHouseholdMembers: tool({
      description:
        'Get household members linked to a contact. Use this when the realtor asks about a client\'s family or household connections.',
      inputSchema: getHouseholdMembersParams,
      execute: async (params: z.infer<typeof getHouseholdMembersParams>) => {
        const { contact_id } = params;

        // Get the household_id for the contact first
        const { data: contact, error: contactErr } = await db
          .from('contacts')
          .select('id, name, household_id')
          .eq('id', contact_id)
          .single();

        if (contactErr || !contact) {
          return { error: contactErr?.message ?? 'Contact not found', members: [] };
        }

        if (!contact.household_id) {
          return { members: [], message: 'Contact is not part of a household' };
        }

        const { data, error } = await db
          .from('contacts')
          .select('id, name, phone, email, type, relationship')
          .eq('household_id', contact.household_id);

        if (error) return { error: error.message, members: [] };
        return { household_id: contact.household_id, members: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------------
    // 34. Get Referrals
    // -----------------------------------------------------------------------
    getReferrals: tool({
      description:
        'Get referral relationships for a contact — both referrals they made and referrals they received. Use this when the realtor asks about a client\'s referral history.',
      inputSchema: getReferralsParams,
      execute: async (params: z.infer<typeof getReferralsParams>) => {
        const { contact_id } = params;

        const [givenRes, receivedRes] = await Promise.all([
          db
            .from('referrals')
            .select('*, referred:referred_id(id, name)')
            .eq('referrer_id', contact_id),
          db
            .from('referrals')
            .select('*, referrer:referrer_id(id, name)')
            .eq('referred_id', contact_id),
        ]);

        return {
          given: givenRes.error ? [] : (givenRes.data ?? []),
          received: receivedRes.error ? [] : (receivedRes.data ?? []),
          given_error: givenRes.error?.message ?? null,
          received_error: receivedRes.error?.message ?? null,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 35. Get Form Status
    // -----------------------------------------------------------------------
    getFormStatus: tool({
      description:
        'Get the forms_status JSONB field for a listing — shows which BCREA forms have been generated, signed, or are pending. Use this when the realtor asks about form/document readiness.',
      inputSchema: getFormStatusParams,
      execute: async (params: z.infer<typeof getFormStatusParams>) => {
        const { listing_id } = params;
        const { data, error } = await db
          .from('listings')
          .select('id, address, forms_status')
          .eq('id', listing_id)
          .single();

        if (error) return { error: error.message, forms_status: null };
        return {
          listing_id: data.id,
          address: data.address,
          forms_status: data.forms_status,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // 36. Get Dashboard Stats
    // -----------------------------------------------------------------------
    getDashboardStats: tool({
      description:
        'Get summary counts for the dashboard: active listings, pending showings, open tasks, and total contacts. Use this when the realtor asks for an overview or "how are things looking".',
      inputSchema: emptyParams,
      execute: async (_params: z.infer<typeof emptyParams>) => {
        const [listingsRes, showingsRes, tasksRes, contactsRes] = await Promise.all([
          db
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          db
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .in('status', ['requested', 'pending']),
          db
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'completed'),
          db
            .from('contacts')
            .select('id', { count: 'exact', head: true }),
        ]);

        return {
          active_listings: listingsRes.count ?? 0,
          pending_showings: showingsRes.count ?? 0,
          open_tasks: tasksRes.count ?? 0,
          total_contacts: contactsRes.count ?? 0,
        };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Type export for consumers
// ---------------------------------------------------------------------------
export type AgentTools = ReturnType<typeof createAgentTools>;
