import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { SECRET_FIELDS, maskSecret } from "@/lib/constants/integrations";

/** GET /api/settings/integrations - list all integrations for current user */
export async function GET() {
  const { session, unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const email = session!.user.email!;

  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_email", email)
    .order("provider");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask secret fields before returning
  const masked = (data ?? []).map((row) => ({
    ...row,
    config: maskConfig(row.config as Record<string, string>),
  }));

  return NextResponse.json(masked);
}

/** POST /api/settings/integrations - create or update an integration */
export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { provider, config, is_active } = body;

  if (!provider) {
    return NextResponse.json(
      { error: "Provider is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const email = session!.user.email!;

  // Check if integration already exists
  const { data: existing } = await supabase
    .from("user_integrations")
    .select("id, config")
    .eq("user_email", email)
    .eq("provider", provider)
    .single();

  if (existing) {
    // Merge new config with existing — keep existing values for masked fields
    const mergedConfig = { ...((existing.config as Record<string, string>) ?? {}) };
    if (config) {
      for (const [key, value] of Object.entries(config as Record<string, string>)) {
        // Only update if the value isn't a masked placeholder
        if (value && !String(value).startsWith("••••")) {
          mergedConfig[key] = value;
        }
      }
    }

    const { data, error } = await supabase
      .from("user_integrations")
      .update({
        config: mergedConfig,
        is_active: is_active ?? existing.config !== null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ...data,
      config: maskConfig(data.config as Record<string, string>),
    });
  } else {
    // Create new
    const { data, error } = await supabase
      .from("user_integrations")
      .insert({
        user_email: email,
        provider,
        config: config ?? {},
        is_active: is_active ?? false,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { ...data, config: maskConfig(data.config as Record<string, string>) },
      { status: 201 }
    );
  }
}

function maskConfig(config: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.includes(key) && value) {
      masked[key] = maskSecret(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
