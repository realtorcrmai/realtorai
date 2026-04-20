"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, User, Phone, Camera, Building2, Shield, Calendar, Globe, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  completeness: number;
  missing: string[]; // field keys that are incomplete
}

const FIELD_CONFIG: Record<string, { label: string; href: string; icon: React.FC<{ className?: string }> }> = {
  name: { label: "Add your name", href: "/settings", icon: User },
  email_verified: { label: "Verify your email", href: "/verify", icon: Shield },
  phone_verified: { label: "Verify your phone", href: "/verify/phone", icon: Phone },
  avatar: { label: "Upload a headshot", href: "/settings", icon: Camera },
  brokerage: { label: "Add your brokerage", href: "/settings", icon: Building2 },
  license: { label: "Add license number", href: "/settings", icon: Shield },
  calendar: { label: "Connect Google Calendar", href: "/settings", icon: Calendar },
  timezone: { label: "Set your timezone", href: "/settings", icon: Globe },
  bio: { label: "Write a short bio", href: "/settings", icon: FileText },
  contacts: { label: "Import your contacts", href: "/contacts", icon: Users },
};

export function ProfileCompletenessBar({ completeness, missing }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Hide at 100%
  if (completeness >= 100 || missing.length === 0) return null;

  const barColor =
    completeness < 40 ? "bg-red-500" : completeness < 70 ? "bg-amber-500" : "bg-brand/50";

  const textColor =
    completeness < 40
      ? "text-red-700"
      : completeness < 70
        ? "text-amber-700"
        : "text-brand-dark";

  return (
    <div className="lf-card mx-4 mt-3 p-3 border-l-4 border-l-primary">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-28 h-2 bg-muted rounded-full overflow-hidden shrink-0">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <span className={cn("text-sm font-medium", textColor)}>
            Profile {completeness}% complete
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            — {missing.length} item{missing.length !== 1 ? "s" : ""} remaining
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded: show missing items */}
      {expanded && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          {missing.map((field) => {
            const config = FIELD_CONFIG[field];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Link
                key={field}
                href={config.href}
                className="flex items-center gap-1.5 text-xs bg-primary/5 text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
