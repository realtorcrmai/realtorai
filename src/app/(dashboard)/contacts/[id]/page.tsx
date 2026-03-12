import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Edit } from "lucide-react";
import { ContactForm } from "@/components/contacts/ContactForm";
import { CommunicationTimeline } from "@/components/contacts/CommunicationTimeline";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import type { Contact, Communication, Listing } from "@/types";

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

  const [{ data: communications }, { data: listings }] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{contact.name}</h1>
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
                  className={
                    contact.type === "seller"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Associated Listings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Listings</h2>
          {(listings ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No listings associated with this contact.
            </p>
          ) : (
            <div className="space-y-3">
              {(listings ?? []).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* Communication Timeline */}
        <CommunicationTimeline
          contactId={id}
          communications={(communications ?? []) as Communication[]}
        />
      </div>
    </div>
  );
}
