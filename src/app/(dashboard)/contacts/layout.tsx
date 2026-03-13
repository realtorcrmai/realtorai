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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-full">
      {/* Left sidebar — contact list */}
      <div className="hidden md:flex flex-col h-full">
        <ContactSidebar contacts={contacts ?? []} />
        <div className="p-3 border-r border-t bg-card/50">
          <ContactForm />
        </div>
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
