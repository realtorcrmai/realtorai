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

  // Fetch contacts + lightweight activity counts (only FK columns, not full rows)
  const [{ data: contacts }, { data: commCounts }, { data: taskCounts }, { data: enrollCounts }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, phone, type, stage_bar, lead_status, last_activity_date, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("communications")
      .select("contact_id"),
    supabase
      .from("tasks")
      .select("contact_id")
      .not("contact_id", "is", null),
    supabase
      .from("workflow_enrollments")
      .select("contact_id"),
  ]);

  // Build activity score per contact
  const activityScore: Record<string, number> = {};
  for (const c of commCounts ?? []) {
    activityScore[c.contact_id] = (activityScore[c.contact_id] || 0) + 1;
  }
  for (const t of taskCounts ?? []) {
    if (t.contact_id) activityScore[t.contact_id] = (activityScore[t.contact_id] || 0) + 1;
  }
  for (const e of enrollCounts ?? []) {
    activityScore[e.contact_id] = (activityScore[e.contact_id] || 0) + 2;
  }

  // Sort: most activity first, then by last_activity_date, then created_at
  const sortedContacts = [...(contacts ?? [])].sort((a, b) => {
    const scoreA = activityScore[a.id] || 0;
    const scoreB = activityScore[b.id] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const dateA = a.last_activity_date || a.created_at;
    const dateB = b.last_activity_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
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
