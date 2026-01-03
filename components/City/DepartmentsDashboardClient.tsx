"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DepartmentYearTxSummary, BudgetActualsYearDeptRow } from "@/lib/queries";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";
import { formatCurrency, formatPercent } from "@/lib/format";
import { buildDepartmentsNarrative } from "@/lib/narrativeHelpers";
import { cityHref } from "@/lib/cityRouting";
import { CITY_CONFIG } from "@/lib/cityConfig";

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  variance: number;
  percentSpent: number;
  txCount: number;
};

type Props = {
  deptBudgetActuals: BudgetActualsYearDeptRow[]; // selected-year dept summaries
  txSummaries: DepartmentYearTxSummary[]; // selected-year tx summaries
  years?: number[];
  enableTransactions: boolean;
  fiscalYearNote?: string;
  searchQuery?: string | null;
};

export default function DepartmentsDashboardClient({
  deptBudgetActuals,
  txSummaries,
  years: yearsProp,
  enableTransactions,
  fiscalYearNote,
  searchQuery: initialSearchQuery,
}: Props) {
  const searchParams = useSearchParams();

  // Get search query from URL or prop
  const searchQuery = searchParams.get("q") || initialSearchQuery || "";

  const years = yearsProp ?? [];

  const selectedYear = useMemo(() => {
    if (!years.length) return null;

    const param = searchParams.get("year");
    if (!param) return years[0];

    const parsed = Number(param);
    if (!Number.isFinite(parsed)) return years[0];

    if (years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  const yearLabel = selectedYear ?? (years.length > 0 ? years[0] : undefined);
  const yearParam = selectedYear != null ? `?year=${selectedYear}` : "";

  const txCountByDept = useMemo(() => {
    const map = new Map<string, number>();
    (txSummaries ?? []).forEach((row) => {
      const dept = row.department_name || "Unspecified";
      map.set(dept, Number(row.txn_count || 0));
    });
    return map;
  }, [txSummaries]);

  const summaries: DepartmentSummary[] = useMemo(() => {
    const rows = deptBudgetActuals ?? [];
    const result = rows.map((r) => {
      const dept = r.department_name || "Unspecified";
      const budget = Number(r.budget_amount ?? 0);
      const actualsVal = Number(r.actual_amount ?? 0);
      const variance = actualsVal - budget;
      const percentSpent = budget === 0 ? 0 : Math.min((actualsVal / budget) * 100, 999);
      const txCount = txCountByDept.get(dept) || 0;

      return {
        department_name: dept,
        budget,
        actuals: actualsVal,
        variance,
        percentSpent,
        txCount,
      };
    });

    // If there are departments that only have transactions but no budget/actual summary row,
    // include them as zero-budget/zero-actual rows so the list is complete when transactions are enabled.
    if (enableTransactions) {
      for (const [dept, txCount] of txCountByDept.entries()) {
        if (!result.some((r) => r.department_name === dept)) {
          result.push({
            department_name: dept,
            budget: 0,
            actuals: 0,
            variance: 0,
            percentSpent: 0,
            txCount,
          });
        }
      }
    }

    result.sort((a, b) => b.budget - a.budget);
    return result;
  }, [deptBudgetActuals, txCountByDept, enableTransactions]);

  // Filter summaries by search query if present
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const lowerQuery = searchQuery.toLowerCase();
    return summaries.filter((d) =>
      d.department_name.toLowerCase().includes(lowerQuery)
    );
  }, [summaries, searchQuery]);

  const deptCount = summaries.length;
  const totalBudget = summaries.reduce((sum, d) => sum + d.budget, 0);
  const totalActuals = summaries.reduce((sum, d) => sum + d.actuals, 0);
  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : Math.min((totalActuals / totalBudget) * 100, 999);
  const totalTx = summaries.reduce((sum, d) => sum + d.txCount, 0);

  const baseColumns: DataTableColumn<DepartmentSummary>[] = useMemo(
    () => [
      {
        key: "department",
        header: "Department",
        sortable: true,
        sortAccessor: (row) => (row.department_name || "Unspecified").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (dept: DepartmentSummary) => (
          <Link
            href={`${cityHref(`/departments/${encodeURIComponent(dept.department_name || "Unspecified")}`)}${yearParam}`}
            className="font-medium text-slate-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded"
          >
            {dept.department_name || "Unspecified"}
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
        cell: (dept: DepartmentSummary) => formatCurrency(dept.budget),
      },
      {
        key: "actuals",
        header: "Actuals",
        sortable: true,
        sortAccessor: (row) => row.actuals,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) => formatCurrency(dept.actuals),
      },
      {
        key: "percentSpent",
        header: "% spent",
        sortable: true,
        sortAccessor: (row) => row.percentSpent,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) => formatPercent(dept.percentSpent, 1),
      },
      {
        key: "variance",
        header: "Variance",
        sortable: true,
        sortAccessor: (row) => row.variance,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) => {
          const v = dept.variance;
          const color =
            v > 0 ? "text-red-700" : v < 0 ? "text-emerald-700" : "text-slate-700";
          return <span className={color}>{formatCurrency(v)}</span>;
        },
      },
      {
        key: "txCount",
        header: "Transactions",
        sortable: true,
        sortAccessor: (row) => row.txCount,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) => dept.txCount.toLocaleString("en-US"),
      },
    ],
    [yearParam]
  );

  const columns = useMemo(() => {
    if (enableTransactions) return baseColumns;
    return baseColumns.filter((col) => col.key !== "txCount");
  }, [baseColumns, enableTransactions]);

  // Determine if actuals are available
  const hasActuals = summaries.some((d) => d.actuals > 0);

  // Build narrative summary
  const narrative = useMemo(() => {
    const cityName = CITY_CONFIG.displayName || "This organization";
    
    // Find top budget department
    const topBudgetDept = summaries[0];
    
    // Find top execution department (with meaningful budget)
    const deptsWithBudget = summaries.filter((d) => d.budget > 0);
    const topExecDept = deptsWithBudget.sort((a, b) => b.percentSpent - a.percentSpent)[0];
    
    // Count over-budget departments
    const overBudgetCount = summaries.filter((d) => d.percentSpent > 100).length;

    return buildDepartmentsNarrative({
      cityName,
      year: selectedYear,
      deptCount,
      totalBudget,
      totalActuals,
      topBudgetDept: topBudgetDept?.department_name || null,
      topBudgetAmount: topBudgetDept?.budget || 0,
      topExecDept: topExecDept?.department_name || null,
      topExecPct: topExecDept?.percentSpent || 0,
      overBudgetCount,
      enableActuals: hasActuals,
      enableTransactions,
      totalTxCount: totalTx,
    });
  }, [summaries, selectedYear, deptCount, totalBudget, totalActuals, totalTx, hasActuals, enableTransactions]);

  return (
    <div id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
<SectionHeader
  eyebrow="Departments"
  title="Department overview"
  description="See how each department’s budget, actual spending, and transaction volume compare for the selected fiscal year."
  fiscalNote={fiscalYearNote}
  rightSlot={
    years.length > 0 ? (
      <FiscalYearSelect options={years} label="Fiscal year" />
    ) : null
  }
/>

        {/* Narrative Summary */}
        {narrative && <NarrativeSummary narrative={narrative} className="mb-4" />}

        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 px-1 text-sm text-slate-600">
          <ol className="flex items-center gap-1">
            <li>
              <Link href={cityHref("/overview")} className="hover:text-slate-800">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-500">
              ›
            </li>
            <li aria-current="page">
              <span className="font-medium text-slate-700">Departments</span>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          <CardContainer>
            <section aria-label="Department summary statistics" className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="text-sm text-slate-600">
                  {yearLabel ? (
                    <>
                      Showing <span className="font-semibold">{deptCount}</span> departments for fiscal year{" "}
                      <span className="font-semibold">{yearLabel}</span>.
                    </>
                  ) : (
                    "No fiscal years available yet."
                  )}
                </div>
              </div>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Departments</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {deptCount.toLocaleString("en-US")}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    With budget, spending{enableTransactions ? ", or transactions" : ""} in {yearLabel ?? "–"}.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Total budget</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalBudget)}</div>
                  <div className="mt-1 text-sm text-slate-600">Sum of department-level adopted budgets.</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Total actuals</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalActuals)}</div>
                  <div className="mt-1 text-sm text-slate-600">All recorded spending for these departments.</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Variance (actuals - budget)
                  </div>
                  <div
                    className={
                      "mt-1 text-2xl font-bold " +
                      (variance < 0 ? "text-emerald-700" : variance > 0 ? "text-red-700" : "text-slate-900")
                    }
                  >
                    {formatCurrency(variance)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Negative means departments are under budget overall.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">% of budget spent</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{formatPercent(execPct, 1)}</div>
                  <div className="mt-1 text-sm text-slate-600">Based on total actuals versus total budget.</div>
                </div>

                {enableTransactions && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Transactions</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{totalTx.toLocaleString("en-US")}</div>
                    <div className="mt-1 text-sm text-slate-600">Posted for {yearLabel ?? "–"}.</div>
                  </div>
                )}
              </section>
            </section>
          </CardContainer>

          <CardContainer>
            {summaries.length === 0 ? (
              <p className="text-sm text-slate-600">No department data available for the selected year.</p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Department Detail</h2>
                <p className="text-sm text-slate-600">
                  {`This table shows each department's budget, actual spending, variance, percentage of budget spent`}
                  {enableTransactions ? ", and the number of transactions recorded for the selected year." : "."}
                </p>
                {searchQuery && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <span>
                      Showing {filteredSummaries.length} of {summaries.length} departments matching &quot;{searchQuery}&quot;
                    </span>
                    <a
                      href={`?${selectedYear ? `year=${selectedYear}` : ""}`}
                      className="ml-auto text-blue-600 hover:underline"
                    >
                      Clear filter
                    </a>
                  </div>
                )}
                <DataTable<DepartmentSummary>
                  data={filteredSummaries}
                  columns={columns}
                  initialSortKey="budget"
                  initialSortDirection="desc"
                  getRowKey={(row) => row.department_name || "Unspecified"}
                />
              </div>
            )}
          </CardContainer>
        </div>
      </div>
    </div>
  );
}
