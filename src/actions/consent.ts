"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ConsentType, ConsentStatus, ConsentMethod, ContactConsent } from "@/types/voice-agent";

export async function checkConsent(
  contactId: string,
  consentType: ConsentType
): Promise<{ consent: ContactConsent | null; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contact_consent")
    .select("*")
    .eq("contact_id", contactId)
    .eq("consent_type", consentType)
    .maybeSingle();

  if (error) return { consent: null, error: error.message };
  return { consent: data as ContactConsent | null };
}

export async function grantConsent(opts: {
  contactId: string;
  consentType: ConsentType;
  method: ConsentMethod;
  complianceNotes?: string;
  ipAddress?: string;
}): Promise<{ consent?: ContactConsent; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contact_consent")
    .upsert(
      {
        contact_id: opts.contactId,
        consent_type: opts.consentType,
        status: "granted" as ConsentStatus,
        granted_at: new Date().toISOString(),
        withdrawn_at: null,
        method: opts.method,
        compliance_notes: opts.complianceNotes ?? "Consent granted via voice agent session start",
        ip_address: opts.ipAddress ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contact_id,consent_type" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { consent: data as ContactConsent };
}

export async function withdrawConsent(
  contactId: string,
  consentType: ConsentType
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("contact_consent")
    .update({
      status: "withdrawn" as ConsentStatus,
      withdrawn_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("consent_type", consentType);

  if (error) return { error: error.message };
  return {};
}
