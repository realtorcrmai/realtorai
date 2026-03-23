import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  let originalNavigatorOnLine: boolean;
  const listeners: Record<string, Set<EventListener>> = {};

  beforeEach(() => {
    originalNavigatorOnLine = navigator.onLine;
    listeners["online"] = new Set();
    listeners["offline"] = new Set();

    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      listeners[event]?.add(handler as EventListener);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((event, handler) => {
      listeners[event]?.delete(handler as EventListener);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "onLine", { value: originalNavigatorOnLine, configurable: true });
  });

  function fireEvent(type: "online" | "offline") {
    listeners[type]?.forEach((fn) => fn(new Event(type)));
  }

  it("initializes isOnline based on navigator.onLine (true)", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it("initializes isOnline based on navigator.onLine (false)", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it("starts with wasOffline as false", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.wasOffline).toBe(false);
  });

  it("sets isOnline to false when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      fireEvent("offline");
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("sets isOnline to true when online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      fireEvent("online");
    });

    expect(result.current.isOnline).toBe(true);
  });

  it("sets wasOffline to true when coming back online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      fireEvent("offline");
    });
    expect(result.current.wasOffline).toBe(false);

    act(() => {
      fireEvent("online");
    });
    expect(result.current.wasOffline).toBe(true);
  });

  it("resets wasOffline to false when going offline", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      fireEvent("online");
    });
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      fireEvent("offline");
    });
    expect(result.current.wasOffline).toBe(false);
  });

  it("registers both online and offline event listeners", () => {
    renderHook(() => useNetworkStatus());
    expect(window.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });

  it("handles multiple offline/online transitions", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => { fireEvent("offline"); });
    expect(result.current.isOnline).toBe(false);

    act(() => { fireEvent("online"); });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);

    act(() => { fireEvent("offline"); });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);

    act(() => { fireEvent("online"); });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });
});
