import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { FamilyMemberForm } from "@/components/contacts/FamilyMemberForm";

export default async function NewFamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tc = await getAuthenticatedTenantClient();
  const { data: contact } = await tc
    .from("contacts")
    .select("name")
    .eq("id", id)
    .single();

  return (
    <FamilyMemberForm
      contactId={id}
      contactName={contact?.name ?? undefined}
    />
  );
}
