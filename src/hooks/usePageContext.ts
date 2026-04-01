"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { UIContext } from "@/lib/rag/types";

/**
 * Extract entity context from the current URL path.
 * Used by ChatWidget to provide page-aware responses.
 *
 * Examples:
 *   /contacts/abc-123 → { contact_id: "abc-123", page_type: "contact_detail" }
 *   /listings/xyz-456 → { listing_id: "xyz-456", page_type: "listing_detail" }
 *   /newsletters       → { page_type: "newsletters" }
 *   /                   → { page_type: "dashboard" }
 */
export function usePageContext(): UIContext {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) return {};

    // Contact detail: /contacts/[id]
    const contactMatch = pathname.match(/^\/contacts\/([a-f0-9-]+)$/);
    if (contactMatch) {
      return { contact_id: contactMatch[1], page_type: "contact_detail" };
    }

    // Listing detail: /listings/[id]
    const listingMatch = pathname.match(/^\/listings\/([a-f0-9-]+)$/);
    if (listingMatch) {
      return { listing_id: listingMatch[1], page_type: "listing_detail" };
    }

    // Showing detail: /showings/[id]
    const showingMatch = pathname.match(/^\/showings\/([a-f0-9-]+)$/);
    if (showingMatch) {
      return { showing_id: showingMatch[1], page_type: "showing_detail" };
    }

    // Pipeline deal: /pipeline/[id]
    const pipelineMatch = pathname.match(/^\/pipeline\/([a-f0-9-]+)$/);
    if (pipelineMatch) {
      return { deal_id: pipelineMatch[1], page_type: "deal_detail" };
    }

    // Section pages
    const sectionMap: Record<string, string> = {
      "/": "dashboard",
      "/contacts": "contacts_list",
      "/listings": "listings_list",
      "/showings": "showings_list",
      "/newsletters": "newsletters",
      "/calendar": "calendar",
      "/content": "content_engine",
      "/tasks": "tasks",
      "/pipeline": "pipeline",
      "/social": "social_media",
      "/settings": "settings",
      "/assistant": "assistant",
    };

    const pageType = sectionMap[pathname];
    if (pageType) {
      return { page_type: pageType };
    }

    // Default — use the first path segment
    const segment = pathname.split("/")[1];
    return { page_type: segment || "unknown" };
  }, [pathname]);
}
