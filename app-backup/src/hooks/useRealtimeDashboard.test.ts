import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeDashboard, type DashboardStats } from "./useRealtimeDashboard";

// Capture the subscribe callback and channel mock so we can control them in tests
let subscribeCallback: ((status: string) => void) | null = null;
let channelMock: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

vi.mock("@/lib/supabase/client", () => {
  return {
    createClient: () => {
      channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb: (status: string) => void) => {
          subscribeCallback = cb;
          return channelMock;
        }),
      };
      return {
        channel: vi.fn(() => channelMock),
        removeChannel: vi.fn(),
      };
    },
  };
});

const defaultStats: DashboardStats = {
  activeListings: 5,
  openTasks: 10,
  pendingShowings: 3,
  missingDocs: 2,
  totalContacts: 50,
  newLeadsToday: 1,
};

describe("useRealtimeDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscribeCallback = null;
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2)),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(defaultStats),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes stats with provided values", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));
    expect(result.current.stats).toEqual(defaultStats);
  });

  it("initializes with empty events array", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));
    expect(result.current.events).toEqual([]);
  });

  it("starts mode as 'connecting'", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));
    expect(result.current.mode).toBe("connecting");
  });

  it("starts as not connected", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));
    expect(result.current.isConnected).toBe(false);
  });

  it("switches to realtime mode on SUBSCRIBED", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));

    act(() => {
      subscribeCallback?.("SUBSCRIBED");
    });

    expect(result.current.mode).toBe("realtime");
    expect(result.current.isConnected).toBe(true);
  });

  it("falls back to polling on CHANNEL_ERROR", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(defaultStats),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useRealtimeDashboard(defaultStats));

    await act(async () => {
      subscribeCallback?.("CHANNEL_ERROR");
      // Flush microtasks for the fetch promise
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dashboard/stats");
  });

  it("starts polling fallback after 5s timeout if not connected", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(defaultStats),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useRealtimeDashboard(defaultStats));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dashboard/stats");
  });

  it("clearEvents empties the events list", () => {
    const { result } = renderHook(() => useRealtimeDashboard(defaultStats));

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toEqual([]);
  });

  it("does not start polling if realtime connects before timeout", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useRealtimeDashboard(defaultStats));

    act(() => {
      subscribeCallback?.("SUBSCRIBED");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls back to polling on TIMED_OUT", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(defaultStats),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useRealtimeDashboard(defaultStats));

    await act(async () => {
      subscribeCallback?.("TIMED_OUT");
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dashboard/stats");
  });

  it("cleans up on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeDashboard(defaultStats));
    unmount();
  });

  it("polling handles fetch failure silently", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useRealtimeDashboard(defaultStats));

    await act(async () => {
      subscribeCallback?.("CHANNEL_ERROR");
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalled();
  });
});
