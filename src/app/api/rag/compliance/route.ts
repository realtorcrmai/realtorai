import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/rag/compliance — Export all RAG data for authenticated user (PIPEDA compliance)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data, error } = await admin.rpc('rag_export_user_data', {
      p_user_email: session.user.email,
    });

    if (error) {
      // Fallback if RPC doesn't exist yet
      if (error.code === '42883') {
        const { data: sessions } = await admin
          .from('rag_sessions')
          .select('id, ui_context, messages, tone_preference, is_active, created_at, updated_at')
          .eq('user_email', session.user.email)
          .order('created_at', { ascending: false });

        return NextResponse.json({
          user_email: session.user.email,
          exported_at: new Date().toISOString(),
          sessions: sessions ?? [],
        });
      }
      throw error;
    }

    return NextResponse.json({
      user_email: session.user.email,
      exported_at: new Date().toISOString(),
      records: data ?? [],
    });
  } catch (err) {
    console.error('RAG compliance export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/rag/compliance — Delete all RAG data for authenticated user (PIPEDA right to be forgotten)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data, error } = await admin.rpc('rag_delete_user_data', {
      p_user_email: session.user.email,
    });

    if (error) {
      // Fallback if RPC doesn't exist yet
      if (error.code === '42883') {
        await admin.from('rag_sessions').delete().eq('user_email', session.user.email);
        await admin.from('rag_audit_log').delete().eq('user_email', session.user.email);
        return NextResponse.json({ deleted: true, message: 'All RAG data deleted' });
      }
      throw error;
    }

    return NextResponse.json({
      deleted: true,
      records_removed: data,
      message: 'All RAG data deleted per PIPEDA request',
    });
  } catch (err) {
    console.error('RAG compliance delete error:', err);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
