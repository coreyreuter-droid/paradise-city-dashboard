import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies default styles", () => {
    render(<Card>Default</Card>);
    const card = screen.getByText("Default").closest("div");
    expect(card).toHaveClass("rounded-2xl", "border", "bg-white");
  });

  it("applies padding variants", () => {
    const { rerender } = render(<Card padding="none">No padding</Card>);
    let card = screen.getByText("No padding").closest("div");
    expect(card).not.toHaveClass("p-4");

    rerender(<Card padding="sm">Small padding</Card>);
    card = screen.getByText("Small padding").closest("div");
    expect(card).toHaveClass("p-3");

    rerender(<Card padding="lg">Large padding</Card>);
    card = screen.getByText("Large padding").closest("div");
    expect(card).toHaveClass("p-5");
  });

  it("applies shadow by default", () => {
    render(<Card>With shadow</Card>);
    const card = screen.getByText("With shadow").closest("div");
    expect(card).toHaveClass("shadow-sm");
  });

  it("removes shadow when disabled", () => {
    render(<Card shadow={false}>No shadow</Card>);
    const card = screen.getByText("No shadow").closest("div");
    expect(card).not.toHaveClass("shadow-sm");
  });

  it("applies hover effect when enabled", () => {
    render(<Card hover>Hoverable</Card>);
    const card = screen.getByText("Hoverable").closest("div");
    expect(card).toHaveClass("hover:shadow-md");
  });

  it("accepts custom className", () => {
    render(<Card className="custom-class">Custom</Card>);
    const card = screen.getByText("Custom").closest("div");
    expect(card).toHaveClass("custom-class");
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("applies default margin", () => {
    render(<CardHeader>Header</CardHeader>);
    const header = screen.getByText("Header").closest("div");
    expect(header).toHaveClass("mb-4");
  });
});

describe("CardTitle", () => {
  it("renders as h3 by default", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Title");
  });

  it("renders as custom heading level", () => {
    render(<CardTitle as="h1">Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
  });
});

describe("CardDescription", () => {
  it("renders children", () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });

  it("applies text styles", () => {
    render(<CardDescription>Styled</CardDescription>);
    expect(screen.getByText("Styled")).toHaveClass("text-sm", "text-slate-600");
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Content here</CardContent>);
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("applies border and spacing", () => {
    render(<CardFooter>Footer</CardFooter>);
    const footer = screen.getByText("Footer").closest("div");
    expect(footer).toHaveClass("border-t", "mt-4", "pt-4");
  });
});

describe("Card composition", () => {
  it("renders complete card with all subcomponents", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>A full example</CardDescription>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(screen.getByRole("heading", { name: "Complete Card" })).toBeInTheDocument();
    expect(screen.getByText("A full example")).toBeInTheDocument();
    expect(screen.getByText("Main content goes here")).toBeInTheDocument();
    expect(screen.getByText("Footer actions")).toBeInTheDocument();
  });
});
