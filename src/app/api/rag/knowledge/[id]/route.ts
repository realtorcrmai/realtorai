import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestRecord, deleteEmbeddings } from '@/lib/rag/ingestion';

// PATCH: Update a knowledge article (re-embeds)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (session.user as { role?: string }).role === 'admin';
    const db = isAdmin
      ? createAdminClient()
      : (await getAuthenticatedTenantClient()).raw;

    const { id } = await params;
    const body = await req.json();

    const { data, error } = await db
      .from('knowledge_articles')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Re-embed with updated content
    try {
      await ingestRecord(db, 'knowledge_articles', id);
    } catch (embedErr) {
      console.warn('Re-embed failed (article updated):', embedErr);
    }

    return NextResponse.json({ article: data });
  } catch (err) {
    console.error('Knowledge update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a knowledge article + its embeddings
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (session.user as { role?: string }).role === 'admin';
    const db = isAdmin
      ? createAdminClient()
      : (await getAuthenticatedTenantClient()).raw;

    const { id } = await params;

    // Delete embeddings first
    await deleteEmbeddings(db, 'knowledge_articles', id);

    // Delete article
    const { error } = await db
      .from('knowledge_articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('Knowledge delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
