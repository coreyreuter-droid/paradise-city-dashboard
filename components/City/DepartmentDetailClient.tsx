// components/City/DepartmentDetailClient.tsx
"use client";

import { useMemo } from "react";
import {
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import {
  formatCurrency,
  formatPercent,
  formatDate,
} from "@/lib/format";
import DataTable, {
  DataTableColumn,
} from "../DataTable";

type Props = {
  departmentName?: string;
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[]; // current page
  totalTxForYear: number; // total for selected year
  page: number;
  pageSize: number;
};

const normalizeName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

export default function DepartmentDetailClient({
  departmentName,
  budgets,
  actuals,
  transactions,
  totalTxForYear,
  page,
  pageSize,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const displayName = useMemo(() => {
    if (departmentName && departmentName.trim().length > 0) {
      return departmentName;
    }

    const fromQuery =
      searchParams.get("department") ||
      searchParams.get("dept");
    if (fromQuery && fromQuery.trim().length > 0) {
      return fromQuery;
    }

    const fromBudgets =
      budgets.find((b) => b.department_name)?.department_name;
    if (fromBudgets && fromBudgets.trim().length > 0) {
      return fromBudgets;
    }

    const fromActuals =
      actuals.find((a) => a.department_name)?.department_name;
    if (fromActuals && fromActuals.trim().length > 0) {
      return fromActuals;
    }

    const fromTx =
      transactions.find((t) => t.department_name)
        ?.department_name;
    if (fromTx && fromTx.trim().length > 0) {
      return fromTx;
    }

    return "Department detail";
  }, [departmentName, searchParams, budgets, actuals, transactions]);

  const normalizedDisplay = useMemo(
    () => normalizeName(displayName),
    [displayName]
  );

  // Filter all data by normalized department name (for totals + years)
  const deptBudgets = useMemo(
    () =>
      budgets.filter(
        (b) =>
          normalizeName(b.department_name) ===
          normalizedDisplay
      ),
    [budgets, normalizedDisplay]
  );

  const deptActuals = useMemo(
    () =>
      actuals.filter(
        (a) =>
          normalizeName(a.department_name) ===
          normalizedDisplay
      ),
    [actuals, normalizedDisplay]
  );

  const deptYears = useMemo(() => {
    const set = new Set<number>();
    deptBudgets.forEach((b) => set.add(b.fiscal_year));
    deptActuals.forEach((a) => set.add(a.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [deptBudgets, deptActuals]);

  const selectedYear = useMemo(() => {
    if (deptYears.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (
      Number.isFinite(parsed) &&
      deptYears.includes(parsed)
    )
      return parsed;
    return deptYears[0];
  }, [searchParams, deptYears]);

  const multiYearSeries = useMemo(() => {
    const byYear = new Map<
      number,
      { year: number; budget: number; actuals: number }
    >();

    deptBudgets.forEach((b) => {
      const year = b.fiscal_year;
      const entry =
        byYear.get(year) || {
          year,
          budget: 0,
          actuals: 0,
        };
      entry.budget += Number(b.amount || 0);
      byYear.set(year, entry);
    });

    deptActuals.forEach((a) => {
      const year = a.fiscal_year;
      const entry =
        byYear.get(year) || {
          year,
          budget: 0,
          actuals: 0,
        };
      entry.actuals += Number(a.amount || 0);
      byYear.set(year, entry);
    });

    return Array.from(byYear.values()).sort(
      (a, b) => a.year - b.year
    );
  }, [deptBudgets, deptActuals]);

  const selectedYearTotals = useMemo(() => {
    if (!selectedYear) {
      return {
        budget: 0,
        actuals: 0,
        variance: 0,
        percentSpent: 0,
      };
    }

    const totalBudget = deptBudgets
      .filter((b) => b.fiscal_year === selectedYear)
      .reduce(
        (sum, b) => sum + Number(b.amount || 0),
        0
      );

    const totalActuals = deptActuals
      .filter((a) => a.fiscal_year === selectedYear)
      .reduce(
        (sum, a) => sum + Number(a.amount || 0),
        0
      );

    const variance = totalActuals - totalBudget;
    const percentSpent =
      totalBudget === 0
        ? 0
        : (totalActuals / totalBudget) * 100;

    return {
      budget: totalBudget,
      actuals: totalActuals,
      variance,
      percentSpent,
    };
  }, [deptBudgets, deptActuals, selectedYear]);

  const totalPages =
    totalTxForYear === 0
      ? 1
      : Math.ceil(totalTxForYear / pageSize);

  const updateQuery = (patch: {
    [key: string]: string | undefined;
  }) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    Object.entries(patch).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === "" ||
        value === "all"
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handlePageChange = (nextPage: number) => {
    const safe = Math.min(
      Math.max(1, nextPage),
      totalPages
    );
    updateQuery({ page: String(safe) });
  };

  const txColumns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) => row.date,
          cellClassName: "whitespace-nowrap",
          cell: (row) => formatDate(row.date),
        },
        {
          key: "vendor",
          header: "Vendor",
          sortable: true,
          sortAccessor: (row) =>
            (row.vendor || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (row) =>
            row.vendor || "Unspecified",
        },
        {
          key: "description",
          header: "Description",
          sortable: true,
          sortAccessor: (row) =>
            (row.description || "").toLowerCase(),
          cell: (row) => row.description || "",
        },
        {
          key: "amount",
          header: "Amount",
          sortable: true,
          sortAccessor: (row) =>
            Number(row.amount || 0),
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (row) =>
            formatCurrency(
              Number(row.amount || 0)
            ),
        },
      ],
      []
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title={displayName}
          description="Multi-year trends and detailed transactions for this department."
        />

        {deptYears.length > 0 && (
          <div className="mb-4">
            {/* FiscalYearSelect handles ?year= via router internally */}
            <FiscalYearSelect
              options={deptYears}
              label="Fiscal year"
            />
          </div>
        )}

        {/* Metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Budget ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.budget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Actuals ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.actuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatPercent(
                selectedYearTotals.percentSpent
              )}{" "}
              of budget spent
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Variance ({selectedYear ?? "–"})
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${
                selectedYearTotals.variance > 0
                  ? "text-emerald-700"
                  : selectedYearTotals.variance < 0
                  ? "text-red-700"
                  : "text-slate-900"
              }`}
            >
              {formatCurrency(
                selectedYearTotals.variance
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Positive = under budget; negative = over
              budget.
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Transactions ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {totalTxForYear.toLocaleString(
                "en-US"
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              This page:{" "}
              {transactions.length.toLocaleString(
                "en-US"
              )}
            </div>
          </CardContainer>
        </div>

        {/* Multi-year chart */}
        <div className="mb-6">
          <CardContainer>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Multi-year budget vs actuals
            </h2>
            {multiYearSeries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No budget/actuals data available for this
                department.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={multiYearSeries.map((d) => ({
                      year: d.year,
                      Budget: d.budget,
                      Actuals: d.actuals,
                    }))}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        typeof value === "number"
                          ? formatCurrency(value)
                          : value
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="Budget"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Actuals"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContainer>
        </div>

        {/* Transactions table */}
        <CardContainer>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Transactions ({selectedYear ?? "–"})
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No transactions found for this year.
            </p>
          ) : (
            <>
              <DataTable<TransactionRow>
                data={transactions}
                columns={txColumns}
                pageSize={transactions.length}
                initialSortKey="date"
                initialSortDirection="desc"
                getRowKey={(row, idx) =>
                  `${row.date}-${row.vendor}-${idx}`
                }
                showPagination={false}
              />

              {/* Server-side pagination controls */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-mono">
                    {totalTxForYear === 0
                      ? 0
                      : (page - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-mono">
                    {Math.min(
                      page * pageSize,
                      totalTxForYear
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono">
                    {totalTxForYear.toLocaleString(
                      "en-US"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      handlePageChange(page - 1)
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    Page{" "}
                    <span className="font-mono">
                      {page}
                    </span>{" "}
                    /{" "}
                    <span className="font-mono">
                      {totalPages}
                    </span>
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      handlePageChange(page + 1)
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContainer>
      </div>
    </main>
  );
}
