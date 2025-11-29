// components/City/DepartmentsDashboardClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, {
  DataTableColumn,
} from "../DataTable";

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
};

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
  variance: number;
  txCount: number;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number) =>
  `${value.toFixed(1).replace(/-0\.0/, "0.0")}%`;

export default function DepartmentsDashboardClient({
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();

  const years = useMemo(() => {
    const set = new Set<number>();
    budgets.forEach((b) => set.add(b.fiscal_year));
    actuals.forEach((a) => set.add(a.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [budgets, actuals]);

  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (Number.isFinite(parsed) && years.includes(parsed))
      return parsed;
    return years[0];
  }, [searchParams, years]);

  const summaries = useMemo<DepartmentSummary[]>(() => {
    if (!selectedYear) return [];

    const budgetsForYear = budgets.filter(
      (b) => b.fiscal_year === selectedYear
    );
    const actualsForYear = actuals.filter(
      (a) => a.fiscal_year === selectedYear
    );
    const txForYear = transactions.filter(
      (t) => t.fiscal_year === selectedYear
    );

    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();
    const txCountByDept = new Map<string, number>();

    budgetsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(
        dept,
        (budgetByDept.get(dept) || 0) + amt
      );
    });

    actualsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(
        dept,
        (actualsByDept.get(dept) || 0) + amt
      );
    });

    txForYear.forEach((tx) => {
      const dept = tx.department_name || "Unspecified";
      txCountByDept.set(
        dept,
        (txCountByDept.get(dept) || 0) + 1
      );
    });

    const allDepts = Array.from(
      new Set([
        ...budgetByDept.keys(),
        ...actualsByDept.keys(),
        ...txCountByDept.keys(),
      ])
    );

    const rows: DepartmentSummary[] = allDepts.map(
      (dept) => {
        const budget = budgetByDept.get(dept) || 0;
        const actuals = actualsByDept.get(dept) || 0;
        const variance = actuals - budget;
        const percentSpent =
          budget === 0 ? 0 : (actuals / budget) * 100;
        const txCount = txCountByDept.get(dept) || 0;

        return {
          department_name: dept,
          budget,
          actuals,
          variance,
          percentSpent,
          txCount,
        };
      }
    );

    // Largest budgets first by default
    rows.sort((a, b) => b.budget - a.budget);

    return rows;
  }, [budgets, actuals, transactions, selectedYear]);

  const totalBudget = summaries.reduce(
    (sum, d) => sum + d.budget,
    0
  );
  const totalActuals = summaries.reduce(
    (sum, d) => sum + d.actuals,
    0
  );
  const variance = totalActuals - totalBudget;
  const execPct =
    totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

  const deptCount = summaries.length;
  const totalTx = summaries.reduce(
    (sum, d) => sum + d.txCount,
    0
  );

  const yearParam = selectedYear
    ? `?year=${selectedYear}`
    : "";

  const columns: DataTableColumn<DepartmentSummary>[] =
    useMemo(
      () => [
        {
          key: "department",
          header: "Department",
          sortable: true,
          sortAccessor: (row) =>
            (row.department_name || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (dept) => (
            <Link
              href={`/paradise/departments/${encodeURIComponent(
                dept.department_name
              )}${yearParam}`}
              className="font-medium text-sky-700 hover:underline"
            >
              {dept.department_name}
            </Link>
          ),
        },
        {
          key: "budget",
          header: "Budget",
          sortable: true,
          sortAccessor: (row) => row.budget,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (dept) => formatCurrency(dept.budget),
        },
        {
          key: "actuals",
          header: "Actuals",
          sortable: true,
          sortAccessor: (row) => row.actuals,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (dept) => formatCurrency(dept.actuals),
        },
        {
          key: "percentSpent",
          header: "% Spent",
          sortable: true,
          sortAccessor: (row) => row.percentSpent,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (dept) =>
            formatPercent(dept.percentSpent),
        },
        {
          key: "variance",
          header: "Variance",
          sortable: true,
          sortAccessor: (row) => row.variance,
          headerClassName: "text-right",
          cellClassName: ({
            variance,
          }: DepartmentSummary) =>
            [
              "text-right font-mono",
              variance > 0
                ? "text-emerald-700"
                : variance < 0
                ? "text-red-700"
                : "text-slate-700",
            ].join(" "),
          cell: (dept) => formatCurrency(dept.variance),
        },
        {
          key: "txCount",
          header: "Transactions",
          sortable: true,
          sortAccessor: (row) => row.txCount,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (dept) =>
            dept.txCount.toLocaleString("en-US"),
        },
      ],
      [yearParam]
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title="Departments"
          description="Compare budgets, spending, and activity across all departments. Click a department to drill into multi-year trends and transactions."
        />

        {years.length > 0 && (
          <div className="mb-4">
            <FiscalYearSelect
              options={years}
              label="Fiscal year"
            />
          </div>
        )}

        {/* Top metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Departments
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {deptCount}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Budget
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalBudget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Actuals
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalActuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatPercent(execPct)} of budget spent
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Transactions
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {totalTx.toLocaleString("en-US")}
            </div>
          </CardContainer>
        </div>

        {/* Table */}
        <CardContainer>
          {summaries.length === 0 ? (
            <p className="text-sm text-slate-500">
              No department data available for this year.
            </p>
          ) : (
            <DataTable<DepartmentSummary>
              data={summaries}
              columns={columns}
              initialSortKey="budget"
              initialSortDirection="desc"
              getRowKey={(row) =>
                row.department_name || "Unspecified"
              }
            />
          )}
        </CardContainer>
      </div>
    </main>
  );
}
