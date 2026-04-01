'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestRecord, deleteEmbeddings } from '@/lib/rag/ingestion';

const supabase = createAdminClient();

export async function getKnowledgeArticles(category?: string) {
  let query = supabase
    .from('knowledge_articles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getKnowledgeArticle(id: string) {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createKnowledgeArticle(article: {
  title: string;
  body: string;
  category: string;
  audience_type?: string;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .insert({
      title: article.title,
      body: article.body,
      category: article.category,
      audience_type: article.audience_type || 'all',
      tags: article.tags || [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-embed
  try {
    await ingestRecord(supabase, 'knowledge_articles', data.id);
  } catch (err) {
    console.warn('KB auto-embed failed:', err);
  }

  revalidatePath('/assistant');
  return data;
}

export async function updateKnowledgeArticle(
  id: string,
  updates: Partial<{
    title: string;
    body: string;
    category: string;
    audience_type: string;
    tags: string[];
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Re-embed with updated content
  try {
    await ingestRecord(supabase, 'knowledge_articles', id);
  } catch (err) {
    console.warn('KB re-embed failed:', err);
  }

  revalidatePath('/assistant');
  return data;
}

export async function deleteKnowledgeArticle(id: string) {
  await deleteEmbeddings(supabase, 'knowledge_articles', id);

  const { error } = await supabase
    .from('knowledge_articles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/assistant');
}
