import { createAdminClient } from "@/lib/supabase/admin";
import { FamilyMemberForm } from "@/components/contacts/FamilyMemberForm";

export default async function NewFamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: contact } = await supabase
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
