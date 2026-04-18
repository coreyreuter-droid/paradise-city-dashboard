"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DepartmentYearTxSummary, BudgetActualsYearDeptRow } from "@/lib/queries";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DrillBarList from "../ui/DrillBarList";
import type { DrillBarItem } from "../ui/DrillBarList";
import FinanceTooltip from "../ui/FinanceTooltip";
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
  deptBudgetActuals: BudgetActualsYearDeptRow[];
  txSummaries: DepartmentYearTxSummary[];
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
      return { department_name: dept, budget, actuals: actualsVal, variance, percentSpent, txCount };
    });

    if (enableTransactions) {
      for (const [dept, txCount] of txCountByDept.entries()) {
        if (!result.some((r) => r.department_name === dept)) {
          result.push({ department_name: dept, budget: 0, actuals: 0, variance: 0, percentSpent: 0, txCount });
        }
      }
    }

    result.sort((a, b) => b.budget - a.budget);
    return result;
  }, [deptBudgetActuals, txCountByDept, enableTransactions]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const lowerQuery = searchQuery.toLowerCase();
    return summaries.filter((d) => d.department_name.toLowerCase().includes(lowerQuery));
  }, [summaries, searchQuery]);

  const deptCount = summaries.length;
  const totalBudget = summaries.reduce((sum, d) => sum + d.budget, 0);
  const totalActuals = summaries.reduce((sum, d) => sum + d.actuals, 0);
  const execPct = totalBudget === 0 ? 0 : Math.min((totalActuals / totalBudget) * 100, 999);
  const totalTx = summaries.reduce((sum, d) => sum + d.txCount, 0);
  const hasActuals = summaries.some((d) => d.actuals > 0);

  // Drill bar items
  const drillItems: DrillBarItem[] = useMemo(() => {
    return filteredSummaries.map((d) => ({
      name: d.department_name || "Unspecified",
      budget: d.budget,
      actual: d.actuals,
      href: `${cityHref(`/departments/${encodeURIComponent(d.department_name || "Unspecified")}`)}${yearParam}`,
    }));
  }, [filteredSummaries, yearParam]);

  // Table columns
  const columns: DataTableColumn<DepartmentSummary>[] = useMemo(
    () => {
      const cols: DataTableColumn<DepartmentSummary>[] = [
        {
          key: "department",
          header: "Department",
          sortable: true,
          sortAccessor: (row) => (row.department_name || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (dept: DepartmentSummary) => (
            <Link
              href={`${cityHref(`/departments/${encodeURIComponent(dept.department_name || "Unspecified")}`)}${yearParam}`}
              className="font-medium text-slate-800 hover:underline"
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
          cellClassName: "text-right",
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
            const color = v > 0 ? "text-red-700" : v < 0 ? "text-emerald-700" : "text-slate-700";
            return <span className={color}>{formatCurrency(v)}</span>;
          },
        },
      ];

      if (enableTransactions) {
        cols.push({
          key: "txCount",
          header: "Transactions",
          sortable: true,
          sortAccessor: (row) => row.txCount,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (dept: DepartmentSummary) => dept.txCount.toLocaleString("en-US"),
        });
      }

      return cols;
    },
    [yearParam, enableTransactions]
  );

  // Narrative
  const narrative = useMemo(() => {
    const cityName = CITY_CONFIG.displayName || "This organization";
    const topBudgetDept = summaries[0];
    const deptsWithBudget = summaries.filter((d) => d.budget > 0);
    const topExecDept = [...deptsWithBudget].sort((a, b) => b.percentSpent - a.percentSpent)[0];
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
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Spending"
        title="Department spending"
        description="See how each department's budget and actual spending compare. Click any department to explore."
        fiscalNote={fiscalYearNote}
        rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
      />

      <nav aria-label="Breadcrumb" className="mb-4 mt-2 flex items-center gap-1 px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">Spending</span>
      </nav>

      {narrative && <NarrativeSummary narrative={narrative} className="mb-4" />}

      <div className="space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="department">Departments</FinanceTooltip>
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{deptCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="adopted budget">Total budget</FinanceTooltip>
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="budget execution">Execution</FinanceTooltip>
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatPercent(execPct, 1)}</p>
          </div>
          {enableTransactions && (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalTx.toLocaleString("en-US")}</p>
            </div>
          )}
        </div>

        {/* Visual drill bars */}
        <CardContainer>
          <section aria-label="Department budget breakdown" className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {yearLabel ? `FY ${yearLabel} departments` : "Departments"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Click any department to view its full detail.
                </p>
              </div>
              {searchQuery && (
                <span className="text-xs text-slate-500">
                  {filteredSummaries.length} of {summaries.length} matching &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
            <DrillBarList
              items={drillItems}
              showActuals={hasActuals}
              ariaLabel="Departments ranked by budget"
              showIcons={true}
            />
          </section>
        </CardContainer>

        {/* Data table */}
        <CardContainer>
          {summaries.length === 0 ? (
            <p className="text-sm text-slate-600">No department data available for the selected year.</p>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Detailed breakdown</h2>
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
  );
}
