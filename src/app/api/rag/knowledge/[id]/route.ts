import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ingestRecord, deleteEmbeddings } from '@/lib/rag/ingestion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH: Update a knowledge article (re-embeds)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase
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
      await ingestRecord('knowledge_articles', id);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete embeddings first
    await deleteEmbeddings('knowledge_articles', id);

    // Delete article
    const { error } = await supabase
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
