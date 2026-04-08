"use client";

const PROPERTY_TYPES = [
  {
    value: "Residential",
    label: "Residential",
    icon: "🏠",
    description: "Single-family home",
    gradient: "from-blue-500 to-[#0F7694]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-[#0F7694]",
    border: "border-[#0F7694]/30 dark:border-[#0F7694]/20",
  },
  {
    value: "Condo/Apartment",
    label: "Condo",
    icon: "🏢",
    description: "Apartment / strata",
    gradient: "from-[#0F7694] to-[#1a1535]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/30 dark:to-[#1a1535]/30",
    ring: "ring-[#0F7694]",
    border: "border-[#0F7694]/20 dark:border-[#0F7694]/20",
  },
  {
    value: "Townhouse",
    label: "Townhouse",
    icon: "🏘️",
    description: "Row / attached home",
    gradient: "from-[#0F7694] to-[#0F7694]",
    bg: "from-[#0F7694] to-[#0F7694] dark:from-[#0F7694]/30 dark:to-[#0F7694]/30",
    ring: "ring-green-400",
    border: "border-[#0F7694]/20 dark:border-green-800",
  },
  {
    value: "Land",
    label: "Land",
    icon: "🌳",
    description: "Vacant lot / acreage",
    gradient: "from-[#67D4E8] to-[#0F7694]",
    bg: "from-amber-50 to-[#0F7694]/5 dark:from-amber-950/30 dark:to-[#1a1535]/20",
    ring: "ring-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    value: "Commercial",
    label: "Commercial",
    icon: "🏪",
    description: "Retail / office",
    gradient: "from-[#67D4E8] to-[#0F7694]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-teal-400",
    border: "border-[#0F7694]/20 dark:border-[#0F7694]/10",
  },
  {
    value: "Multi-Family",
    label: "Multi-Family",
    icon: "🏗️",
    description: "Duplex / multiplex",
    gradient: "from-rose-500 to-pink-600",
    bg: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
    ring: "ring-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
];

interface PropertyTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PropertyTypeSelector({ value, onChange }: PropertyTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {PROPERTY_TYPES.map((type) => {
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
