import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerIngest } from "@/lib/rag/realtime-ingest";

/**
 * POST /api/webhooks/competitor-email
 *
 * Receives forwarded competitor emails for ingestion into the RAG system.
 * Expected payload:
 * {
 *   source: "compass" | "royal_lepage" | "sothebys" | "remax" | "zillow" | string,
 *   from_email: string,
 *   subject: string,
 *   body_text: string,
 *   html_body?: string,
 *   email_type?: string,
 *   received_at?: string
 * }
 *
 * Auth: Bearer token via CRON_SECRET (shared with cron endpoints).
 */
export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.source || !body.subject || !body.body_text) {
      return NextResponse.json(
        { error: "Missing required fields: source, subject, body_text" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Insert into competitive_emails table
    const { data, error } = await supabase
      .from("competitive_emails")
      .insert({
        source: body.source,
        from_email: body.from_email || null,
        subject: body.subject,
        body_text: body.body_text,
        html_body: body.html_body || null,
        email_type: body.email_type || null,
        received_at: body.received_at || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[competitor-email] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger RAG embedding for the new competitor email
    if (data) {
      triggerIngest("competitive_emails", data.id);
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
      message: "Competitor email ingested and queued for embedding",
    });
  } catch (err) {
    console.error("[competitor-email] Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
