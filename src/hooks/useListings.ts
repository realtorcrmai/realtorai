"use client";

import { useState, useEffect } from "react";
import type { Listing } from "@/types";

export function useListings(status?: string, scope?: string) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (scope) params.set("scope", scope);

      const res = await fetch(`/api/listings?${params}`);
      if (res.ok) {
        const json = await res.json();
        setListings(json.data ?? json);
      }
      setLoading(false);
    }

    fetchListings();
  }, [status, scope]);

  return { listings, loading };
}
