import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple classes", () => {
    const result = cn("p-4", "m-2");
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
  });

  it("handles conditional classes via clsx syntax", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("strips undefined and null values", () => {
    const result = cn("p-4", undefined, null, "m-2");
    expect(result).toBe("p-4 m-2");
  });

  it("resolves conflicting Tailwind classes (last wins)", () => {
    const result = cn("p-2", "p-4");
    expect(result).toBe("p-4");
  });

  it("resolves conflicting text color classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("returns an empty string when no arguments are given", () => {
    expect(cn()).toBe("");
  });

  it("supports array inputs via clsx", () => {
    const result = cn(["p-4", "m-2"]);
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
  });
});
