import { UserPlus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

export function ReferralsPanel({
  contact,
  referredByName,
  referrals,
  allContacts,
}: {
  contact: { id: string; name: string; referred_by_id?: string | null };
  referredByName?: string | null;
  referrals: { id: string; name: string; type: string }[];
  allContacts: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          Referrals
        </h3>
        <ContactForm
          allContacts={allContacts}
          defaultReferredById={contact.id}
          trigger={
            <Button variant="outline" size="sm" className="text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Referral
            </Button>
          }
        />
      </div>

      {contact.referred_by_id && referredByName && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <span className="text-sm text-muted-foreground">Referred by:</span>
          <Link
            href={`/contacts/${contact.referred_by_id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            {referredByName}
          </Link>
        </div>
      )}

      {referrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Contacts referred by {contact.name}:
          </p>
          {referrals.map((r) => (
            <Link
              key={r.id}
              href={`/contacts/${r.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group border border-border/50"
            >
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {r.name}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={`text-[11px] capitalize ${
                    r.type === "seller"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {r.type}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {referrals.length === 0 && !contact.referred_by_id && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No referral connections yet.
        </p>
      )}
    </div>
  );
}
