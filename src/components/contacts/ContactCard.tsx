import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare } from "lucide-react";
import type { Contact } from "@/types";

export function ContactCard({ contact }: { contact: Contact }) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                contact.type === "seller" ? "bg-purple-50 text-purple-700"
                  : contact.type === "customer" ? "bg-green-50 text-green-700"
                  : contact.type === "agent" ? "bg-orange-50 text-orange-700"
                  : contact.type === "partner" ? "bg-teal-50 text-teal-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                  {contact.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium capitalize shrink-0 ${
                    contact.type === "seller" ? "bg-purple-50 text-purple-700 border-purple-200"
                      : contact.type === "customer" ? "bg-green-50 text-green-700 border-green-200"
                      : contact.type === "agent" ? "bg-orange-50 text-orange-700 border-orange-200"
                      : contact.type === "partner" ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {contact.type}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                <Phone className="h-3 w-3" />
                <span>{contact.phone}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              <div className="mt-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  <MessageSquare className="h-2.5 w-2.5 mr-1" />
                  {contact.pref_channel}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
