"use client";

// Role badges + lifecycle stage pill for contact header
// Reads from contacts.roles[] and contacts.lifecycle_stage

const ROLE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  buyer:            { emoji: "🔍", label: "Buyer",            color: "bg-blue-100 text-blue-800" },
  seller:           { emoji: "🏠", label: "Seller",           color: "bg-indigo-100 text-indigo-800" },
  investor:         { emoji: "💼", label: "Investor",         color: "bg-amber-100 text-amber-800" },
  landlord:         { emoji: "🏢", label: "Landlord",         color: "bg-teal-100 text-teal-800" },
  tenant:           { emoji: "🗝️", label: "Tenant",           color: "bg-orange-100 text-orange-800" },
  co_owner:         { emoji: "🤝", label: "Co-Owner",         color: "bg-purple-100 text-purple-800" },
  referral_partner: { emoji: "⭐", label: "Referral Partner", color: "bg-yellow-100 text-yellow-800" },
};

const LIFECYCLE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  prospect:         { emoji: "🌱", label: "Prospect",         color: "bg-gray-100 text-gray-700" },
  nurture:          { emoji: "💧", label: "Nurture",          color: "bg-sky-100 text-sky-700" },
  active_buyer:     { emoji: "🟢", label: "Active Buyer",     color: "bg-green-100 text-green-700" },
  active_seller:    { emoji: "🟠", label: "Active Seller",    color: "bg-orange-100 text-orange-700" },
  dual_client:      { emoji: "🔵", label: "Dual Client",      color: "bg-blue-100 text-blue-700" },
  under_contract:   { emoji: "📋", label: "Under Contract",   color: "bg-violet-100 text-violet-700" },
  closed:           { emoji: "✅", label: "Closed",           color: "bg-emerald-100 text-emerald-700" },
  past_client:      { emoji: "⭐", label: "Past Client",      color: "bg-yellow-100 text-yellow-700" },
  referral_partner: { emoji: "🤝", label: "Referral Partner", color: "bg-amber-100 text-amber-700" },
};

interface RoleBadgesProps {
  roles: string[];
  lifecycleStage?: string | null;
  /** If true, show only first 2 roles with a +N overflow badge */
  compact?: boolean;
}

export function RoleBadges({ roles, lifecycleStage, compact = false }: RoleBadgesProps) {
  const validRoles = (roles ?? []).filter((r) => ROLE_CONFIG[r]);
  const displayRoles = compact ? validRoles.slice(0, 2) : validRoles;
  const overflow = compact ? validRoles.length - 2 : 0;
  const lc = lifecycleStage ? LIFECYCLE_CONFIG[lifecycleStage] : null;

  if (validRoles.length === 0 && !lc) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Lifecycle stage pill — shown first */}
      {lc && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${lc.color}`}
          title={`Lifecycle: ${lc.label}`}
        >
          <span>{lc.emoji}</span>
          <span>{lc.label}</span>
        </span>
      )}

      {/* Role badges */}
      {displayRoles.map((role) => {
        const cfg = ROLE_CONFIG[role];
        return (
          <span
            key={role}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
            title={`Role: ${cfg.label}`}
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
          </span>
        );
      })}

      {/* Overflow */}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
