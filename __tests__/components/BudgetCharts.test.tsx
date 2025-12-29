import { render, screen } from "@testing-library/react";
import BudgetCharts, { DepartmentSummary } from "@/components/Budget/BudgetCharts";

// Mock Recharts to avoid rendering issues in tests
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Cell: () => <div data-testid="cell" />,
}));

const testDepartments: DepartmentSummary[] = [
  { department_name: "Police", budget: 1000000, actuals: 650000, percentSpent: 65 },
  { department_name: "Fire", budget: 800000, actuals: 720000, percentSpent: 90 },
  { department_name: "Parks", budget: 500000, actuals: 400000, percentSpent: 80 },
];

const overBudgetDepartments: DepartmentSummary[] = [
  { department_name: "Police", budget: 1000000, actuals: 1100000, percentSpent: 110 },
  { department_name: "Fire", budget: 800000, actuals: 900000, percentSpent: 112.5 },
];

describe("BudgetCharts", () => {
  it("renders without crashing", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    expect(screen.getByText(/Budget execution/i)).toBeInTheDocument();
  });

  it("displays the fiscal year", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows total budget and actuals", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    // Total actuals: 650000 + 720000 + 400000 = 1,770,000
    // Total budget: 1000000 + 800000 + 500000 = 2,300,000
    expect(screen.getByText(/\$1,770,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$2,300,000/)).toBeInTheDocument();
  });
});

describe("BudgetCharts progressbar accessibility (ADA fix)", () => {
  it("has role=progressbar on the progress element", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("has aria-valuenow with current percentage", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    // Total spent: (650000 + 720000 + 400000) / (1000000 + 800000 + 500000) = 77%
    expect(progressbar).toHaveAttribute("aria-valuenow", "77");
  });

  it("has aria-valuemin of 0", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
  });

  it("has aria-valuemax of 100", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
  });

  it("has descriptive aria-label", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-label");
    expect(progressbar.getAttribute("aria-label")).toMatch(/Budget execution.*77%.*spent/i);
  });

  it("hides decorative percentage labels from screen readers", () => {
    render(<BudgetCharts year={2024} departments={testDepartments} />);
    
    // The 0% and 100% labels should be hidden
    const zeroLabel = screen.getByText("0%");
    const hundredLabel = screen.getByText("100%");
    
    expect(zeroLabel.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(hundredLabel.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("handles over-budget scenarios correctly", () => {
    render(<BudgetCharts year={2024} departments={overBudgetDepartments} />);
    
    const progressbar = screen.getByRole("progressbar");
    // Total: (1100000 + 900000) / (1000000 + 800000) = 111%
    expect(progressbar).toHaveAttribute("aria-valuenow", "111");
    expect(progressbar.getAttribute("aria-label")).toMatch(/111%/);
  });

  it("rounds percentage to whole number in aria-valuenow", () => {
    const preciseData: DepartmentSummary[] = [
      { department_name: "Test", budget: 1000, actuals: 333, percentSpent: 33.3 },
    ];
    
    render(<BudgetCharts year={2024} departments={preciseData} />);
    
    const progressbar = screen.getByRole("progressbar");
    // 333/1000 = 33.3%, should round to 33
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
  });
});

describe("BudgetCharts with empty data", () => {
  it("handles empty departments array gracefully", () => {
    // Component may not render progressbar with no data, which is fine
    render(<BudgetCharts year={2024} departments={[]} />);
    
    const progressbar = screen.queryByRole("progressbar");
    
    if (progressbar) {
      // If it renders, should show 0%
      expect(progressbar).toHaveAttribute("aria-valuenow", "0");
    } else {
      // Not rendering is also acceptable
      expect(progressbar).toBeNull();
    }
  });
});
