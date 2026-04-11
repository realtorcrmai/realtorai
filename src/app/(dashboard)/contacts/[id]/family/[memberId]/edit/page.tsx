import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { FamilyMemberForm } from "@/components/contacts/FamilyMemberForm";

export default async function EditFamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const tc = await getAuthenticatedTenantClient();

  const [{ data: contact }, { data: member }] = await Promise.all([
    tc.from("contacts").select("name").eq("id", id).single(),
    tc.from("contact_family_members").select("*").eq("id", memberId).single(),
  ]);

  if (!member) notFound();

  return (
    <FamilyMemberForm
      contactId={id}
      contactName={contact?.name ?? undefined}
      editMember={member}
    />
  );
}
