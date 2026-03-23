import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContactSidebar } from "@/components/contacts/ContactSidebar";
import { ContactForm } from "@/components/contacts/ContactForm";
import { MobileSidebarSheet } from "@/components/layout/MobileSidebarSheet";

export const dynamic = "force-dynamic";

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  // Fetch contacts + activity counts for sorting by "most active"
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
    activityScore[e.contact_id] = (activityScore[e.contact_id] || 0) + 2; // Enrollments weighted higher
  }

  // Sort contacts: most activity first, then by last_activity_date, then created_at
  const sortedContacts = [...(contacts ?? [])].sort((a, b) => {
    const scoreA = activityScore[a.id] || 0;
    const scoreB = activityScore[b.id] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Tiebreak: most recent activity
    const dateA = a.last_activity_date || a.created_at;
    const dateB = b.last_activity_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="flex h-full">
      {/* Left sidebar — desktop only */}
      <div className="hidden md:flex flex-col h-full w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <ContactForm />
        </div>
        <Suspense>
          <ContactSidebar contacts={sortedContacts as any} />
        </Suspense>
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Mobile: sticky bar to open sidebar sheet */}
        <MobileSidebarSheet title="Contacts" footer={<ContactForm />}>
          <Suspense>
            <ContactSidebar contacts={sortedContacts as any} />
          </Suspense>
        </MobileSidebarSheet>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        {/* Mobile FAB for creating contacts */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
