import { Suspense } from "react";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { ContactSidebar } from "@/components/contacts/ContactSidebar";
import { ContactForm } from "@/components/contacts/ContactForm";
import { MobileSidebarSheet } from "@/components/layout/MobileSidebarSheet";

export const dynamic = "force-dynamic";

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getAuthenticatedTenantClient();

  // Single query: only the fields the sidebar needs, sorted by last activity
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, phone, type, stage_bar, lead_status, last_activity_date, created_at")
    .order("last_activity_date", { ascending: false });

  // Contacts without last_activity_date go to the bottom, sorted by created_at
  const sortedContacts = [...(contacts ?? [])].sort((a, b) => {
    const dateA = a.last_activity_date || "";
    const dateB = b.last_activity_date || "";
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    if (dateA && dateB) return new Date(dateB).getTime() - new Date(dateA).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex -mb-24" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left sidebar — desktop only */}
      <div className="hidden md:flex flex-col w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <a
            href="/contacts/new"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="text-base">+</span>
            Add Contact
          </a>
        </div>
        <Suspense>
          <ContactSidebar contacts={sortedContacts as any} />
        </Suspense>
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-auto relative flex flex-col">
        {/* Mobile: sticky bar to open sidebar sheet */}
        <MobileSidebarSheet title="Contacts" footer={<ContactForm />}>
          <Suspense>
            <ContactSidebar contacts={sortedContacts as any} />
          </Suspense>
        </MobileSidebarSheet>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {/* Mobile FAB for creating contacts */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <a
            href="/contacts/new"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl shadow-lg hover:bg-primary/90 transition-colors"
          >
            +
          </a>
        </div>
      </div>
    </div>
  );
}
