"use client";

import { useState, useEffect } from "react";
import type { Contact } from "@/types";

export function useContacts(search?: string, scope?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (scope) params.set("scope", scope);

      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
      setLoading(false);
    }

    fetchContacts();
  }, [search, scope]);

  return { contacts, loading };
}
