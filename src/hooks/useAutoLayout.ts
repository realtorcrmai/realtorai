"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * useAutoLayout — dynamically calculates available height for content sections
 *
 * Measures:
 * 1. Viewport height
 * 2. Fixed elements (app header, nav bar)
 * 3. A "header ref" element (contact card, pipeline, actions)
 *
 * Returns:
 * - contentHeight: remaining px for tab content area
 * - sectionHeights: distributed heights per section based on data weight
 * - recalculate: manual trigger
 *
 * Usage:
 *   const { headerRef, contentHeight } = useAutoLayout({ fixedOffset: 100 });
 *   <div ref={headerRef}>...header...</div>
 *   <div style={{ height: contentHeight }}>...tabs...</div>
 */

interface UseAutoLayoutOptions {
  /** Fixed pixels consumed by app chrome (header + nav). Default: 100 */
  fixedOffset?: number;
  /** Sections with their data presence flags */
  sections?: { id: string; hasData: boolean; minHeight?: number }[];
  /** Padding/gaps between sections in px. Default: 24 */
  gapTotal?: number;
}

interface AutoLayoutResult {
  /** Ref to attach to the header/fixed area */
  headerRef: React.RefObject<HTMLDivElement | null>;
  /** Remaining height for content below header */
  contentHeight: number;
  /** Viewport height */
  viewportHeight: number;
  /** Header measured height */
  headerHeight: number;
  /** Per-section calculated heights (id → px) */
  sectionHeights: Record<string, number>;
  /** Force recalculation */
  recalculate: () => void;
}

export function useAutoLayout({
  fixedOffset = 100,
  sections = [],
  gapTotal = 24,
}: UseAutoLayoutOptions = {}): AutoLayoutResult {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const measure = useCallback(() => {
    const vh = window.innerHeight;
    setViewportHeight(vh);

    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setHeaderHeight(rect.height);
    }
  }, []);

  // Measure on mount + resize
  useEffect(() => {
    measure();

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);

    // Also re-measure after a short delay (for hydration/render settling)
    const timer = setTimeout(measure, 100);

    // Observe header size changes (e.g., content loading in)
    const observer = new ResizeObserver(() => measure());
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [measure]);

  // Calculate remaining content height
  const contentHeight = Math.max(
    200, // minimum usable height
    viewportHeight - fixedOffset - headerHeight - gapTotal
  );

  // Distribute content height across sections
  const sectionHeights: Record<string, number> = {};

  if (sections.length > 0) {
    const sectionsWithData = sections.filter((s) => s.hasData);
    const sectionsWithoutData = sections.filter((s) => !s.hasData);

    if (sectionsWithData.length === 0) {
      // No data anywhere — give equal space to all sections
      const each = Math.floor(contentHeight / sections.length);
      for (const s of sections) {
        sectionHeights[s.id] = Math.max(s.minHeight ?? 80, each);
      }
    } else {
      // Sections with data get proportionally more space
      // Empty sections get their minHeight (collapsed)
      const emptyTotal = sectionsWithoutData.reduce(
        (sum, s) => sum + (s.minHeight ?? 60),
        0
      );
      const remainingForData = contentHeight - emptyTotal;
      const perDataSection = Math.floor(
        remainingForData / sectionsWithData.length
      );

      for (const s of sections) {
        if (s.hasData) {
          sectionHeights[s.id] = Math.max(s.minHeight ?? 120, perDataSection);
        } else {
          sectionHeights[s.id] = s.minHeight ?? 60;
        }
      }
    }
  }

  return {
    headerRef,
    contentHeight,
    viewportHeight,
    headerHeight,
    sectionHeights,
    recalculate: measure,
  };
}
