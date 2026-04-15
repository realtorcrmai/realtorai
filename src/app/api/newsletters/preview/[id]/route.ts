import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * GET /api/newsletters/preview/:id
 * Render a newsletter's HTML in full browser view.
 * Used by realtors to preview emails before approving.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: newsletter } = await supabase
    .from("newsletters")
    .select("id, subject, html_body, email_type, status, contact_id")
    .eq("id", id)
    .single();

  if (!newsletter) {
    return new NextResponse("<h1>Newsletter not found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!newsletter.html_body) {
    return new NextResponse("<h1>No email content</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Inject a small toolbar at the top for context
  const toolbar = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1535;color:#fff;padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-size:13px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
      <span style="font-weight:600;">Preview</span>
      <span style="opacity:0.7;">${escapeHtml(newsletter.subject)}</span>
      <span style="margin-left:auto;opacity:0.5;font-size:11px;">${escapeHtml(newsletter.email_type)} &middot; ${escapeHtml(newsletter.status)}</span>
      <a href="/newsletters" style="color:#a78bfa;text-decoration:none;font-size:12px;">&larr; Back</a>
    </div>
    <div style="height:40px;"></div>
  `;

  return new NextResponse(toolbar + newsletter.html_body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
