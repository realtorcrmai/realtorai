import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SHOWING_STATUS_CONFIG, type ShowingStatus } from "@/lib/constants";

export function ShowingStatusBadge({
  status,
}: {
  status: ShowingStatus;
}) {
  const config = SHOWING_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
