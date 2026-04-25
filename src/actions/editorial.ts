'use server';

import { createHmac, randomInt } from 'crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderEdition } from '@/lib/editorial-renderer';
import { extractVoiceRules } from '@/lib/editorial-ai';
import { checkEditorialTierLimit } from '@/lib/editorial-billing';
import {
  generatePersonalizedBlock,
  injectPersonalizedBlock,
  type ContactIntelligence,
  type LeadScore,
} from '@/lib/editorial-personalizer';

// ── Unsubscribe URL helper ────────────────────────────────────────────────────

const UNSUBSCRIBE_PLACEHOLDER = '__UNSUBSCRIBE_URL__';

function buildUnsubscribeUrl(email: string, editionId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? '';
  const ts = Math.floor(Date.now() / 1000);
  const token = createHmac('sha256', secret)
    .update(`${email}:${editionId}:${ts}`)
    .digest('hex');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/editorial/unsubscribe?email=${encodeURIComponent(email)}&edition_id=${encodeURIComponent(editionId)}&token=${token}&ts=${ts}`;
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

    // Create companion analytics row (editorial_analytics table, per migration 115)
    await admin.from('editorial_analytics').upsert(
      { edition_id: edition.id, realtor_id: tc.realtorId },
      { onConflict: 'edition_id', ignoreDuplicates: true },
    );

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

    // ── Tier limit check ─────────────────────────────────────────────────────
    // Only enforce on new generation requests (status = 'draft'), not on
    // re-runs of failed editions (we already counted those when created).
    if (edition.status === 'draft') {
      const adminClient = createAdminClient();
      const tierCheck = await checkEditorialTierLimit(tc.realtorId, adminClient);
      if (!tierCheck.allowed) {
        return {
          data: null,
          error: tierCheck.reason ?? 'Edition limit reached. Upgrade to Pro for unlimited editions.',
        };
      }
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

// ── Subject personalization helper ───────────────────────────────────────────

/**
 * Pick the best subject line for a contact based on their newsletter_intelligence.
 * Pure rule-based — no AI/Claude call. Falls back to subjects[0] when no rule matches.
 *
 * Rules (in priority order):
 * 1. Investment/commercial interest → prefer subjects mentioning investment, ROI, returns, income
 * 2. Cold/dormant (engagement_score < 30) → prefer shorter subjects (< 50 chars) or those with "?" or "you"
 * 3. Has inferred areas → prefer subjects mentioning any of those areas
 * 4. Default → return subjects[0]
 */
function pickPersonalizedSubject(
  subjects: string[],
  intelligence: ContactIntelligence | null,
): string {
  const validSubjects = subjects.filter((s) => s && s.trim().length > 0);
  if (validSubjects.length === 0) return '';
  if (validSubjects.length === 1) return validSubjects[0]!;

  // No intelligence — use primary subject
  if (!intelligence) return validSubjects[0]!;

  const propertyTypes: string[] = intelligence.inferred_interests?.property_types ?? [];
  const inferredAreas: string[] = intelligence.inferred_interests?.areas ?? [];
  const engagementScore = intelligence.engagement_score ?? 50;

  // Rule 1: Investment/commercial property type interest
  const isInvestmentFocused = propertyTypes.some((t) =>
    /investment|commercial|income|multi.?family|rental/i.test(t),
  );
  if (isInvestmentFocused) {
    const investmentKeywords = /investment|roi|returns|income property|cash flow|cap rate|yield/i;
    const match = validSubjects.find((s) => investmentKeywords.test(s));
    if (match) return match;
  }

  // Rule 2: Cold/dormant contacts — prefer curiosity-gap subjects
  if (engagementScore < 30) {
    const coldMatch = validSubjects.find(
      (s) => s.length < 50 || /\?/.test(s) || /\byou\b/i.test(s),
    );
    if (coldMatch) return coldMatch;
  }

  // Rule 3: Inferred area interest — prefer subjects mentioning a known area
  if (inferredAreas.length > 0) {
    const areaMatch = validSubjects.find((s) =>
      inferredAreas.some((area) => s.toLowerCase().includes(area.toLowerCase())),
    );
    if (areaMatch) return areaMatch;
  }

  // Default: return primary subject
  return validSubjects[0]!;
}

// ── 8b. getEditionRecipients ──────────────────────────────────────────────────

export async function getEditionRecipients(
  segmentId?: string,
): Promise<{ name: string; email: string; consent: boolean; suppressed: boolean }[]> {
  try {
    const tc = await getAuthenticatedTenantClient();

    let contactQuery = tc.from('contacts').select('id, name, email, casl_consent_given');

    if (segmentId) {
      const admin = createAdminClient();
      const { data: enrollments } = await admin
        .from('segment_enrollments')
        .select('contact_id')
        .eq('segment_id', segmentId);

      if (!enrollments || enrollments.length === 0) return [];

      const contactIds = enrollments.map((e: { contact_id: string }) => e.contact_id);
      contactQuery = contactQuery.in('id', contactIds) as typeof contactQuery;
    }

    const { data: contacts } = await contactQuery.order('name', { ascending: true });

    // Fetch suppressed IDs
    let suppressedIds = new Set<string>();
    try {
      const suppressionAdmin = createAdminClient();
      const { data: suppressions } = await suppressionAdmin
        .from('contact_suppressions')
        .select('contact_id')
        .eq('realtor_id', tc.realtorId);
      suppressedIds = new Set((suppressions ?? []).map((s: { contact_id: string }) => s.contact_id));
    } catch {
      // table may not exist
    }

    return (contacts ?? []).map((c: { id: string; name: string | null; email: string | null; casl_consent_given: boolean | null }) => ({
      name: c.name ?? '(unnamed)',
      email: c.email ?? '',
      consent: c.casl_consent_given === true,
      suppressed: suppressedIds.has(c.id),
    }));
  } catch {
    return [];
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

    // Fetch realtor's brand profile for email headers + rendering
    const { data: brandProfileData } = await tc
      .from('realtor_brand_profiles')
      .select('display_name, title, brokerage_name, phone, email, brand_color, physical_address, headshot_url, logo_url')
      .eq('realtor_id', tc.realtorId)
      .maybeSingle();

    // 1. Fetch and validate edition
    const { data: edition, error: fetchError } = await tc
      .from('editorial_editions')
      .select('*')
      .eq('id', editionId)
      .single();

    if (fetchError || !edition) {
      return { data: null, error: 'Edition not found' };
    }

    // Prevent accidental re-send of already-sent editions
    if (edition.status === 'sent' && !options?.test_email) {
      return {
        data: null,
        error: `Edition has already been sent on ${edition.sent_at ? new Date(edition.sent_at).toLocaleDateString() : 'a previous date'}. Duplicate sends are blocked to protect your subscriber list.`,
      };
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
          name: brandProfileData?.display_name ?? process.env.AGENT_NAME ?? 'Your Realtor',
          title: brandProfileData?.title ?? 'REALTOR\u00AE',
          brokerage: brandProfileData?.brokerage_name ?? process.env.AGENT_BROKERAGE ?? '',
          phone: brandProfileData?.phone ?? process.env.AGENT_PHONE ?? '',
          email: brandProfileData?.email ?? process.env.AGENT_EMAIL ?? '',
          accentColor: brandProfileData?.brand_color ?? '#FF7A59',
          physicalAddress: brandProfileData?.physical_address ?? process.env.AGENT_PHYSICAL_ADDRESS ?? '',
          headshotUrl: brandProfileData?.headshot_url ?? undefined,
          logoUrl: brandProfileData?.logo_url ?? undefined,
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
    const baseDomain = process.env.RESEND_FROM_EMAIL ?? 'hello@magnate360.com';
    const realtorName = brandProfileData?.display_name ?? process.env.AGENT_NAME ?? '';
    const realtorEmail = brandProfileData?.email ?? process.env.AGENT_EMAIL ?? '';
    const fromEmail = realtorName ? `${realtorName} <${baseDomain}>` : baseDomain;
    const replyToEmail = realtorEmail || undefined;
    const resendApiKey = process.env.RESEND_API_KEY ?? '';

    // 3. Test send — single address, no status update
    if (options?.test_email) {
      let testSent = 0;
      let testFailed = 0;
      try {
        // DEV_EMAIL_MODE=preview → capture to local file, skip Resend
        if (process.env.DEV_EMAIL_MODE === 'preview') {
          const { writeFile, mkdir } = await import('fs/promises')
          const { join } = await import('path')
          const dir = join(process.env.TMPDIR || '/tmp', 'dev-emails')
          await mkdir(dir, { recursive: true })
          const ts = Date.now()
          const safe = subject.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 60).trim().replace(/ /g, '-')
          const file = join(dir, `${ts}-TEST-${safe}.html`)
          await writeFile(file, `<!-- DEV EMAIL PREVIEW\n  To: ${options.test_email}\n  Subject: [TEST] ${subject}\n  Captured: ${new Date().toISOString()}\n-->\n${html}`, 'utf-8')
          console.log(`[DEV_EMAIL] Captured → ${file}`)
          testSent = 1
        } else {
          const testResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [options.test_email],
              reply_to: replyToEmail,
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
    let contactQuery = tc.from('contacts').select('id, name, email, casl_consent_given, notes, newsletter_intelligence, ai_lead_score');

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

    type ContactRow = {
      id: string;
      name: string;
      email: string | null;
      casl_consent_given: boolean | null;
      notes: string | null;
      newsletter_intelligence: Record<string, unknown> | null;
      ai_lead_score: Record<string, unknown> | null;
    };
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
    // Rate-limit Haiku personalization: max 50 contacts get AI blocks.
    // Contacts beyond this cap receive the base HTML (no personalized block).
    const PERSONALIZATION_CAP = 50;
    let sent = 0;
    let failed = 0;
    let personalizedCount = 0;

    for (const contact of sendableContacts) {
      try {
        // Substitute placeholder with a per-recipient HMAC-signed unsubscribe URL
        const htmlWithUnsub = html.replace(
          UNSUBSCRIBE_PLACEHOLDER,
          buildUnsubscribeUrl(contact.email!, editionId),
        );

        // ── Per-contact personalized block injection ─────────────────────────
        // Only inject when the contact has intelligence signals and the cap
        // has not been reached; otherwise fall back to the base HTML.
        let finalHtml = htmlWithUnsub;
        const hasSignals =
          contact.newsletter_intelligence || contact.ai_lead_score || contact.notes;

        if (hasSignals && personalizedCount < PERSONALIZATION_CAP) {
          // 100ms inter-call delay to avoid Haiku burst rate limits
          if (personalizedCount > 0) {
            await new Promise((r) => setTimeout(r, 100));
          }

          const personalizedBlock = await generatePersonalizedBlock({
            contactName: contact.name ?? null,
            notes: (contact.notes as string | null) ?? null,
            intelligence: (contact.newsletter_intelligence as ContactIntelligence | null) ?? null,
            leadScore: (contact.ai_lead_score as LeadScore | null) ?? null,
            editionType: (edition as { edition_type: string }).edition_type,
          });

          finalHtml = injectPersonalizedBlock(htmlWithUnsub, personalizedBlock);
          personalizedCount++;
        }
        // ────────────────────────────────────────────────────────────────────

        // Per-contact subject personalization (rule-based, no AI call).
        // When A/B testing is active, the A/B variant is assigned first, then
        // pickPersonalizedSubject can still swap to the other variant if the
        // contact's intelligence signals make it a better fit.
        const abVariant: 'a' | 'b' = hasABTest && randomInt(0, 2) === 0 ? 'b' : 'a';
        const candidateSubjects = hasABTest
          ? (abVariant === 'b'
              ? [edition.subject_b!, edition.subject_a!]
              : [edition.subject_a!, edition.subject_b!])
          : [subject];
        const resolvedSubject =
          pickPersonalizedSubject(
            candidateSubjects,
            contact.newsletter_intelligence as ContactIntelligence | null,
          ) || subject;

        const tags: Array<{ name: string; value: string }> = [
          { name: 'edition_id', value: editionId },
          { name: 'contact_id', value: contact.id },
        ];
        if (hasABTest) {
          tags.push({ name: 'ab_variant', value: abVariant });
        }

        if (process.env.DEV_EMAIL_MODE === 'preview') {
          // DEV: capture to file instead of sending
          const { writeFile, mkdir } = await import('fs/promises')
          const { join } = await import('path')
          const dir = join(process.env.TMPDIR || '/tmp', 'dev-emails')
          await mkdir(dir, { recursive: true })
          const ts = Date.now()
          const safe = resolvedSubject.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50).trim().replace(/ /g, '-')
          const file = join(dir, `${ts}-${contact.id.slice(0, 8)}-${safe}.html`)
          await writeFile(file, `<!-- DEV\n  To: ${contact.email}\n  Subject: ${resolvedSubject}\n-->\n${finalHtml}`, 'utf-8')
          console.log(`[DEV_EMAIL] → ${file}`)
          sent++
        } else {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [contact.email!],
              reply_to: replyToEmail,
              subject: resolvedSubject,
              html: finalHtml,
              tags,
            }),
          });

          if (response.ok) {
            sent++;

            // Phase 2 fix: insert per-recipient row into newsletters table
            // so editorial sends count toward the global frequency cap
            try {
              const resData = await response.json().catch(() => null);
              await tc.from('newsletters').insert({
                contact_id: contact.id,
                subject: resolvedSubject,
                email_type: 'editorial',
                status: 'sent',
                html_body: finalHtml,
                sent_at: new Date().toISOString(),
                resend_message_id: resData?.id || null,
                send_mode: 'auto',
                ai_context: { source: 'editorial', edition_id: editionId, edition_type: (edition as { edition_type: string }).edition_type },
              });
            } catch {
              // Best effort — don't fail the send loop
            }
          } else {
            failed++;
          }
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
    extractVoiceSignalFromEdition(
      editionId,
      tc.realtorId,
      (edition.blocks as unknown[]) ?? [],
    ).catch(err => {
      console.warn('[sendEdition] Voice learning failed (non-fatal):', err instanceof Error ? err.message : err)
    });

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

// ── 13. updateEditorialSettings ───────────────────────────────────────────────

const editorialSettingsSchema = z.object({
  editorial_auto_draft: z.boolean(),
  default_city: z.string().max(100).optional(),
});

/**
 * Save editorial agent settings:
 *  - `editorial_auto_draft` — opt in/out of Monday auto-draft cron
 *  - `default_city`         — preferred city for market data (stored in preferred_areas[0])
 *
 * Upserts into `realtor_agent_config` using the authenticated user's ID.
 */
export async function updateEditorialSettings(data: {
  editorial_auto_draft: boolean;
  default_city?: string;
}): Promise<ActionResult<void>> {
  try {
    const parsed = editorialSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();

    // Fetch existing preferred_areas so we only overwrite index 0
    const { data: existing } = await admin
      .from('realtor_agent_config')
      .select('preferred_areas')
      .eq('realtor_id', tc.realtorId)
      .maybeSingle();

    const existingAreas: string[] = Array.isArray(existing?.preferred_areas)
      ? (existing.preferred_areas as string[])
      : [];

    let preferredAreas = existingAreas;
    if (parsed.data.default_city) {
      // Replace or set the first element; keep the rest intact
      preferredAreas = [parsed.data.default_city, ...existingAreas.slice(1)];
    }

    const upsertPayload: Record<string, unknown> = {
      realtor_id: tc.realtorId,
      editorial_auto_draft: parsed.data.editorial_auto_draft,
      preferred_areas: preferredAreas,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await admin
      .from('realtor_agent_config')
      .upsert(upsertPayload, { onConflict: 'realtor_id' });

    if (upsertError) {
      return { data: null, error: upsertError.message };
    }

    revalidatePath('/newsletters/settings/sources');
    revalidatePath('/newsletters/editorial');

    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save editorial settings',
    };
  }
}

// ── 14. getEditorialSettings ──────────────────────────────────────────────────

export interface EditorialSettings {
  editorial_auto_draft: boolean;
  default_city: string;
}

export async function getEditorialSettings(): Promise<ActionResult<EditorialSettings>> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from('realtor_agent_config')
      .select('editorial_auto_draft, preferred_areas')
      .eq('realtor_id', tc.realtorId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    const preferredAreas: string[] = Array.isArray(data?.preferred_areas)
      ? (data.preferred_areas as string[])
      : [];

    return {
      data: {
        editorial_auto_draft: (data?.editorial_auto_draft as boolean | null | undefined) ?? false,
        default_city: preferredAreas[0] ?? 'Vancouver, BC',
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch editorial settings',
    };
  }
}

// ── 15. getDataSourceHealth ───────────────────────────────────────────────────

export interface DataSourceHealth {
  name: string;
  cache_key_prefix: string;
  last_fetched: string | null;
  status: 'ok' | 'error' | 'stale';
  error?: string;
}

export async function getDataSourceHealth(): Promise<ActionResult<DataSourceHealth[]>> {
  try {
    const tc = await getAuthenticatedTenantClient();

    // Fetch all cache rows for this realtor
    const { data: cacheRows, error } = await tc
      .from('external_data_cache')
      .select('cache_key, fetched_at, expires_at, fetch_status, fetch_error')
      .order('fetched_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: null, error: error.message };
    }

    // Group by logical source (prefix before the city+date suffix)
    const SOURCE_LABELS: Record<string, string> = {
      market_update:           'Market Update Data',
      just_sold:               'Just Sold Feed',
      rate_watch:              'Mortgage Rate Watch',
      neighbourhood_spotlight: 'Neighbourhood Data',
      open_house:              'Open House Feed',
      seasonal:                'Seasonal Data',
    };

    type CacheRow = {
      cache_key: string;
      fetched_at: string | null;
      expires_at: string | null;
      fetch_status: string | null;
      fetch_error: string | null;
    };

    const seen = new Map<string, DataSourceHealth>();

    for (const row of (cacheRows ?? []) as CacheRow[]) {
      // cache_key format: "{edition_type}_{city}_{yyyy-mm}"
      const prefix = row.cache_key.split('_')[0] ?? row.cache_key;

      if (seen.has(prefix)) continue; // already have the most-recent for this source

      const status: DataSourceHealth['status'] =
        row.fetch_status === 'error'
          ? 'error'
          : row.expires_at && new Date(row.expires_at) < new Date()
          ? 'stale'
          : 'ok';

      seen.set(prefix, {
        name: SOURCE_LABELS[prefix] ?? prefix,
        cache_key_prefix: prefix,
        last_fetched: row.fetched_at,
        status,
        ...(row.fetch_error ? { error: row.fetch_error } : {}),
      });
    }

    // Ensure all source types appear even if never fetched
    const result: DataSourceHealth[] = Object.entries(SOURCE_LABELS).map(([prefix, name]) => {
      return (
        seen.get(prefix) ?? {
          name,
          cache_key_prefix: prefix,
          last_fetched: null,
          status: 'stale' as const,
        }
      );
    });

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch data source health',
    };
  }
}

// ── 16. getSegmentsForPicker ──────────────────────────────────────────────────
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

// ── Supporting types (exported for UI components) ─────────────────────────────

export type ContentLibraryTip = {
  id: string;
  realtor_id: string | null;
  block_type: string;
  content: {
    headline?: string;
    tip_text?: string;
    tip_category?: string;
  };
  context_tags: string[];
  country: string;
  season: string;
  use_count: number;
  created_at: string;
};

// ── 17. upsertVoiceProfile ────────────────────────────────────────────────────
/** Create or update the agent's default voice profile. */
export async function upsertVoiceProfile(data: {
  name: string;
  tone: string;
  style_description: string;
  voice_rules: string[];
  bio_snippet?: string;
  default_sign_off?: string;
  focus_neighbourhoods?: string[];
  market?: string;
  specialties?: string[];
  licence_number?: string;
  brokerage?: string;
  writing_sample?: string;
  is_default: boolean;
}): Promise<ActionResult<EditorialVoiceProfile>> {
  try {
    const tc = await getAuthenticatedTenantClient();

    // Build style_description with optional market/specialties prefix
    let styleDescription = data.style_description;
    if (data.market) {
      const specialtiesStr = data.specialties?.length
        ? ` | Specialties: ${data.specialties.join(', ')}`
        : '';
      styleDescription = `Market: ${data.market}${specialtiesStr}${data.style_description ? `\n${data.style_description}` : ''}`;
    }

    // If a writing sample is provided, extract AI voice rules and merge
    let finalRules = data.voice_rules;
    if (data.writing_sample && data.writing_sample.trim().length > 50) {
      try {
        const extracted = await extractVoiceRules(data.writing_sample, data.tone);
        const combined = [...data.voice_rules, ...extracted].filter(
          (r, i, arr) => r.trim().length > 0 && arr.indexOf(r) === i,
        );
        finalRules = combined.slice(0, 10);
      } catch {
        // Best-effort — do not block the save on AI failure
      }
    }

    const payload: Record<string, unknown> = {
      realtor_id: tc.realtorId,
      name: data.name,
      tone: data.tone,
      writing_style: data.style_description || 'clear-and-direct',
      style_description: styleDescription,
      voice_rules: finalRules,
      preferred_phrases: finalRules,
      bio_snippet: data.bio_snippet ?? null,
      default_sign_off: data.default_sign_off ?? null,
      focus_neighbourhoods: data.focus_neighbourhoods ?? [],
      is_default: data.is_default,
      updated_at: new Date().toISOString(),
    };

    if (data.writing_sample) {
      payload.sample_email = data.writing_sample;
      payload.writing_examples = [data.writing_sample];
    }

    if (data.licence_number || data.brokerage) {
      // Append to signature_phrase field as metadata (no dedicated column)
      const meta = [
        data.licence_number ? `Licence: ${data.licence_number}` : null,
        data.brokerage ? `Brokerage: ${data.brokerage}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      payload.signature_phrase = meta;
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('editorial_voice_profiles')
      .upsert(payload, { onConflict: 'realtor_id' })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/newsletters/editorial');
    revalidatePath('/newsletters/editorial/setup');

    return { data: profile as EditorialVoiceProfile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save voice profile',
    };
  }
}

// ── 18. getContentLibraryTips ─────────────────────────────────────────────────
/** Fetch platform tips (realtor_id IS NULL) + this agent's custom tips. */
export async function getContentLibraryTips(filters?: {
  category?: string;
  season?: string;
  country?: string;
  mine_only?: boolean;
}): Promise<ActionResult<ContentLibraryTip[]>> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();

    // Platform tips — use admin client since realtor_id IS NULL bypasses tenant RLS
    type Tip = ContentLibraryTip;

    let platformData: Tip[] = [];
    if (!filters?.mine_only) {
      let platformQuery = admin
        .from('editorial_content_library')
        .select('*')
        .is('realtor_id', null)
        .eq('block_type', 'quick_tip')
        .order('use_count', { ascending: false })
        .limit(100);

      if (filters?.season && filters.season !== 'all') {
        platformQuery = platformQuery.in('season', [filters.season, 'all']);
      }
      if (filters?.country && filters.country !== 'BOTH') {
        platformQuery = platformQuery.in('country', [filters.country, 'BOTH']);
      }
      if (filters?.category) {
        platformQuery = platformQuery.contains('content', { tip_category: filters.category });
      }

      const { data: pd, error: pe } = await platformQuery;
      if (pe) return { data: null, error: pe.message };
      platformData = (pd ?? []) as Tip[];
    }

    // Agent's own tips
    let myQuery = admin
      .from('editorial_content_library')
      .select('*')
      .eq('realtor_id', tc.realtorId)
      .eq('block_type', 'quick_tip')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.category) {
      myQuery = myQuery.contains('content', { tip_category: filters.category });
    }

    const { data: myData, error: myError } = await myQuery;
    if (myError) return { data: null, error: myError.message };

    return {
      data: [...platformData, ...((myData ?? []) as Tip[])],
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch content library tips',
    };
  }
}

// ── 20. createLibraryTip ──────────────────────────────────────────────────────
/** Create a custom tip in the agent's content library. */
export async function createLibraryTip(data: {
  headline: string;
  tip_text: string;
  tip_category: string;
  season: string;
  country: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();

    const content = {
      headline: data.headline.trim(),
      tip_text: data.tip_text.trim(),
      tip_category: data.tip_category,
    };

    const { data: row, error } = await admin
      .from('editorial_content_library')
      .insert({
        realtor_id: tc.realtorId,
        block_type: 'quick_tip',
        content,
        context_tags: [],
        season: data.season,
        country: data.country,
        use_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/newsletters/library');

    return { data: { id: (row as { id: string }).id }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create tip',
    };
  }
}

// ── 21. getABTests ────────────────────────────────────────────────────────────
/** Return all editorial editions that have A/B subjects configured. */
export async function getABTests(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      edition_type: string;
      status: string;
      subject_a: string | null;
      subject_b: string | null;
      active_variant: string;
      ab_winner: string | null;
      ab_test_sent_at: string | null;
      sent_at: string | null;
      send_count: number;
      created_at: string;
    }>
  >
> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_editions')
      .select(
        'id, title, edition_type, status, subject_a, subject_b, active_variant, ab_winner, ab_test_sent_at, sent_at, send_count, created_at',
      )
      .not('subject_b', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as any, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch A/B tests',
    };
  }
}

// ── 22. getDraftEditions ──────────────────────────────────────────────────────
/** Return draft editions eligible for A/B test configuration. */
export async function getDraftEditions(): Promise<
  ActionResult<Array<{ id: string; title: string; edition_type: string; subject_a: string | null }>>
> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_editions')
      .select('id, title, edition_type, subject_a')
      .in('status', ['draft', 'ready'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as any, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch draft editions',
    };
  }
}

// ── 23. setEditionABSubjects ──────────────────────────────────────────────────
/** Configure subject_a and subject_b on an edition to enable A/B testing. */
export async function setEditionABSubjects(
  editionId: string,
  subjectA: string,
  subjectB: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.safeParse(editionId);
    if (!parsed.success) return { data: null, error: 'Invalid edition ID' };

    const subjectSchema = z.string().min(1).max(500);
    if (!subjectSchema.safeParse(subjectA).success)
      return { data: null, error: 'Subject A is required (max 500 chars)' };
    if (!subjectSchema.safeParse(subjectB).success)
      return { data: null, error: 'Subject B is required (max 500 chars)' };
    if (subjectA.trim() === subjectB.trim())
      return { data: null, error: 'Subject A and B must be different' };

    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_editions')
      .update({
        subject_a: subjectA.trim(),
        subject_b: subjectB.trim(),
        active_variant: 'a',
        updated_at: new Date().toISOString(),
      })
      .eq('id', editionId)
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/newsletters/ab-testing');
    revalidatePath('/newsletters/editorial');

    return { data: { id: (data as { id: string }).id }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to configure A/B test',
    };
  }
}

// ── 24. pickABWinner ─────────────────────────────────────────────────────────
/** Manually pick a winner for an active A/B test. */
export async function pickABWinner(
  editionId: string,
  winner: 'a' | 'b',
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.safeParse(editionId);
    if (!parsed.success) return { data: null, error: 'Invalid edition ID' };
    if (winner !== 'a' && winner !== 'b')
      return { data: null, error: 'Winner must be "a" or "b"' };

    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc
      .from('editorial_editions')
      .update({
        ab_winner: winner,
        active_variant: winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editionId)
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/newsletters/ab-testing');
    revalidatePath('/newsletters/editorial');

    return { data: { id: (data as { id: string }).id }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to pick A/B winner',
    };
  }
}
