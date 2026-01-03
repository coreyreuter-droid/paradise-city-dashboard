import { render, screen } from "@testing-library/react";
import FiscalYearSelect from "@/components/FiscalYearSelect";

// Mock useRouter more completely for this component
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => "/test-city/budget",
  useSearchParams: () => new URLSearchParams("year=2024"),
}));

describe("FiscalYearSelect", () => {
  const defaultOptions = [2022, 2023, 2024];

  it("renders year buttons when 6 or fewer options", () => {
    render(<FiscalYearSelect options={defaultOptions} />);
    
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2022" })).toBeInTheDocument();
  });

  it("renders dropdown when more than 6 options", () => {
    const manyOptions = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    render(<FiscalYearSelect options={manyOptions} />);
    
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("has aria-pressed attribute on year buttons (ADA fix)", () => {
    render(<FiscalYearSelect options={defaultOptions} />);
    
    // Current year (2024) should have aria-pressed="true"
    const activeButton = screen.getByRole("button", { name: "2024" });
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
    
    // Other years should have aria-pressed="false"
    const inactiveButton = screen.getByRole("button", { name: "2023" });
    expect(inactiveButton).toHaveAttribute("aria-pressed", "false");
  });

  it("has proper group role and label", () => {
    render(<FiscalYearSelect options={defaultOptions} label="Fiscal year" />);
    
    const group = screen.getByRole("group", { name: "Fiscal year" });
    expect(group).toBeInTheDocument();
  });

  it("displays label text", () => {
    render(<FiscalYearSelect options={defaultOptions} label="Budget Year" />);
    expect(screen.getByText("Budget Year")).toBeInTheDocument();
  });

  it("sorts years in descending order (newest first)", () => {
    render(<FiscalYearSelect options={[2020, 2024, 2022]} />);
    
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("2024");
    expect(buttons[1]).toHaveTextContent("2022");
    expect(buttons[2]).toHaveTextContent("2020");
  });

  it("has focus-visible styles for keyboard navigation", () => {
    render(<FiscalYearSelect options={defaultOptions} />);
    
    const button = screen.getByRole("button", { name: "2024" });
    expect(button).toHaveClass("focus-visible:ring-2");
  });
});
