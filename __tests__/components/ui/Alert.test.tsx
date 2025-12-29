import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "@/components/ui/Alert";

describe("Alert", () => {
  it("renders children", () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Alert message");
  });

  it("renders title when provided", () => {
    render(<Alert title="Warning">Alert message</Alert>);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("applies variant styles", () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-blue-50");

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-emerald-50");

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-amber-50");

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50");
  });

  it("shows dismiss button when dismissible", () => {
    const onDismiss = jest.fn();
    render(
      <Alert dismissible onDismiss={onDismiss}>
        Dismissible alert
      </Alert>
    );
    
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    
    render(
      <Alert dismissible onDismiss={onDismiss}>
        Dismissible alert
      </Alert>
    );
    
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not show dismiss button without onDismiss", () => {
    render(<Alert dismissible>No handler</Alert>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<Alert className="custom-class">Custom</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("custom-class");
  });
});
