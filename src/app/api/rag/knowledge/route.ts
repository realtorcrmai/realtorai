import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ingestRecord } from '@/lib/rag/ingestion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all knowledge articles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('knowledge_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ articles: data });
  } catch (err) {
    console.error('Knowledge list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new knowledge article (auto-embeds)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, body: articleBody, category, audience_type, tags } = body;

    if (!title || !articleBody || !category) {
      return NextResponse.json({ error: 'title, body, and category are required' }, { status: 400 });
    }

    const validCategories = ['faq', 'playbook', 'script', 'explainer', 'process'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('knowledge_articles')
      .insert({
        title,
        body: articleBody,
        category,
        audience_type: audience_type || 'all',
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-embed the new article
    try {
      await ingestRecord('knowledge_articles', data.id);
    } catch (embedErr) {
      console.warn('Auto-embed failed (article saved):', embedErr);
    }

    return NextResponse.json({ article: data }, { status: 201 });
  } catch (err) {
    console.error('Knowledge create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
