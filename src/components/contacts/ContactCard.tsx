import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare } from "lucide-react";
import type { Contact } from "@/types";

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-base">{contact.name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{contact.phone}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{contact.email}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
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
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {contact.pref_channel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
