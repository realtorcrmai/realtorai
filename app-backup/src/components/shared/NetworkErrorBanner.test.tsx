import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NetworkErrorBanner } from "./NetworkErrorBanner";

// Mock the useNetworkStatus hook
const mockNetworkStatus = { isOnline: true, wasOffline: false };
vi.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

describe("NetworkErrorBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.wasOffline = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when online and was never offline", () => {
    const { container } = render(<NetworkErrorBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("shows offline banner when offline", () => {
    mockNetworkStatus.isOnline = false;
    mockNetworkStatus.wasOffline = false;
    render(<NetworkErrorBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("You are offline. Changes will sync when reconnected.")).toBeInTheDocument();
  });

  it("shows 'Back online!' message when reconnecting", () => {
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.wasOffline = true;
    render(<NetworkErrorBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Back online!")).toBeInTheDocument();
  });

  it("applies bg-destructive class when offline", () => {
    mockNetworkStatus.isOnline = false;
    render(<NetworkErrorBanner />);

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-destructive");
  });

  it("applies bg-emerald-600 class when back online", () => {
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.wasOffline = true;
    render(<NetworkErrorBanner />);

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-emerald-600");
  });

  it("auto-dismisses the online message after 3 seconds", () => {
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.wasOffline = true;
    const { container } = render(<NetworkErrorBanner />);

    expect(screen.getByText("Back online!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // After timer fires, the success message should be dismissed
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("has role='alert' attribute for accessibility", () => {
    mockNetworkStatus.isOnline = false;
    render(<NetworkErrorBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders nothing when online and success message has been dismissed", () => {
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.wasOffline = false;
    const { container } = render(<NetworkErrorBanner />);
    expect(container.innerHTML).toBe("");
  });
});
