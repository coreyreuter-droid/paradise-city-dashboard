import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies default variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("bg-slate-100");
  });

  it("applies variant styles", () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText("Primary")).toHaveClass("bg-slate-900");

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText("Success")).toHaveClass("bg-emerald-100");

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText("Warning")).toHaveClass("bg-amber-100");

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText("Error")).toHaveClass("bg-red-100");

    rerender(<Badge variant="info">Info</Badge>);
    expect(screen.getByText("Info")).toHaveClass("bg-blue-100");
  });

  it("applies size styles", () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText("Small")).toHaveClass("text-[10px]");

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText("Medium")).toHaveClass("text-xs");
  });

  it("shows dot when enabled", () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    const dot = container.querySelector(".rounded-full.h-1\\.5.w-1\\.5");
    expect(dot).toBeInTheDocument();
  });

  it("hides dot by default", () => {
    const { container } = render(<Badge>No Dot</Badge>);
    const dot = container.querySelector(".h-1\\.5.w-1\\.5");
    expect(dot).not.toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<Badge className="custom-class">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("custom-class");
  });
});
