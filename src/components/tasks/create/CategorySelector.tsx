"use client";

const CATEGORIES = [
  { value: "follow_up", label: "Follow Up", icon: "📞", gradient: "from-[#67D4E8] to-[#0F7694]", bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30", ring: "ring-brand", border: "border-brand/30 dark:border-brand/20" },
  { value: "showing", label: "Showing", icon: "🏠", gradient: "from-[#0F7694] to-[#0A6880]", bg: "from-amber-50 to-[#0F7694]/10 dark:from-amber-950/30 dark:to-[#1a1535]/20", ring: "ring-brand", border: "border-brand/30 dark:border-brand/20" },
  { value: "document", label: "Document", icon: "📄", gradient: "from-[#0F7694] to-[#1a1535]", bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/30 dark:to-[#1a1535]/30", ring: "ring-brand", border: "border-brand/20 dark:border-brand/20" },
  { value: "listing", label: "Listing", icon: "🏢", gradient: "from-[#0F7694] to-[#1a1535]", bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30", ring: "ring-brand", border: "border-brand/20 dark:border-brand/10" },
  { value: "marketing", label: "Marketing", icon: "📣", gradient: "from-rose-500 to-pink-600", bg: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30", ring: "ring-rose-400", border: "border-rose-200 dark:border-rose-800" },
  { value: "inspection", label: "Inspection", icon: "🔍", gradient: "from-[#67D4E8] to-[#0F7694]", bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30", ring: "ring-brand", border: "border-brand/30 dark:border-brand/20" },
  { value: "closing", label: "Closing", icon: "✅", gradient: "from-[#0F7694] to-[#1a1535]", bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30", ring: "ring-brand", border: "border-brand/20 dark:border-brand/10" },
  { value: "general", label: "General", icon: "📋", gradient: "from-gray-500 to-slate-600", bg: "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30", ring: "ring-gray-400", border: "border-gray-200 dark:border-gray-800" },
];

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => {
        const selected = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`
              relative p-3 rounded-xl border-2 text-center transition-all duration-200
              ${selected
                ? `bg-gradient-to-br ${cat.bg} ${cat.border} ring-2 ${cat.ring} ring-offset-1 shadow-md scale-[1.02]`
                : "border-border/30 hover:border-border hover:shadow-sm hover:-translate-y-0.5 bg-white/50 dark:bg-white/5"
              }
            `}
          >
            <div className={`
              w-9 h-9 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-base
              ${selected ? `bg-gradient-to-br ${cat.gradient} shadow-lg` : "bg-muted/30"}
              transition-all duration-200
            `}>
              <span>{cat.icon}</span>
            </div>
            <p className={`text-xs font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>
              {cat.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
