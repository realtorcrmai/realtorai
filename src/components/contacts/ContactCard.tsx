import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { getAvatarColor } from "@/lib/avatar-color";
import type { Contact } from "@/types";

export function ContactCard({ contact }: { contact: Contact }) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarStyle = getAvatarColor(contact.name);

  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0"
              style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
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
                    contact.type === "seller" ? "bg-brand-muted text-brand-dark border-brand/20"
                      : contact.type === "customer" ? "bg-brand-muted text-brand-dark border-brand/20"
                      : contact.type === "agent" ? "bg-amber-50 text-amber-700 border-orange-200"
                      : contact.type === "partner" ? "bg-brand-muted text-brand-dark border-brand/20"
                      : "bg-brand-muted text-brand-dark border-brand/20"
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
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  <MessageSquare className="h-2.5 w-2.5 mr-1" />
                  {contact.pref_channel}
                </Badge>
                {Boolean((contact as Record<string, unknown>).is_indirect) && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    🔗 Via property
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
