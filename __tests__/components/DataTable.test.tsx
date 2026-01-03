import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable, { DataTableColumn } from "@/components/DataTable";

type TestRow = {
  id: number;
  name: string;
  amount: number;
};

const testData: TestRow[] = [
  { id: 1, name: "Item A", amount: 100 },
  { id: 2, name: "Item B", amount: 200 },
  { id: 3, name: "Item C", amount: 150 },
];

const testColumns: DataTableColumn<TestRow>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => row.name,
    sortable: true,
    sortAccessor: (row) => row.name,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (row) => `$${row.amount}`,
    sortable: true,
    sortAccessor: (row) => row.amount,
  },
  {
    key: "id",
    header: "ID",
    cell: (row) => row.id,
    sortable: false,
  },
];

describe("DataTable", () => {
  it("renders data rows", () => {
    render(<DataTable data={testData} columns={testColumns} />);
    
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
    expect(screen.getByText("Item C")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<DataTable data={testData} columns={testColumns} />);
    
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
  });
});

describe("DataTable accessibility (ADA fixes)", () => {
  it("has screen reader text for unsorted columns", () => {
    render(<DataTable data={testData} columns={testColumns} />);
    
    // Should have "Click to sort" text for screen readers
    const srTexts = screen.getAllByText("Click to sort");
    expect(srTexts.length).toBeGreaterThan(0);
    
    // SR text should have sr-only class (visually hidden)
    srTexts.forEach((el) => {
      expect(el).toHaveClass("sr-only");
    });
  });

  it("has screen reader text for ascending sort", async () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        initialSortKey="name"
        initialSortDirection="asc"
      />
    );
    
    // Should have ascending sort text
    const srText = screen.getByText("Sorted ascending, click to sort descending");
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("has screen reader text for descending sort", () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        initialSortKey="name"
        initialSortDirection="desc"
      />
    );
    
    const srText = screen.getByText("Sorted descending, click to sort ascending");
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("updates screen reader text when sort changes", async () => {
    const user = userEvent.setup();
    render(<DataTable data={testData} columns={testColumns} />);
    
    // Initially unsorted
    expect(screen.getAllByText("Click to sort").length).toBeGreaterThan(0);
    
    // Click to sort ascending
    const nameHeader = screen.getByRole("button", { name: /Name/i });
    await user.click(nameHeader);
    
    expect(screen.getByText("Sorted ascending, click to sort descending")).toBeInTheDocument();
    
    // Click again to sort descending
    await user.click(nameHeader);
    
    expect(screen.getByText("Sorted descending, click to sort ascending")).toBeInTheDocument();
  });

  it("has aria-sort attribute on sorted column header", () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        initialSortKey="name"
        initialSortDirection="asc"
      />
    );
    
    // Find the th element for the Name column
    const headers = screen.getAllByRole("columnheader");
    const nameHeader = headers.find((h) => h.textContent?.includes("Name"));
    
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("hides sort icons from screen readers with aria-hidden", () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        initialSortKey="name"
        initialSortDirection="asc"
      />
    );
    
    // The visual sort arrow should be hidden from screen readers
    const nameButton = screen.getByRole("button", { name: /Name/i });
    const arrowSpan = nameButton.querySelector('[aria-hidden="true"]');
    
    expect(arrowSpan).toBeInTheDocument();
  });

  it("sortable columns are keyboard accessible", () => {
    render(<DataTable data={testData} columns={testColumns} />);
    
    // Sortable columns should have buttons
    const nameButton = screen.getByRole("button", { name: /Name/i });
    const amountButton = screen.getByRole("button", { name: /Amount/i });
    
    expect(nameButton).toBeInTheDocument();
    expect(amountButton).toBeInTheDocument();
    
    // Non-sortable column should not have a button
    expect(screen.queryByRole("button", { name: /^ID$/i })).not.toBeInTheDocument();
  });
});

describe("DataTable sorting functionality", () => {
  it("sorts data ascending on first click", async () => {
    const user = userEvent.setup();
    render(<DataTable data={testData} columns={testColumns} />);
    
    const amountButton = screen.getByRole("button", { name: /Amount/i });
    await user.click(amountButton);
    
    const cells = screen.getAllByRole("cell");
    const amountCells = cells.filter((cell) => cell.textContent?.startsWith("$"));
    
    // Should be sorted: $100, $150, $200
    expect(amountCells[0]).toHaveTextContent("$100");
    expect(amountCells[1]).toHaveTextContent("$150");
    expect(amountCells[2]).toHaveTextContent("$200");
  });

  it("sorts data descending on second click", async () => {
    const user = userEvent.setup();
    render(<DataTable data={testData} columns={testColumns} />);
    
    const amountButton = screen.getByRole("button", { name: /Amount/i });
    await user.click(amountButton); // asc
    await user.click(amountButton); // desc
    
    const cells = screen.getAllByRole("cell");
    const amountCells = cells.filter((cell) => cell.textContent?.startsWith("$"));
    
    // Should be sorted descending: $200, $150, $100
    expect(amountCells[0]).toHaveTextContent("$200");
    expect(amountCells[1]).toHaveTextContent("$150");
    expect(amountCells[2]).toHaveTextContent("$100");
  });
});
