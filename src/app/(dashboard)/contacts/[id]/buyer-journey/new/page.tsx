/**
 * /contacts/[id]/buyer-journey/new
 *
 * Creates a blank buyer journey with sensible defaults, then redirects
 * to the journey detail page for further editing.
 *
 * Background: the `BuyerJourneyPanel` UI linked to this route but the
 * route never existed — clicking "Start Journey" 404'd for weeks.
 * That explains the zero-data finding in the 2026-04-09 QA audit.
 * This server component creates the journey server-side on GET and
 * redirects to the editor, skipping any intermediate form.
 *
 * The defaults mirror the migration 074 column defaults:
 *   status='searching', preferred_areas={}, property_types={},
 *   conditional_on_sale=false
 *
 * Added: 2026-04-09.
 */

import { redirect } from "next/navigation";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export const dynamic = "force-dynamic";

export default async function NewBuyerJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contactId } = await params;

  const tc = await getAuthenticatedTenantClient();

  // Verify the contact exists + belongs to this realtor. Tenant client
  // auto-injects realtor_id, so a contact from another tenant returns
  // null.
  const { data: contact, error: contactErr } = await tc
    .from("contacts")
    .select("id, name, type, roles")
    .eq("id", contactId)
    .single();

  if (contactErr || !contact) {
    redirect(`/contacts/${contactId}?error=contact_not_found`);
  }

  // Don't create a second active journey if one already exists — the
  // partial unique index on (realtor_id, contact_id) WHERE status NOT
  // IN ('closed','cancelled') would reject it anyway. Redirect the
  // user to the existing active journey instead.
  const { data: existing } = await tc.raw
    .from("buyer_journeys")
    .select("id")
    .eq("realtor_id", tc.realtorId)
    .eq("contact_id", contactId)
    .not("status", "in", "(closed,cancelled)")
    .maybeSingle();

  if (existing?.id) {
    redirect(`/contacts/${contactId}/buyer-journey/${existing.id}`);
  }

  // Create a fresh journey with sensible defaults. Most fields are
  // optional and can be filled in on the detail page.
  const { data: journey, error: createErr } = await tc.raw
    .from("buyer_journeys")
    .insert({
      realtor_id: tc.realtorId,
      contact_id: contactId,
      status: "searching",
      preferred_areas: [],
      property_types: [],
      must_haves: [],
      nice_to_haves: [],
      conditional_on_sale: false,
    })
    .select("id")
    .single();

  if (createErr || !journey) {
    // Fall back to the contact detail page with an error query param
    // rather than a 500. The UI can render a toast.
    redirect(
      `/contacts/${contactId}?error=buyer_journey_create_failed&reason=${encodeURIComponent(
        createErr?.message ?? "unknown"
      )}`
    );
  }

  // Ensure the contact has the 'buyer' role so the journey is visible
  // in the main buyer pipeline. Idempotent — the DB index on the roles
  // column deduplicates.
  if (
    contact.roles &&
    Array.isArray(contact.roles) &&
    !contact.roles.includes("buyer")
  ) {
    await tc
      .from("contacts")
      .update({ roles: [...contact.roles, "buyer"] })
      .eq("id", contactId);
  }

  redirect(`/contacts/${contactId}/buyer-journey/${journey.id}`);
}
