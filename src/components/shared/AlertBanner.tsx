import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  message: string;
  variant?: "warning" | "error" | "info";
  className?: string;
}

export function AlertBanner({
  message,
  variant = "warning",
  className,
}: AlertBannerProps) {
  const variantStyles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-brand-muted border-brand/20 text-brand-dark",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-sm",
        variantStyles[variant],
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
