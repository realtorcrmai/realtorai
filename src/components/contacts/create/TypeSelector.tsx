"use client";

const TYPES = [
  {
    value: "buyer",
    label: "Buyer",
    icon: "🏠",
    description: "Looking to purchase",
    gradient: "from-blue-500 to-indigo-600",
    bg: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    ring: "ring-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    value: "seller",
    label: "Seller",
    icon: "🔑",
    description: "Ready to list",
    gradient: "from-purple-500 to-indigo-600",
    bg: "from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30",
    ring: "ring-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    value: "customer",
    label: "Lead",
    icon: "✨",
    description: "Not yet qualified",
    gradient: "from-green-500 to-emerald-600",
    bg: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
    ring: "ring-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  {
    value: "agent",
    label: "Agent",
    icon: "🤝",
    description: "Fellow realtor",
    gradient: "from-orange-500 to-amber-600",
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    ring: "ring-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    value: "partner",
    label: "Partner",
    icon: "🏢",
    description: "Mortgage, lawyer, etc.",
    gradient: "from-teal-500 to-cyan-600",
    bg: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30",
    ring: "ring-teal-400",
    border: "border-teal-200 dark:border-teal-800",
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
