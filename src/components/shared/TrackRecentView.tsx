"use client";

import { useEffect } from "react";
import { useRecentItems } from "@/stores/recent-items";

export function TrackRecentView({
  id,
  type,
  label,
  href,
}: {
  id: string;
  type: "contact" | "listing";
  label: string;
  href: string;
}) {
  const addItem = useRecentItems((s) => s.addItem);
  useEffect(() => {
    addItem({ id, type, label, href });
  }, [id, type, label, href, addItem]);
  return null;
}
