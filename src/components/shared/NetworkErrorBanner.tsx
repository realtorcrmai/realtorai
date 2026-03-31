"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Displays a banner when the user goes offline, and a brief success
 * message when connectivity is restored.
 */
export function NetworkErrorBanner() {
  const [mounted, setMounted] = useState(false);
  const { isOnline, wasOffline } = useNetworkStatus();
  const [hideSuccess, setHideSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-hide success banner after 3 seconds; reset when going offline
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => setHideSuccess(true), 3000);
      return () => clearTimeout(timer);
    }
    const raf = requestAnimationFrame(() => setHideSuccess(false));
    return () => cancelAnimationFrame(raf);
  }, [isOnline, wasOffline]);

  // All hooks called above — safe to return early now
  if (!mounted) return null;

  const showSuccess = isOnline && wasOffline && !hideSuccess;
  if (isOnline && !showSuccess) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white",
        isOnline ? "bg-emerald-600" : "bg-destructive"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="size-4" />
          <span>Back online!</span>
        </>
      ) : (
        <>
          <WifiOff className="size-4" />
          <span>You are offline. Changes will sync when reconnected.</span>
        </>
      )}
    </div>
  );
}
