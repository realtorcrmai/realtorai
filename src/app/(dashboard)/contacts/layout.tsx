import { createAdminClient } from "@/lib/supabase/admin";
import { ContactSidebar } from "@/components/contacts/ContactSidebar";
import { ContactForm } from "@/components/contacts/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  const [{ data: contacts }, { data: enrollments }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_enrollments")
      .select("contact_id, status, workflows(name)")
      .in("status", ["active", "paused"]),
  ]);

  // Build array of contact IDs with active workflows
  const contactsWithWorkflow = [...new Set(
    (enrollments ?? []).map((e) => e.contact_id)
  )];

  // Build workflow name map for sidebar display
  const workflowNames: Record<string, string> = {};
  for (const e of enrollments ?? []) {
    if (e.contact_id && !workflowNames[e.contact_id]) {
      const wf = e.workflows as { name: string } | null;
      if (wf) workflowNames[e.contact_id] = wf.name;
    }
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar — contact list + add button at top */}
      <div className="hidden md:flex flex-col h-full w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <ContactForm />
        </div>
        <ContactSidebar
          contacts={contacts ?? []}
          contactsWithWorkflow={contactsWithWorkflow}
          workflowNames={workflowNames}
        />
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
        {/* Mobile FAB for creating contacts */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
