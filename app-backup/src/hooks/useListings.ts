"use client";

import { useState, useEffect } from "react";
import type { Listing } from "@/types";

export function useListings(status?: string) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);

      const res = await fetch(`/api/listings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data);
      }
      setLoading(false);
    }

    fetchListings();
  }, [status]);

  return { listings, loading };
}
