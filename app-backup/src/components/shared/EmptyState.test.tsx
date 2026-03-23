import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";
import { Inbox } from "lucide-react";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={Inbox} title="No items" description="Nothing here yet." />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<EmptyState icon={Inbox} title="No items" description="Nothing here yet." />);
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="No items" description="Nothing here yet." />
    );
    // lucide-react renders an SVG element
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders an action button when provided", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Nothing here yet."
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("does not render action container when action is not provided", () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="No items" description="Nothing here yet." />
    );
    // The outer div has specific classes; there should be no mt-5 action wrapper
    const children = container.firstElementChild?.children;
    // icon wrapper, h3, p = 3 children (no action div)
    expect(children?.length).toBe(3);
  });
});
