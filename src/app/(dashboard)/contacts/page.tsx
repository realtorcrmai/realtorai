import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsTableClient } from "@/components/contacts/ContactsTableClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartListBanner } from "@/components/smart-lists/SmartListBanner";
import { executeSmartList } from "@/actions/smart-lists";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ smart_list?: string }>;
}) {
  const params = await searchParams;
  const supabase = await getAuthenticatedTenantClient();

  let contacts;
  let activeSmartList = null;

  if (params.smart_list) {
    const result = await executeSmartList(params.smart_list);
    contacts = result.rows;
    activeSmartList = result.smartList;
  } else {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, phone, type, stage_bar, lead_status, last_activity_date, created_at, newsletter_intelligence")
      .order("created_at", { ascending: false })
      .limit(200);
    contacts = data;
  }

  const isEmpty = !contacts || contacts.length === 0;

  return (
    <>
      <PageHeader
        title={activeSmartList ? `${activeSmartList.icon} ${activeSmartList.name}` : "Contacts"}
        subtitle={`${contacts?.length ?? 0} contacts`}
        actions={
          <Link href="/contacts/new">
            <Button className="bg-brand text-white hover:bg-brand-dark">Create Contact</Button>
          </Link>
        }
      />
      <div className="p-6">
        {activeSmartList && (
          <SmartListBanner smartList={activeSmartList} count={contacts?.length ?? 0} />
        )}
        {isEmpty && !activeSmartList ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first client to start tracking relationships, sending emails, and scheduling showings."
            action={
              <Link href="/contacts/new">
                <Button className="bg-brand text-white hover:bg-brand-dark">Add Your First Contact</Button>
              </Link>
            }
          />
        ) : isEmpty && activeSmartList ? (
          <EmptyState
            icon={Users}
            title="No matches"
            description={`No contacts match the "${activeSmartList.name}" filters. Try editing the conditions.`}
            action={
              <Link href="/contacts">
                <Button variant="outline">View All Contacts</Button>
              </Link>
            }
          />
        ) : (
          <ContactsTableClient contacts={(contacts ?? []) as never} />
        )}
      </div>
    </>
  );
}
