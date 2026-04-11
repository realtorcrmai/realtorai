"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Smartphone, MapPin, Tag, Calendar, DollarSign, Home, Briefcase } from "lucide-react";

const AVATAR_GRADIENTS: Record<string, string> = {
  buyer: "from-blue-500 to-[#0F7694]",
  seller: "from-[#0F7694] to-[#1a1535]",
  customer: "from-[#0F7694] to-[#0F7694]",
  agent: "from-[#67D4E8] to-[#0F7694]",
  partner: "from-[#67D4E8] to-[#0F7694]",
  other: "from-gray-500 to-slate-600",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  buyer: "bg-brand-muted text-brand-dark dark:bg-blue-900/30 dark:text-blue-300",
  seller: "bg-brand-muted-strong text-brand-dark dark:bg-brand/20 dark:text-brand-light",
  customer: "bg-brand-muted text-brand-dark dark:bg-foreground/30 dark:text-brand-light",
  agent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  partner: "bg-brand-muted text-brand-dark dark:bg-foreground/30 dark:text-brand-light",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const CHANNEL_ICONS: Record<string, typeof Phone> = {
  sms: Smartphone,
  whatsapp: MessageSquare,
  email: Mail,
  phone: Phone,
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
};

export interface LivePreviewCardProps {
  name: string;
  phone: string;
  email: string;
  type: string;
  channel: string;
  notes: string;
  source: string;
  address: string;
  leadStatus: string;
  // Buyer
  budgetDisplay?: string;
  buyerAreas?: string[];
  propertyTypes?: string[];
  timeline?: string;
  financing?: string;
  // Seller
  sellerMotivation?: string;
  desiredPrice?: string;
  listDate?: string;
  // Family, Portfolio & Context
  familyMembers?: { name: string; relationship: string; phone: string; email: string }[];
  portfolioItems?: { address: string; city: string; property_type: string; status: string; notes: string }[];
  contextEntries?: { type: string; text: string }[];
}

function getInitials(name: string) {
  if (!name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function PreviewRow({ icon: Icon, label, value, empty }: { icon: typeof Phone; label: string; value?: string; empty?: string }) {
  const hasValue = !!value;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${hasValue ? "text-foreground" : "text-muted-foreground/25"}`} />
      <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">{label}</span>
      <span className={hasValue ? "text-foreground font-medium" : "text-muted-foreground/30 italic"}>
        {value || empty || "—"}
      </span>
    </div>
  );
}

export function LivePreviewCard({
  name, phone, email, type, channel, notes, source, address, leadStatus,
  budgetDisplay, buyerAreas, propertyTypes, timeline, financing,
  sellerMotivation, desiredPrice, listDate,
  familyMembers = [], portfolioItems = [], contextEntries = [],
}: LivePreviewCardProps) {
  const initials = getInitials(name);
  const gradient = AVATAR_GRADIENTS[type] || AVATAR_GRADIENTS.other;
  const badgeColor = TYPE_BADGE_COLORS[type] || TYPE_BADGE_COLORS.other;
  const ChannelIcon = CHANNEL_ICONS[channel] || MessageSquare;
  const typeLabel = type === "customer" ? "Lead" : type;

  const isBuyer = type === "buyer";
  const isSeller = type === "seller";
  const hasBuyerPrefs = !!(budgetDisplay || (buyerAreas && buyerAreas.length > 0) || (propertyTypes && propertyTypes.length > 0) || timeline || financing);
  const hasSellerPrefs = !!(sellerMotivation || desiredPrice || listDate);

  // Count filled fields for completion indicator
  const totalFields = 6 + (isBuyer ? 5 : 0) + (isSeller ? 3 : 0);
  const filledFields = [name, phone, email, type, channel, address, source, notes, leadStatus !== "new" ? leadStatus : ""]
    .filter(Boolean).length
    + (isBuyer ? [budgetDisplay, (buyerAreas?.length ?? 0) > 0 ? "y" : "", (propertyTypes?.length ?? 0) > 0 ? "y" : "", timeline, financing].filter(Boolean).length : 0)
    + (isSeller ? [sellerMotivation, desiredPrice, listDate].filter(Boolean).length : 0);
  const completionPct = Math.min(100, Math.round((filledFields / totalFields) * 100));

  return (
    <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-white via-white to-[#FAF8F4] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/50 shadow-lg overflow-hidden transition-all duration-300">
      {/* Colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${type ? gradient : "from-gray-300 to-gray-400"}`} />

      <div className="p-5 space-y-4">
        {/* Avatar + Name */}
        <div data-preview="contact" className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${type ? gradient : "from-gray-400 to-gray-500"} flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300`}>
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight transition-all">
              {name || <span className="text-muted-foreground/30 italic font-normal">Full name</span>}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {type && (
                <Badge variant="secondary" className={`${badgeColor} text-sm capitalize`}>
                  {typeLabel}
                </Badge>
              )}
              {leadStatus && leadStatus !== "new" && (
                <Badge variant="outline" className="text-sm capitalize">{leadStatus}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 70 ? "bg-brand/50" : completionPct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{completionPct}%</span>
        </div>

        {/* Contact info */}
        <div data-preview="details" className="space-y-1.5 border-t border-border/20 pt-3">
          <PreviewRow icon={Phone} label="Phone" value={phone} empty="Phone number" />
          <PreviewRow icon={Mail} label="Email" value={email} empty="Email address" />
          <PreviewRow icon={ChannelIcon} label="Channel" value={channel ? CHANNEL_LABELS[channel] : ""} empty="Preferred channel" />
          <PreviewRow icon={MapPin} label="Address" value={address} empty="Address" />
          <PreviewRow icon={Tag} label="Source" value={source} empty="Lead source" />
        </div>

        {/* Pipeline preview */}
        {type && type !== "other" && (
          <div data-preview="pipeline" className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Pipeline</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-offset-1 ring-current shadow-sm`} />
              <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
              <div className="w-3 h-3 rounded-full bg-muted/20" />
              <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
              <div className="w-3 h-3 rounded-full bg-muted/20" />
              <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
              <div className="w-3 h-3 rounded-full bg-muted/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">New — just getting started</p>
          </div>
        )}

        {/* Buyer Preferences */}
        {isBuyer && (
          <div data-preview="preferences" className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Buyer Preferences</p>
            <div className="space-y-1.5">
              <PreviewRow icon={DollarSign} label="Budget" value={budgetDisplay} empty="Not set" />
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className={`h-4 w-4 shrink-0 ${(buyerAreas?.length ?? 0) > 0 ? "text-foreground" : "text-muted-foreground/25"}`} />
                <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">Areas</span>
                {(buyerAreas?.length ?? 0) > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {buyerAreas!.map((a) => (
                      <span key={a} className="px-1.5 py-0.5 rounded bg-brand-muted dark:bg-blue-950/30 text-brand-dark dark:text-blue-300 text-xs font-medium">{a}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Home className={`h-4 w-4 shrink-0 ${(propertyTypes?.length ?? 0) > 0 ? "text-foreground" : "text-muted-foreground/25"}`} />
                <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">Types</span>
                {(propertyTypes?.length ?? 0) > 0 ? (
                  <span className="font-medium">{propertyTypes!.join(", ")}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <PreviewRow icon={Calendar} label="Timeline" value={timeline} empty="Not set" />
              <PreviewRow icon={Briefcase} label="Financing" value={financing ? financing.replace("_", " ") : ""} empty="Not set" />
            </div>
          </div>
        )}

        {/* Seller Preferences */}
        {isSeller && (
          <div data-preview="preferences" className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Seller Preferences</p>
            <div className="space-y-1.5">
              <PreviewRow icon={Tag} label="Motivation" value={sellerMotivation} empty="Not set" />
              <PreviewRow icon={DollarSign} label="Price" value={desiredPrice ? `$${desiredPrice}K` : ""} empty="Not set" />
              <PreviewRow icon={Calendar} label="List date" value={listDate} empty="Not set" />
            </div>
          </div>
        )}

        {/* Context */}
        {contextEntries.length > 0 && (
          <div className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Context</p>
            <div className="space-y-1">
              {contextEntries.map((ctx, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{ctx.type}:</span> {ctx.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Family Members */}
        <div data-preview="family" className="border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Family</p>
          {familyMembers.length > 0 ? (
            <div className="space-y-1.5">
              {familyMembers.map((fm, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] font-bold text-emerald-700">{fm.name[0]}</span>
                  <span className="font-medium">{fm.name}</span>
                  <span className="text-muted-foreground text-xs">({fm.relationship})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/30 italic">No family added yet</p>
          )}
        </div>

        {/* Portfolio */}
        <div data-preview="portfolio" className="border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Portfolio</p>
          {portfolioItems.length > 0 ? (
            <div className="space-y-1.5">
              {portfolioItems.map((pi, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Home className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="font-medium truncate">{pi.address}</span>
                  <span className="text-muted-foreground text-xs capitalize shrink-0">({pi.status})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/30 italic">No properties added yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
