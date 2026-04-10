"use client";

const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    icon: "🟢",
    description: "When you get to it",
    bg: "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
    ring: "ring-gray-400",
    border: "border-gray-200 dark:border-gray-800",
  },
  {
    value: "medium",
    label: "Medium",
    icon: "🔵",
    description: "This week",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-brand",
    border: "border-brand/30 dark:border-brand/20",
  },
  {
    value: "high",
    label: "High",
    icon: "🟠",
    description: "Today or tomorrow",
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    ring: "ring-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    value: "urgent",
    label: "Urgent",
    icon: "🔴",
    description: "Do it now",
    bg: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    ring: "ring-red-400",
    border: "border-red-200 dark:border-red-800",
  },
];

interface PrioritySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="flex gap-2">
      {PRIORITIES.map((p) => {
        const selected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`
              flex-1 p-3 rounded-xl border-2 text-center transition-all duration-200
              ${selected
                ? `bg-gradient-to-br ${p.bg} ${p.border} ring-2 ${p.ring} ring-offset-1 shadow-md scale-[1.02]`
                : "border-border/30 hover:border-border hover:shadow-sm bg-white/50 dark:bg-white/5"
              }
            `}
          >
            <span className="text-lg block mb-0.5">{p.icon}</span>
            <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>
              {p.label}
            </p>
            <p className={`text-xs mt-0.5 ${selected ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
              {p.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
