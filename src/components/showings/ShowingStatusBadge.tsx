import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  requested: { label: "Requested", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  denied: { label: "Denied", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  cancelled: { label: "Cancelled", className: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50" },
} as const;

export function ShowingStatusBadge({
  status,
}: {
  status: keyof typeof statusConfig;
}) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
