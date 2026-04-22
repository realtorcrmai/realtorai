"use client";

import { useState, useEffect } from "react";
import type { Appointment } from "@/types";

export function useShowings(status?: string, scope?: string) {
  const [showings, setShowings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShowings() {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (scope) params.set("scope", scope);

      const res = await fetch(`/api/showings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setShowings(data);
      }
      setLoading(false);
    }

    fetchShowings();
  }, [status, scope]);

  return { showings, loading };
}
