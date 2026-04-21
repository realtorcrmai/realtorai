// @vitest-environment happy-dom

/**
 * L2 Component Test — ShowingStatusBadge
 *
 * Tests the ShowingStatusBadge component renders the correct label
 * and applies the correct variant styles for each showing status.
 *
 * REQ-SHOWING-008: Showing status lifecycle (requested → confirmed → completed | denied | cancelled)
 */

import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShowingStatusBadge } from "./ShowingStatusBadge";
import { SHOWING_STATUSES, SHOWING_STATUS_CONFIG } from "@/lib/constants/showings";

describe("ShowingStatusBadge", () => {
  // ── Renders correct label for each status ─────────────────

  test("REQ-SHOWING-008 TC-SB-001: renders 'Requested' label for requested status @p0", () => {
    render(<ShowingStatusBadge status="requested" />);
    expect(screen.getByText("Requested")).toBeDefined();
  });

  test("REQ-SHOWING-008 TC-SB-002: renders 'Confirmed' label for confirmed status @p0", () => {
    render(<ShowingStatusBadge status="confirmed" />);
    expect(screen.getByText("Confirmed")).toBeDefined();
  });

  test("REQ-SHOWING-008 TC-SB-003: renders 'Denied' label for denied status @p0", () => {
    render(<ShowingStatusBadge status="denied" />);
    expect(screen.getByText("Denied")).toBeDefined();
  });

  test("REQ-SHOWING-008 TC-SB-004: renders 'Cancelled' label for cancelled status @p0", () => {
    render(<ShowingStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeDefined();
  });

  // ── All statuses have a config entry ──────────────────────

  test("REQ-SHOWING-008 TC-SB-010: every status enum value has a config entry @p0", () => {
    for (const status of SHOWING_STATUSES) {
      expect(SHOWING_STATUS_CONFIG[status]).toBeDefined();
      expect(SHOWING_STATUS_CONFIG[status].label).toBeTruthy();
      expect(SHOWING_STATUS_CONFIG[status].className).toBeTruthy();
    }
  });

  // ── Config labels match rendered text ─────────────────────

  test("REQ-SHOWING-008 TC-SB-011: rendered label matches config for all statuses @p1", () => {
    for (const status of SHOWING_STATUSES) {
      const { unmount } = render(<ShowingStatusBadge status={status} />);
      expect(screen.getByText(SHOWING_STATUS_CONFIG[status].label)).toBeDefined();
      unmount();
    }
  });

  // ── Status-specific styling ───────────────────────────────

  test("REQ-SHOWING-008 TC-SB-020: requested badge has amber styling @p1", () => {
    expect(SHOWING_STATUS_CONFIG.requested.className).toContain("amber");
  });

  test("REQ-SHOWING-008 TC-SB-021: confirmed badge has teal/blue styling @p1", () => {
    expect(SHOWING_STATUS_CONFIG.confirmed.className).toMatch(/0F7694|teal|blue|green/);
  });

  test("REQ-SHOWING-008 TC-SB-022: denied badge has red styling @p1", () => {
    expect(SHOWING_STATUS_CONFIG.denied.className).toContain("red");
  });

  test("REQ-SHOWING-008 TC-SB-023: cancelled badge has gray styling @p1", () => {
    expect(SHOWING_STATUS_CONFIG.cancelled.className).toContain("gray");
  });
});
