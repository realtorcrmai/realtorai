import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Edit } from "lucide-react";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactWorkflow } from "@/components/contacts/ContactWorkflow";
import { ContactContextPanel } from "@/components/contacts/ContactContextPanel";
import { CommunicationTimeline } from "@/components/contacts/CommunicationTimeline";
import { FamilySection } from "@/components/contacts/FamilySection";
import { ImportantDatesSection } from "@/components/contacts/ImportantDatesSection";
import { Button } from "@/components/ui/button";
import type { Contact, Communication, Listing, ContactFamilyMember, ContactImportantDate } from "@/types";
import { CONTACT_TYPE_COLORS, type ContactType } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const [{ data: communications }, { data: listings }, { data: familyMembers }, { data: importantDates }] = await Promise.all([
    supabase
      .from("communications")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("*")
      .eq("seller_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_family_members")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("contact_important_dates")
      .select("*, contact_family_members(id, name)")
      .eq("contact_id", id)
      .order("date_value", { ascending: true }),
  ]);

  return (
    <div className="flex h-full">
      {/* CENTER -- scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="animate-float-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {contact.name}
                  </h1>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className={CONTACT_TYPE_COLORS[contact.type as ContactType]}
                    >
                      {contact.type}
                    </Badge>
                    <Badge variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {contact.pref_channel}
                    </Badge>
                  </div>
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {contact.notes}
                    </p>
                  )}
                </div>
                <ContactForm
                  contact={contact}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Lifecycle Workflow */}
          <Card>
            <CardContent className="p-6">
              <ContactWorkflow
                contact={contact}
                listings={(listings ?? []) as Listing[]}
                communications={
                  (communications ?? []) as Communication[]
                }
              />
            </CardContent>
          </Card>

          {/* Communication Timeline */}
          <CommunicationTimeline
            contactId={id}
            communications={
              (communications ?? []) as Communication[]
            }
          />

          {/* Family & Important Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FamilySection
              contactId={id}
              members={(familyMembers ?? []) as ContactFamilyMember[]}
            />
            <ImportantDatesSection
              contactId={id}
              dates={(importantDates ?? []) as unknown as (ContactImportantDate & { contact_family_members: { id: string; name: string } | null })[]}
              familyMembers={(familyMembers ?? []) as ContactFamilyMember[]}
            />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL -- fixed, own scroll */}
      <aside className="hidden lg:block w-[320px] shrink-0 border-l overflow-y-auto p-6 backdrop-blur-2xl bg-white/80">
        <ContactContextPanel
          contact={contact}
          listings={(listings ?? []) as Listing[]}
          communications={(communications ?? []) as Communication[]}
        />
      </aside>
    </div>
  );
}
