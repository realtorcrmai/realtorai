import { cn } from "@/lib/utils";
import { LogoSpinner } from "@/components/brand/Logo";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <LogoSpinner size={32} />
    </div>
  );
}
