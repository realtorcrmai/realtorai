"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ConsentType, ConsentStatus, ConsentMethod, ContactConsent } from "@/types/voice-agent";

export async function checkConsent(
  contactId: string,
  consentType: ConsentType
): Promise<{ consent: ContactConsent | null; error?: string }> {
  // Voice consent for the realtor session — no DB needed
  // Return null to trigger the consent modal (handled client-side via localStorage)
  return { consent: null };
}

export async function grantConsent(opts: {
  contactId: string;
  consentType: ConsentType;
  method: ConsentMethod;
  complianceNotes?: string;
  ipAddress?: string;
}): Promise<{ consent?: ContactConsent; error?: string }> {
  const supabase = createAdminClient();

  // Voice consent for the realtor session — return success (stored client-side)
  return { consent: { contact_id: opts.contactId, consent_type: opts.consentType, status: "granted", granted_at: new Date().toISOString(), method: opts.method } as ContactConsent };
}

export async function withdrawConsent(
  contactId: string,
  consentType: ConsentType
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // Mark consent as withdrawn in consent_records
  const { error } = await supabase
    .from("consent_records")
    .update({
      withdrawn: true,
      withdrawn_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("consent_type", "express");

  if (error) return { error: error.message };
  return {};
}
