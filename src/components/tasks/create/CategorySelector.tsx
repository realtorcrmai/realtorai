"use client";

const CATEGORIES = [
  { value: "follow_up", label: "Follow Up", icon: "📞", gradient: "from-blue-500 to-indigo-600", bg: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30", ring: "ring-blue-400", border: "border-blue-200 dark:border-blue-800" },
  { value: "showing", label: "Showing", icon: "🏠", gradient: "from-amber-500 to-orange-600", bg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30", ring: "ring-amber-400", border: "border-amber-200 dark:border-amber-800" },
  { value: "document", label: "Document", icon: "📄", gradient: "from-purple-500 to-indigo-600", bg: "from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30", ring: "ring-purple-400", border: "border-purple-200 dark:border-purple-800" },
  { value: "listing", label: "Listing", icon: "🏢", gradient: "from-green-500 to-emerald-600", bg: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30", ring: "ring-green-400", border: "border-green-200 dark:border-green-800" },
  { value: "marketing", label: "Marketing", icon: "📣", gradient: "from-rose-500 to-pink-600", bg: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30", ring: "ring-rose-400", border: "border-rose-200 dark:border-rose-800" },
  { value: "inspection", label: "Inspection", icon: "🔍", gradient: "from-teal-500 to-cyan-600", bg: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30", ring: "ring-teal-400", border: "border-teal-200 dark:border-teal-800" },
  { value: "closing", label: "Closing", icon: "✅", gradient: "from-emerald-500 to-green-600", bg: "from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30", ring: "ring-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
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
