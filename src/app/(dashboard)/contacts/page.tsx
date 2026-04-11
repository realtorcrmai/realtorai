import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsTableClient } from "@/components/contacts/ContactsTableClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, phone, type, stage_bar, lead_status, last_activity_date, created_at, newsletter_intelligence")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts?.length ?? 0} contacts`}
        actions={
          <Link href="/contacts/new">
            <Button className="bg-brand text-white hover:bg-brand-dark">Create Contact</Button>
          </Link>
        }
      />
      <div className="p-6">
        <ContactsTableClient contacts={contacts ?? []} />
      </div>
    </>
  );
}
