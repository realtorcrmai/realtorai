import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { Inbox, MessageSquare, ArrowDownLeft } from "lucide-react";
import { InboxView } from "@/components/inbox/InboxView";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: communications } = await supabase
    .from("communications")
    .select("*, contacts(id, name, phone, email, type)")
    .order("created_at", { ascending: false })
    .limit(200);

  const messages = communications ?? [];

  // Count unread inbound messages (messages from today that are inbound)
  const inboundCount = messages.filter((m) => m.direction === "inbound").length;
  const totalConversations = new Set(
    messages.filter((m) => m.contacts).map((m) => m.contact_id)
  ).size;

  return (
    <div className="animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--lf-text)]">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              All conversations in one place
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{totalConversations} conversations</span>
          </div>
          {inboundCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--lf-coral)]">
              <ArrowDownLeft className="h-4 w-4" />
              <span>{inboundCount} inbound</span>
            </div>
          )}
        </div>
      </div>

      {/* Inbox View */}
      <InboxView communications={messages} />
    </div>
  );
}
