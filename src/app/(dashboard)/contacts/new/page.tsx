import { ContactCreator } from "@/components/contacts/create/ContactCreator";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const supabase = await getAuthenticatedTenantClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name")
    .order("name", { ascending: true });

  return <ContactCreator allContacts={contacts ?? []} />;
}
