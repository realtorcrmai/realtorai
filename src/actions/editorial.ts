'use server';

import { createHmac } from 'crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderEdition } from '@/lib/editorial-renderer';
import { extractVoiceRules } from '@/lib/editorial-ai';

// ── Unsubscribe URL helper ────────────────────────────────────────────────────

const UNSUBSCRIBE_PLACEHOLDER = '__UNSUBSCRIBE_URL__';

function buildUnsubscribeUrl(email: string, editionId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? '';
  const token = createHmac('sha256', secret)
    .update(`${email}:${editionId}`)
    .digest('hex');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/editorial/unsubscribe?email=${encodeURIComponent(email)}&edition_id=${encodeURIComponent(editionId)}&token=${token}`;
}
import type {
  EditorialEdition,
  EditorialVoiceProfile,
  EditorialTransaction,
  EditorBlock,
  ActionResult,
  SendEditionResult,
  GenerationStatus,
} from '@/types/editorial';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Blocks that carry real content (not structural dividers) */
function isContentBlock(block: EditorBlock): boolean {
  return block.type !== 'divider';
}

/** A content block is considered "filled" when its content object has at least
 *  one non-null, non-empty-string value beyond what an empty default would hold. */
function isFilledBlock(block: EditorBlock): boolean {
  if (!isContentBlock(block)) return false;
  const values = Object.values(block.content as unknown as Record<string, unknown>);
  return values.some(
    (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Invalid ID format');

const createEditionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  edition_type: z.string().min(1, 'Edition type is required'),
  blocks: z.array(z.any()).optional(),
});

const updateEditionSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  subject_a: z.string().min(1).max(500).optional(),
  subject_b: z.string().min(1).max(500).optional(),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const voiceProfileSchema = z.object({
  tone: z.string().min(1, 'Tone is required'),
  writing_style: z.string().min(1, 'Writing style is required'),
  signature_phrase: z.string().optional(),
  sample_email: z.string().optional(),
});

// ── 1. getEditions ────────────────────────────────────────────────────────────

export async function getEditions(
  filters?: { status?: string; edition_type?: string },
): Promise<ActionResult<EditorialEdition[]>> {
  try {
    const tc = await getAuthenticatedTenantClient();

    let query = tc
      .from('editorial_editions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.edition_type) {
      query = query.eq('edition_type', filters.edition_type);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data ?? []) as EditorialEdition[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch editions' };
  }
}

// ── 2. getEdition ─────────────────────────────────────────────────────────────

export async function getEdition(id: string): Promise<ActionResult<EditorialEdition>> {
  try {
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from('editorial_editions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Edition not found' };
    }

    return { data: data as EditorialEdition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch edition' };
  }
}

// ── 3. createEdition ──────────────────────────────────────────────────────────

export async function createEdition(input: {
  title: string;
  edition_type: string;
  blocks?: EditorBlock[];
}): Promise<ActionResult<EditorialEdition>> {
  try {
    const parsed = createEditionSchema.safeParse(input);
    if (!parsed.success) {
      return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();

    // Compute next edition_number per-realtor and insert atomically.
    // Retry up to 3 times on unique constraint violation (TOCTOU race guard).
    // Requires UNIQUE(realtor_id, edition_number) on editorial_editions.
    let edition: EditorialEdition | null = null;
    let insertError: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: maxRow } = await admin
        .from('editorial_editions')
        .select('edition_number')
        .eq('realtor_id', tc.realtorId)
        .order('edition_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (maxRow?.edition_number ?? 0) + 1;

      const { data: inserted, error: err } = await tc
        .from('editorial_editions')
        .insert({
          title: parsed.data.title,
          edition_type: parsed.data.edition_type,
          blocks: parsed.data.blocks ?? [],
          edition_number: nextNumber,
          status: 'draft',
          active_variant: 'a',
          send_count: 0,
          recipient_count: 0,
        })
        .select()
        .single();

      if (!err) {
        edition = inserted as EditorialEdition;
        insertError = null;
        break;
      }

      // 23505 = unique_violation in PostgreSQL — retry on number collision
      const isUniqueViolation =
        err.code === '23505' ||
        err.message?.toLowerCase().includes('unique') ||
        err.message?.toLowerCase().includes('duplicate');

      if (!isUniqueViolation || attempt === 2) {
        insertError = err;
        break;
      }
      // Back off briefly before next attempt
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
    }

    if (insertError || !edition) {
      return { data: null, error: insertError?.message ?? 'Failed to create edition' };
    }

    // Create companion analytics row (newsletter_analytics table, columns per migration 113)
    await admin.from('newsletter_analytics').insert({
      edition_id: edition.id,
      realtor_id: tc.realtorId,
      recipient_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
      unsubscribe_count: 0,
    });

    revalidatePath('/newsletters/editorial');

    return { data: edition as EditorialEdition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create edition' };
  }
}

// ── 4. updateEdition ──────────────────────────────────────────────────────────

export async function updateEdition(
  id: string,
  input: Partial<Pick<EditorialEdition, 'title' | 'subject_a' | 'subject_b' | 'scheduled_at'>>,
): Promise<ActionResult<EditorialEdition>> {
  try {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const parsed = updateEditionSchema.safeParse(input);
    if (!parsed.success) {
      return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    // Build update payload from only the fields provided
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
    if (parsed.data.subject_a !== undefined) updatePayload.subject_a = parsed.data.subject_a;
    if (parsed.data.subject_b !== undefined) updatePayload.subject_b = parsed.data.subject_b;
    if ('scheduled_at' in parsed.data) updatePayload.scheduled_at = parsed.data.scheduled_at;

    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from('editorial_editions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Edition not found or update failed' };
    }

    revalidatePath('/newsletters/editorial');

    return { data: data as EditorialEdition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update edition' };
  }
}

// ── 5. updateBlocks ───────────────────────────────────────────────────────────

export async function updateBlocks(
  editionId: string,
  blocks: EditorBlock[],
): Promise<ActionResult<void>> {
  try {
    const idParsed = uuidSchema.safeParse(editionId);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    if (blocks.length > 15) {
      return { data: null, error: 'Maximum 15 blocks per edition.' }
    }

    const tc = await getAuthenticatedTenantClient();

    // Confirm edition belongs to this realtor
    const { data: existing, error: fetchError } = await tc
      .from('editorial_editions')
      .select('id')
      .eq('id', editionId)
      .single();

    if (fetchError || !existing) {
      return { data: null, error: 'Edition not found' };
    }

    const { error } = await tc
      .from('editorial_editions')
      .update({ blocks, updated_at: new Date().toISOString() })
      .eq('id', editionId);

    if (error) {
      return { data: null, error: error.message };
    }

    // Intentionally no revalidatePath — called frequently during editing
    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update blocks' };
  }
}

// ── 6. reorderBlocks ─────────────────────────────────────────────────────────

export async function reorderBlocks(
  editionId: string,
  orderedIds: string[],
): Promise<ActionResult<void>> {
  try {
    const idParsed = uuidSchema.safeParse(editionId);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { data: null, error: 'orderedIds must be a non-empty array' };
    }

    const tc = await getAuthenticatedTenantClient();

    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('id, blocks')
      .eq('id', editionId)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    const currentBlocks: EditorBlock[] = (edition.blocks as EditorBlock[]) ?? [];

    // Validate: all orderedIds must match existing block ids
    const existingIds = new Set(currentBlocks.map((b) => b.id));
    const missingIds = orderedIds.filter((oid) => !existingIds.has(oid));
    if (missingIds.length > 0) {
      return { data: null, error: `Block IDs not found in edition: ${missingIds.join(', ')}` };
    }

    // Reorder: build a lookup map then reconstruct in the requested order
    const blockMap = new Map(currentBlocks.map((b) => [b.id, b]));
    const reordered = orderedIds.map((oid) => blockMap.get(oid)!);

    // Append any blocks not included in orderedIds at the end (defensive)
    const orderedSet = new Set(orderedIds);
    for (const block of currentBlocks) {
      if (!orderedSet.has(block.id)) {
        reordered.push(block);
      }
    }

    const { error: updateError } = await tc
      .from('editorial_editions')
      .update({ blocks: reordered, updated_at: new Date().toISOString() })
      .eq('id', editionId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    revalidatePath('/newsletters/editorial');

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reorder blocks' };
  }
}

// ── 7. deleteEdition ──────────────────────────────────────────────────────────

export async function deleteEdition(id: string): Promise<ActionResult<void>> {
  try {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const tc = await getAuthenticatedTenantClient();

    // Fetch to check status before deleting
    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    if (edition.status === 'sent') {
      return { data: null, error: 'Cannot delete a sent edition. Archive it instead.' };
    }

    const { error: deleteError } = await tc
      .from('editorial_editions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    revalidatePath('/newsletters/editorial');

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete edition' };
  }
}

// ── 8. triggerGeneration ─────────────────────────────────────────────────────

export async function triggerGeneration(
  editionId: string,
): Promise<ActionResult<{ started: boolean }>> {
  try {
    const idParsed = uuidSchema.safeParse(editionId);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const tc = await getAuthenticatedTenantClient();

    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('id, status, blocks')
      .eq('id', editionId)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    const allowedStatuses: string[] = ['draft', 'failed'];
    if (!allowedStatuses.includes(edition.status)) {
      return {
        data: null,
        error: `Cannot trigger generation for an edition with status "${edition.status}". Only draft or failed editions can be regenerated.`,
      };
    }

    // Guard: too many blocks will cause generation to timeout (Vercel 30s limit)
    const rawBlocks = Array.isArray(edition.blocks) ? edition.blocks : []
    if (rawBlocks.length > 15) {
      return {
        data: null,
        error: `Edition has ${rawBlocks.length} blocks. Maximum is 15. Please remove some blocks before generating.`,
      }
    }

    // Mark as generating immediately
    const { error: updateError } = await tc
      .from('editorial_editions')
      .update({
        status: 'generating',
        generation_started_at: new Date().toISOString(),
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editionId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // Fire-and-forget — do NOT await
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    fetch(`${baseUrl}/api/editorial/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
      },
      body: JSON.stringify({ edition_id: editionId }),
    }).catch(() => {
      // Intentionally swallow — the generation route handles its own error state
    });

    revalidatePath('/newsletters/editorial');

    return { data: { started: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to trigger generation',
    };
  }
}

// ── 9. sendEdition ────────────────────────────────────────────────────────────

export async function sendEdition(
  editionId: string,
  options?: { segment_id?: string; test_email?: string },
): Promise<ActionResult<SendEditionResult>> {
  try {
    const idParsed = uuidSchema.safeParse(editionId);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const tc = await getAuthenticatedTenantClient();

    // 1. Fetch and validate edition
    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('*')
      .eq('id', editionId)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    if (edition.status !== 'ready') {
      return {
        data: null,
        error: `Edition must be in "ready" status before sending. Current status: "${edition.status}".`,
      };
    }

    // 2. Render edition HTML once (shared across all recipients)
    let html: string;
    try {
      const typedEdition = edition as EditorialEdition;
      html = await renderEdition({
        title: typedEdition.title,
        edition_type: typedEdition.edition_type,
        // The renderer has its own inlined EditorBlock with content: Record<string,unknown>
        // which is structurally compatible — cast through unknown to satisfy both types
        blocks: typedEdition.blocks as unknown as Parameters<typeof renderEdition>[0]['blocks'],
        branding: {
          name: process.env.AGENT_NAME ?? 'Your Realtor',
          title: 'REALTOR\u00AE',
          brokerage: process.env.AGENT_BROKERAGE ?? '',
          phone: process.env.AGENT_PHONE ?? '',
          email: process.env.AGENT_EMAIL ?? '',
          accentColor: '#FF7A59',
          // Required for CASL/CAN-SPAM compliance — physical mailing address in footer
          physicalAddress: process.env.AGENT_PHYSICAL_ADDRESS ?? process.env.AGENT_BROKERAGE ?? '',
        },
        // Use placeholder — replaced per-recipient in the send loop with a signed URL
        unsubscribe_url: UNSUBSCRIBE_PLACEHOLDER,
      });
    } catch (renderErr) {
      return {
        data: null,
        error: `Failed to render edition: ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`,
      };
    }

    const subject = edition.subject_a ?? edition.title;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'hello@realtors360.ai';
    const resendApiKey = process.env.RESEND_API_KEY ?? '';

    // 3. Test send — single address, no status update
    if (options?.test_email) {
      let testSent = 0;
      let testFailed = 0;
      try {
        const testResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [options.test_email],
            subject: `[TEST] ${subject}`,
            html,
            tags: [
              { name: 'edition_id', value: editionId },
              { name: 'send_type', value: 'test' },
            ],
          }),
        });
        if (testResponse.ok) {
          testSent = 1;
        } else {
          testFailed = 1;
        }
      } catch {
        testFailed = 1;
      }

      return {
        data: { sent: testSent, skipped: 0, failed: testFailed, edition_id: editionId },
        error: null,
      };
    }

    // 4. Fetch eligible contacts
    let contactQuery = tc.from('contacts').select('id, name, email, casl_consent_given');

    if (options?.segment_id) {
      // Fetch contact IDs from the segment first, then filter
      const admin = createAdminClient();
      const { data: segmentData, error: segmentError } = await admin
        .from('contact_segments')
        .select('rules, rule_operator')
        .eq('id', options.segment_id)
        .eq('realtor_id', tc.realtorId)
        .single();

      // If the segment doesn't exist or lookup failed, abort — do NOT fall
      // through to a full-list send, which would be a silent over-send.
      if (segmentError || !segmentData) {
        return {
          data: null,
          error: `Segment not found or inaccessible (id: ${options.segment_id})`,
        };
      }

      // Fetch enrolled contact IDs for this segment
      const { data: enrollments, error: enrollError } = await admin
        .from('segment_enrollments')
        .select('contact_id')
        .eq('segment_id', options.segment_id);

      if (enrollError) {
        return { data: null, error: enrollError.message };
      }

      if (!enrollments || enrollments.length === 0) {
        // Segment exists but has no members — return zero-send result immediately
        await tc
          .from('editorial_editions')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            send_count: 0,
            recipient_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editionId);
        revalidatePath('/newsletters/editorial');
        return { data: { sent: 0, skipped: 0, failed: 0, edition_id: editionId }, error: null };
      }

      const contactIds = enrollments.map((e: { contact_id: string }) => e.contact_id);
      contactQuery = contactQuery.in('id', contactIds) as typeof contactQuery;
    }

    const { data: contacts, error: contactsError } = await contactQuery;

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    type ContactRow = { id: string; name: string; email: string | null; casl_consent_given: boolean | null };
    const allContacts: ContactRow[] = (contacts ?? []) as ContactRow[];

    // 5a. Fetch suppressed contact IDs (fail-safe: table may not exist yet)
    let suppressedContactIds = new Set<string>();
    try {
      const suppressionAdmin = createAdminClient();
      const { data: suppressions } = await suppressionAdmin
        .from('contact_suppressions')
        .select('contact_id')
        .eq('realtor_id', tc.realtorId);
      suppressedContactIds = new Set((suppressions ?? []).map((s: { contact_id: string }) => s.contact_id));
    } catch {
      // suppression table may not exist yet — proceed without it
    }

    // 5b. Filter by CASL consent, valid email, and not suppressed
    const sendableContacts = allContacts.filter(
      (c) =>
        c.casl_consent_given === true &&
        c.email &&
        c.email.trim().length > 0 &&
        !suppressedContactIds.has(c.id),
    );

    const skipped = allContacts.length - sendableContacts.length;

    // 6. Determine A/B split mode
    const hasABTest =
      !options?.test_email &&
      edition.subject_a &&
      edition.subject_b &&
      edition.subject_a !== edition.subject_b;

    // 7. Send to each contact
    let sent = 0;
    let failed = 0;

    for (const contact of sendableContacts) {
      try {
        // Substitute placeholder with a per-recipient HMAC-signed unsubscribe URL
        const personalizedHtml = html.replace(
          UNSUBSCRIBE_PLACEHOLDER,
          buildUnsubscribeUrl(contact.email!, editionId),
        );

        // A/B split: randomly assign each recipient to variant 'a' or 'b'
        const abVariant: 'a' | 'b' = hasABTest && Math.random() < 0.5 ? 'b' : 'a';
        const resolvedSubject = hasABTest
          ? (abVariant === 'b' ? edition.subject_b! : edition.subject_a!)
          : subject;

        const tags: Array<{ name: string; value: string }> = [
          { name: 'edition_id', value: editionId },
          { name: 'contact_id', value: contact.id },
        ];
        if (hasABTest) {
          tags.push({ name: 'ab_variant', value: abVariant });
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [contact.email!],
            subject: resolvedSubject,
            html: personalizedHtml,
            tags,
          }),
        });

        if (response.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // 8. Update edition status and counts
    const nowIso = new Date().toISOString();
    const editionUpdate: Record<string, unknown> = {
      status: 'sent',
      sent_at: nowIso,
      send_count: sent,
      recipient_count: allContacts.length,
      updated_at: nowIso,
    };
    if (hasABTest) {
      editionUpdate.active_variant = 'ab_testing';
      editionUpdate.ab_test_sent_at = nowIso;
    }
    await tc
      .from('editorial_editions')
      .update(editionUpdate)
      .eq('id', editionId);

    // 8. Update analytics
    const admin = createAdminClient();
    await admin
      .from('editorial_analytics')
      .update({
        recipients: allContacts.length,
        updated_at: new Date().toISOString(),
      })
      .eq('edition_id', editionId);

    revalidatePath('/newsletters/editorial');

    // Fire-and-forget voice learning — never fails the send
    void extractVoiceSignalFromEdition(
      editionId,
      tc.realtorId,
      (edition.blocks as unknown[]) ?? [],
    );

    return {
      data: { sent, skipped, failed, edition_id: editionId },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to send edition' };
  }
}

// ── 9a. extractVoiceSignalFromEdition (private) ───────────────────────────────

async function extractVoiceSignalFromEdition(
  editionId: string,
  realtorId: string,
  blocks: unknown[],
): Promise<void> {
  try {
    const admin = createAdminClient();

    // Get the realtor's voice profile
    const { data: voiceProfile } = await admin
      .from('editorial_voice_profiles')
      .select('id, voice_version, preferred_phrases, voice_rules')
      .eq('realtor_id', realtorId)
      .single();

    if (!voiceProfile) return; // No profile to update

    // Extract text content from all text-bearing blocks
    const textContent: string[] = [];
    for (const block of blocks) {
      const b = block as Record<string, unknown>;
      const content = (b.content ?? {}) as Record<string, unknown>;
      for (const val of Object.values(content)) {
        if (typeof val === 'string' && val.length > 20) {
          textContent.push(val.slice(0, 200));
        }
      }
    }

    if (textContent.length === 0) return;

    // Extract voice rules from the edition's text blocks
    const emailSample = textContent.slice(0, 5).join('\n\n');
    const newRules = await extractVoiceRules(emailSample, 'professional');

    if (!newRules || newRules.length === 0) return;

    // Merge new rules with existing, deduplicate, cap at 30
    const existingPreferred = (voiceProfile.preferred_phrases as string[] | null) ?? [];
    const merged = [...new Set([...existingPreferred, ...newRules])].slice(0, 30);

    // Increment voice_version and update confidence_score
    const newVersion = ((voiceProfile.voice_version as number | null) ?? 1) + 1;
    // Confidence grows with more editions: after 5 → 0.25, after 10 → 0.5, after 20 → 1.0
    const confidence = Math.min(1.0, newVersion / 20);

    await admin
      .from('editorial_voice_profiles')
      .update({
        preferred_phrases: merged,
        voice_version: newVersion,
        confidence_score: parseFloat(confidence.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', (voiceProfile as { id: string }).id);

    console.log(
      `[voice-learning] edition=${editionId} realtor=${realtorId} v${newVersion} confidence=${confidence.toFixed(2)} rules=${merged.length}`,
    );
  } catch (err) {
    // Voice learning is best-effort — never fail the send
    console.warn('[voice-learning] Failed to extract voice signal:', err);
  }
}

// ── 10. getVoiceProfile ───────────────────────────────────────────────────────

export async function getVoiceProfile(): Promise<ActionResult<EditorialVoiceProfile | null>> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from('editorial_voice_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    // Not found is not an error — return null
    return { data: (data as EditorialVoiceProfile | null) ?? null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch voice profile',
    };
  }
}

// ── 11. saveVoiceProfile ──────────────────────────────────────────────────────

export async function saveVoiceProfile(input: {
  tone: string;
  writing_style: string;
  signature_phrase?: string;
  sample_email?: string;
}): Promise<ActionResult<EditorialVoiceProfile>> {
  try {
    const parsed = voiceProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const tc = await getAuthenticatedTenantClient();

    // Extract voice rules from sample email if provided
    let voiceRules: string[] = [];
    if (parsed.data.sample_email && parsed.data.sample_email.trim().length > 0) {
      try {
        voiceRules = await extractVoiceRules(parsed.data.sample_email, parsed.data.tone);
      } catch {
        // Non-fatal — proceed without extracted rules
        voiceRules = [];
      }
    }

    // Fetch current version to increment it
    const { data: existing } = await tc
      .from('editorial_voice_profiles')
      .select('voice_version')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((existing as { voice_version?: number } | null)?.voice_version ?? 0) + 1;

    const upsertPayload: Record<string, unknown> = {
      tone: parsed.data.tone,
      style_description: parsed.data.writing_style,
      preferred_phrases: voiceRules,
      avoid_phrases: [],
      writing_examples: parsed.data.sample_email ? [parsed.data.sample_email] : [],
      default_sign_off: parsed.data.signature_phrase ?? null,
      is_default: true,
      voice_version: nextVersion,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await tc
      .from('editorial_voice_profiles')
      .upsert(upsertPayload, { onConflict: 'realtor_id' })
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Failed to save voice profile' };
    }

    revalidatePath('/newsletters/editorial');

    return { data: data as EditorialVoiceProfile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save voice profile',
    };
  }
}

// ── Transaction Manager ────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100).default('Vancouver'),
  province: z.string().min(1).max(50).default('BC'),
  transaction_type: z.enum(['just_sold', 'just_listed', 'coming_soon', 'price_reduced']).default('just_sold'),
  sale_price: z.number().int().positive().nullable().optional(),
  list_price: z.number().int().positive(),
  days_on_market: z.number().int().nonnegative().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().positive().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  headline: z.string().max(120).nullable().optional(),
  story: z.string().max(600).nullable().optional(),
  sold_at: z.string().nullable().optional(),
  listed_at: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
});

export async function listTransactions(): Promise<ActionResult<EditorialTransaction[]>> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as EditorialTransaction[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch transactions' };
  }
}

export async function createTransaction(
  input: z.infer<typeof transactionSchema>,
): Promise<ActionResult<EditorialTransaction>> {
  try {
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message };
    const tc = await getAuthenticatedTenantClient();
    // tc.insert() auto-injects realtor_id — do not pass it explicitly
    const { data, error } = await tc
      .from('editorial_transactions')
      .insert({ ...parsed.data })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/newsletters/editorial');
    return { data: data as EditorialTransaction, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create transaction' };
  }
}

export async function updateTransaction(
  id: string,
  input: Partial<z.infer<typeof transactionSchema>>,
): Promise<ActionResult<EditorialTransaction>> {
  try {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return { data: null, error: 'Invalid transaction ID' };
    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_transactions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/newsletters/editorial');
    return { data: data as EditorialTransaction, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update transaction' };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult<null>> {
  try {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return { data: null, error: 'Invalid transaction ID' };
    const tc = await getAuthenticatedTenantClient();
    const { error } = await tc.from('editorial_transactions').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidatePath('/newsletters/editorial');
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete transaction' };
  }
}

// ── 12. getGenerationStatus ───────────────────────────────────────────────────

export async function getGenerationStatus(
  editionId: string,
): Promise<ActionResult<GenerationStatus>> {
  try {
    const idParsed = uuidSchema.safeParse(editionId);
    if (!idParsed.success) {
      return { data: null, error: 'Invalid edition ID' };
    }

    const tc = await getAuthenticatedTenantClient();

    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('id, status, generation_started_at, generation_error, blocks')
      .eq('id', editionId)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    const blocks: EditorBlock[] = (edition.blocks as EditorBlock[]) ?? [];

    // Compute progress: filled content blocks / total content blocks * 100
    const contentBlocks = blocks.filter(isContentBlock);
    const filledBlocks = contentBlocks.filter(isFilledBlock);

    const progress =
      contentBlocks.length === 0
        ? 0
        : Math.round((filledBlocks.length / contentBlocks.length) * 100);

    // Identify the current block being generated: first unfilled content block
    const currentBlock = contentBlocks.find((b) => !isFilledBlock(b));

    const result: GenerationStatus = {
      status: edition.status as GenerationStatus['status'],
      progress,
      ...(currentBlock ? { current_block: currentBlock.type.replace(/_/g, ' ') } : {}),
      ...(edition.generation_error ? { error: edition.generation_error } : {}),
    };

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch generation status',
    };
  }
}

// ── 13. getSegmentsForPicker ──────────────────────────────────────────────────
/** Lightweight segment list for the send-dialog picker. */
export async function getSegmentsForPicker(): Promise<
  Array<{ id: string; name: string; contact_count?: number }>
> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data } = await tc
      .from('contact_segments')
      .select('id, name, contact_count')
      .order('name', { ascending: true })
      .limit(100);

    type SegmentRow = { id: string; name: string; contact_count?: number | null };
    return ((data ?? []) as SegmentRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      ...(s.contact_count !== null && s.contact_count !== undefined
        ? { contact_count: s.contact_count }
        : {}),
    }));
  } catch {
    return [];
  }
}
