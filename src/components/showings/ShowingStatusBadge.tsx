import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  requested: { label: "Requested", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  denied: { label: "Denied", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
} as const;

export function ShowingStatusBadge({
  status,
}: {
  status: keyof typeof statusConfig;
}) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
