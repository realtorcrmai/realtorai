import { createAdminClient } from "@/lib/supabase/admin";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ContactForm } from "@/components/contacts/ContactForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createAdminClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your buyers and sellers
          </p>
        </div>
        <ContactForm />
      </div>

      {(contacts ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first buyer or seller contact to get started."
          action={<ContactForm />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(contacts ?? []).map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
