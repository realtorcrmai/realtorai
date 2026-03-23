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
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showSuccess) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white",
        isOnline
          ? "bg-emerald-600"
          : "bg-destructive"
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
