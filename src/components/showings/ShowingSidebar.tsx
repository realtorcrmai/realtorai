"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Clock } from "lucide-react";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import type { Appointment } from "@/types";

export function ShowingSidebar({
  showings,
}: {
  showings: (Appointment & {
    listings: { address: string; lockbox_code: string } | null;
  })[];
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filtered = showings.filter(
    (s) =>
      (s.listings?.address ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      s.buyer_agent_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-[280px] shrink-0 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Showings{" "}
            <span className="text-muted-foreground font-normal">
              ({showings.length})
            </span>
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search address or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Showing items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No matching showings" : "No showings yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((showing) => {
              const isActive = pathname === `/showings/${showing.id}`;
              return (
                <Link key={showing.id} href={`/showings/${showing.id}`}>
                  <div
                    className={`px-4 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? "text-primary" : ""
                            }`}
                          >
                            {showing.listings?.address ?? "Unknown Listing"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-[18px]">
                          {showing.buyer_agent_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 ml-[18px]">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(showing.start_time).toLocaleString(
                              "en-CA",
                              {
                                timeZone: "America/Vancouver",
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      <ShowingStatusBadge
                        status={
                          showing.status as
                            | "requested"
                            | "confirmed"
                            | "denied"
                            | "cancelled"
                        }
                      />
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
