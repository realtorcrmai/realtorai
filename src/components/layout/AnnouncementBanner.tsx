"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  message: string;
  type: "info" | "warning" | "critical";
}

const STYLES = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  critical: "bg-red-50 border-red-200 text-red-800",
};

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("platform_config")
          .select("value")
          .eq("key", "announcement")
          .single();
        if (data?.value && data.value !== "null" && data.value !== null) {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (parsed && parsed.message) {
            const dismissKey = `announcement-dismissed-${btoa(parsed.message).slice(0, 16)}`;
            if (!localStorage.getItem(dismissKey)) {
              setAnnouncement(parsed);
            }
          }
        }
      } catch {
        // Silently fail — banner is non-critical
      }
    }
    fetchAnnouncement();
  }, []);

  if (!announcement || dismissed) return null;

  const Icon = ICONS[announcement.type] || Info;
  const style = STYLES[announcement.type] || STYLES.info;

  function handleDismiss() {
    const dismissKey = `announcement-dismissed-${btoa(announcement!.message).slice(0, 16)}`;
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b text-sm ${style}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1">{announcement.message}</p>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-black/5 transition-colors shrink-0"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
