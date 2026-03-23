import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders a spinner SVG element", () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies the animate-spin class to the icon", () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector("svg");
    expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("animate-spin");
  });

  it("accepts and applies a custom className", () => {
    const { container } = render(<LoadingSpinner className="my-custom-class" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("my-custom-class");
  });

  it("has default padding and centering classes", () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).toContain("items-center");
    expect(wrapper?.className).toContain("justify-center");
    expect(wrapper?.className).toContain("p-8");
  });
});
