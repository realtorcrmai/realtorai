"use client";

const TYPES = [
  {
    value: "buyer",
    label: "Buyer",
    icon: "🏠",
    description: "Looking to purchase",
    gradient: "from-blue-500 to-[#0F7694]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-blue-400",
    border: "border-[#0F7694]/20 dark:border-blue-800",
  },
  {
    value: "seller",
    label: "Seller",
    icon: "🔑",
    description: "Ready to list",
    gradient: "from-[#0F7694] to-[#1a1535]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/30 dark:to-[#1a1535]/30",
    ring: "ring-[#0F7694]",
    border: "border-[#0F7694]/20 dark:border-[#0F7694]/20",
  },
  {
    value: "customer",
    label: "Lead",
    icon: "✨",
    description: "Not yet qualified",
    gradient: "from-[#0F7694] to-[#0F7694]",
    bg: "from-[#0F7694] to-[#0F7694] dark:from-[#0F7694]/30 dark:to-[#0F7694]/30",
    ring: "ring-green-400",
    border: "border-[#0F7694]/20 dark:border-green-800",
  },
  {
    value: "agent",
    label: "Agent",
    icon: "🤝",
    description: "Fellow realtor",
    gradient: "from-[#67D4E8] to-[#0F7694]",
    bg: "from-amber-50 to-[#0F7694]/5 dark:from-amber-950/30 dark:to-[#1a1535]/20",
    ring: "ring-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    value: "partner",
    label: "Partner",
    icon: "🏢",
    description: "Mortgage, lawyer, etc.",
    gradient: "from-[#67D4E8] to-[#0F7694]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-teal-400",
    border: "border-[#0F7694]/20 dark:border-[#0F7694]/10",
  },
  {
    value: "other",
    label: "Other",
    icon: "👤",
    description: "General contact",
    gradient: "from-gray-500 to-slate-600",
    bg: "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
    ring: "ring-gray-400",
    border: "border-gray-200 dark:border-gray-800",
  },
];

interface TypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TYPES.map((type) => {
        const selected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`
              relative p-3.5 rounded-xl border-2 text-center transition-all duration-200
              ${selected
                ? `bg-gradient-to-br ${type.bg} ${type.border} ring-2 ${type.ring} ring-offset-1 shadow-md scale-[1.02]`
                : "border-border/30 hover:border-border hover:shadow-sm hover:-translate-y-0.5 bg-white/50 dark:bg-white/5"
              }
            `}
          >
            <div className={`
              w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl
              ${selected
                ? `bg-gradient-to-br ${type.gradient} shadow-lg`
                : "bg-muted/30"
              }
              transition-all duration-200
            `}>
              <span className={selected ? "drop-shadow-sm" : ""}>{type.icon}</span>
            </div>
            <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>
              {type.label}
            </p>
            <p className={`text-xs mt-0.5 ${selected ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
              {type.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
