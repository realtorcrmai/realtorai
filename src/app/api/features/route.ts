import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { FEATURES, getFeatureDefault } from "@/lib/constants/features";

/**
 * GET /api/features
 *   ?id=<featureId>  → returns single feature override
 *   (no id)          → returns all overrides + merged defaults
 */
export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const featureId = req.nextUrl.searchParams.get("id");

  if (featureId) {
    // Single feature lookup
    const { data } = await supabase
      .from("feature_overrides")
      .select("enabled")
      .eq("feature_id", featureId)
      .maybeSingle();

    return NextResponse.json({
      featureId,
      default: getFeatureDefault(featureId),
      override: data?.enabled ?? undefined,
    });
  }

  // All features: merge defaults with overrides
  const { data: overrides } = await supabase
    .from("feature_overrides")
    .select("feature_id, enabled");

  const overrideMap: Record<string, boolean> = {};
  for (const row of overrides ?? []) {
    overrideMap[row.feature_id] = row.enabled;
  }

  const features = Object.values(FEATURES).map((f) => ({
    ...f,
    override: overrideMap[f.id] ?? undefined,
    effectiveEnabled: overrideMap[f.id] ?? f.enabled,
  }));

  return NextResponse.json({ features, overrides: overrideMap });
}

/**
 * PUT /api/features
 * Body: { featureId: string, enabled: boolean }
 * Sets or clears a runtime override.
 */
export async function PUT(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { featureId, enabled } = body as {
    featureId: string;
    enabled: boolean | null;
  };

  if (!featureId || !FEATURES[featureId]) {
    return NextResponse.json(
      { error: "Invalid feature ID" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (enabled === null) {
    // Remove override → revert to config default
    await supabase
      .from("feature_overrides")
      .delete()
      .eq("feature_id", featureId);
  } else {
    // Upsert override
    await supabase.from("feature_overrides").upsert(
      { feature_id: featureId, enabled },
      { onConflict: "feature_id" }
    );
  }

  return NextResponse.json({ success: true, featureId, enabled });
}
