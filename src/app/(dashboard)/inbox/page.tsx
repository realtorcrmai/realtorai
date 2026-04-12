import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { MessageSquare, ArrowDownLeft } from "lucide-react";
import { InboxView } from "@/components/inbox/InboxView";
import { PageHeader } from "@/components/layout/PageHeader";


export default async function InboxPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: communications } = await supabase
    .from("communications")
    .select("*, contacts(id, name, phone, email, type)")
    .order("created_at", { ascending: false })
    .limit(200);

  const messages = communications ?? [];

  const inboundCount = messages.filter((m: { direction: string }) => m.direction === "inbound").length;
  const totalConversations = new Set(
    messages.filter((m: { contacts: unknown; contact_id: string }) => m.contacts).map((m: { contact_id: string }) => m.contact_id)
  ).size;

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="All conversations in one place"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{totalConversations} conversations</span>
            </div>
            {inboundCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-brand">
                <ArrowDownLeft className="h-4 w-4" />
                <span>{inboundCount} inbound</span>
              </div>
            )}
          </div>
        }
      />
      <div className="p-6">
        <InboxView communications={messages} />
      </div>
    </>
  );
}
