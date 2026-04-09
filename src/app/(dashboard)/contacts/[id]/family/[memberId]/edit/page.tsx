import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FamilyMemberForm } from "@/components/contacts/FamilyMemberForm";

export default async function EditFamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const supabase = createAdminClient();

  const [{ data: contact }, { data: member }] = await Promise.all([
    supabase.from("contacts").select("name").eq("id", id).single(),
    supabase.from("contact_family_members").select("*").eq("id", memberId).single(),
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
