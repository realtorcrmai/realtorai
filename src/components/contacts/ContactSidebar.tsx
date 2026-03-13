"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Contact } from "@/types";
import { CONTACT_TYPE_COLORS, type ContactType } from "@/lib/constants";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ContactSidebar({ contacts }: { contacts: Contact[] }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-[280px] shrink-0 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Contacts{" "}
            <span className="text-muted-foreground font-normal">
              ({contacts.length})
            </span>
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Contact items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No matching contacts" : "No contacts yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((contact) => {
              const isActive = pathname === `/contacts/${contact.id}`;
              const initials = getInitials(contact.name);
              const avatarBg =
                contact.type === "seller" ? "bg-purple-500" : "bg-blue-500";

              return (
                <Link key={contact.id} href={`/contacts/${contact.id}`}>
                  <div
                    className={`px-4 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${avatarBg}`}
                      >
                        <span className="text-xs font-semibold text-white">
                          {initials}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-primary" : ""
                          }`}
                        >
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>

                      {/* Type badge */}
                      <Badge
                        variant="secondary"
                        className={`${CONTACT_TYPE_COLORS[contact.type as ContactType] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize`}
                      >
                        {contact.type}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
