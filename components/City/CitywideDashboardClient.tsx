"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CardContainer from "@/components/CardContainer";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import SectionHeader from "@/components/SectionHeader";
import { cityHref } from "@/lib/cityRouting";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { BudgetActualsYearDeptRow, VendorYearSummary } from "@/lib/queries";

type RevenueSummary = {
  year: number;
  total: number;
};

type Props = {
  years: number[];
  selectedYear: number | null;

  deptBudgetActuals: BudgetActualsYearDeptRow[]; // selected year
  deptAllYears: BudgetActualsYearDeptRow[]; // all years
  yoyTotals: Array<{
    year: number;
    Budget: number;
    Actuals: number;
    Variance: number;
  }>;

  vendorSummaries: VendorYearSummary[];
  enableTransactions: boolean;
  enableVendors: boolean;
  enableRevenues: boolean;

  revenueSummary: RevenueSummary | null;
  fiscalYearNote: string | null;
};

type DeptYearVarianceRow = {
  department_name: string;
  byYear: Record<
    number,
    {
      year: number;
      budget: number;
      actual: number;
      variance: number;
      variancePct: number;
    }
  >;
};

type DistributionSlice = { name: string; value: number };

export default function CitywideDashboardClient({
  years,
  selectedYear,
  deptBudgetActuals,
  deptAllYears,
  yoyTotals,
  vendorSummaries,
  enableTransactions,
  enableVendors,
  enableRevenues,
  revenueSummary,
  fiscalYearNote,
}: Props) {
  const yearLabel = selectedYear != null ? `FY ${selectedYear}` : "Fiscal Year";

  const analyticsTitle = "Analytics";
  const analyticsDescription =
    "Explore year-over-year trends, budget vs. actual variance by department, and top vendor spend.";

  const showVendorCards = enableVendors === true;
  const showRevenueSummaryCard = enableRevenues === true;

  const {
    budgetTotal,
    actualTotal,
    varianceTotal,
    variancePct,
    topDeptVarianceRows,
  } = useMemo(() => {
    const rows = deptBudgetActuals ?? [];

    const budgetTotal = rows.reduce(
      (sum, r) => sum + Number(r.budget_amount ?? 0),
      0
    );
    const actualTotal = rows.reduce(
      (sum, r) => sum + Number(r.actual_amount ?? 0),
      0
    );

    const varianceTotal = actualTotal - budgetTotal;
    const variancePct =
      budgetTotal === 0 ? 0 : (varianceTotal / budgetTotal) * 100;

    const topDeptVarianceRows = rows
      .map((r) => {
        const budget = Number(r.budget_amount ?? 0);
        const actual = Number(r.actual_amount ?? 0);
        const variance = actual - budget;
        const variancePct = budget === 0 ? 0 : (variance / budget) * 100;
        return {
          department_name: r.department_name || "Unspecified",
          budget,
          actual,
          variance,
          variancePct,
        };
      })
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 8);

    return {
      budgetTotal,
      actualTotal,
      varianceTotal,
      variancePct,
      topDeptVarianceRows,
    };
  }, [deptBudgetActuals]);

  const yoyTrendData = useMemo(() => yoyTotals ?? [], [yoyTotals]);

  const vendorSummaryForCards = useMemo(() => {
    if (!vendorSummaries || vendorSummaries.length === 0) {
      return {
        topVendors: [] as Array<{ name: string; total: number; percent: number }>,
        totalVendorSpend: 0,
        totalTransactionsCount: 0,
      };
    }

    const totalVendorSpend = vendorSummaries.reduce(
      (sum, v) => sum + Number(v.total_amount || 0),
      0
    );
    const totalTransactionsCount = vendorSummaries.reduce(
      (sum, v) => sum + Number(v.txn_count || 0),
      0
    );

    const vendors = vendorSummaries
      .map((v) => {
        const name = (v.vendor || "Unspecified").toString();
        const total = Number(v.total_amount || 0);
        const percent =
          totalVendorSpend === 0 ? 0 : (total / totalVendorSpend) * 100;
        return { name, total, percent };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { topVendors: vendors, totalVendorSpend, totalTransactionsCount };
  }, [vendorSummaries]);

  // Dept variance matrix — fast indexed lookups (no nested .find())
  const deptYearVarianceRows: DeptYearVarianceRow[] = useMemo(() => {
    if (!deptAllYears || deptAllYears.length === 0) return [];

    const deptSet = new Set<string>();
    const byDeptYear = new Map<string, BudgetActualsYearDeptRow>();

    for (const r of deptAllYears) {
      const dept = (r.department_name || "Unspecified").trim() || "Unspecified";
      const year = Number(r.fiscal_year);
      if (!Number.isFinite(year)) continue;

      deptSet.add(dept);
      byDeptYear.set(`${dept}||${year}`, r);
    }

    const sortedYears = years.slice().sort((a, b) => a - b);
    const rows: DeptYearVarianceRow[] = [];

    for (const dept of deptSet) {
      const byYear: DeptYearVarianceRow["byYear"] = {};

      for (const y of sortedYears) {
        const row = byDeptYear.get(`${dept}||${y}`);
        const budget = Number(row?.budget_amount ?? 0);
        const actual = Number(row?.actual_amount ?? 0);
        const variance = actual - budget;

        byYear[y] = {
          year: y,
          budget,
          actual,
          variance,
          variancePct: budget === 0 ? 0 : (variance / budget) * 100,
        };
      }

      rows.push({ department_name: dept, byYear });
    }

    const latestYear =
      sortedYears.length > 0 ? sortedYears[sortedYears.length - 1] : undefined;

    if (latestYear) {
      rows.sort((a, b) => {
        const av = a.byYear[latestYear]?.variance ?? 0;
        const bv = b.byYear[latestYear]?.variance ?? 0;
        return Math.abs(bv) - Math.abs(av);
      });
    }

    return rows;
  }, [deptAllYears, years]);

  const deptTableRows = useMemo(() => {
    const rows = deptBudgetActuals ?? [];
    return rows
      .map((r) => {
        const budget = Number(r.budget_amount ?? 0);
        const actual = Number(r.actual_amount ?? 0);
        const variance = actual - budget;
        const variancePct = budget === 0 ? 0 : (variance / budget) * 100;
        return {
          department_name: r.department_name || "Unspecified",
          budget,
          actual,
          variance,
          variancePct,
        };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [deptBudgetActuals]);

  const spendingDistribution: DistributionSlice[] = useMemo(() => {
    const rows = deptBudgetActuals ?? [];
    return rows
      .map((r) => ({
        name: r.department_name || "Unspecified",
        value: Number(r.actual_amount ?? 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [deptBudgetActuals]);

  const showVarianceMatrix = deptYearVarianceRows.length > 0 && years.length > 1;

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <SectionHeader
          eyebrow="Govwide analytics"
          title={analyticsTitle}
          description={analyticsDescription}
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect options={years} label="Fiscal year" />
            ) : null
          }
        />

        {fiscalYearNote && (
          <p className="mb-3 px-1 text-xs text-slate-500">{fiscalYearNote}</p>
        )}

        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1 px-1 text-sm text-slate-600"
        >
          <Link href={cityHref("/overview")} className="hover:text-slate-800">
            Home
          </Link>
          <span className="text-slate-500">›</span>
          <span className="font-medium text-slate-700">Analytics</span>
        </nav>

        {showRevenueSummaryCard && (
          <CardContainer>
            <section
              aria-label="Revenue summary"
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="text-xs font-medium text-slate-500">
                  Revenue (selected year)
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {revenueSummary ? formatCurrency(revenueSummary.total) : "—"}
                </div>
                <div className="mt-1 text-xs text-slate-500">{yearLabel}</div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="text-xs font-medium text-slate-500">
                  Modules enabled
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    Budgets
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    Actuals
                  </span>
                  {enableTransactions && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Transactions
                    </span>
                  )}
                  {enableVendors && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Vendors
                    </span>
                  )}
                  {enableRevenues && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Revenues
                    </span>
                  )}
                </div>
              </div>
            </section>
          </CardContainer>
        )}

        <CardContainer>
          <section
            aria-label="Year-over-year trend"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Year-over-year totals
              </h2>
              <p className="text-sm text-slate-600">
                Budget vs actual totals by fiscal year.
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={yoyTrendData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(Number(v))}
                    width={80}
                  />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="Budget" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Actuals" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </CardContainer>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <CardContainer>
            <section
              aria-label="Selected year totals"
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="text-xs font-medium text-slate-500">
                Selected year totals
              </div>
              <div className="mt-2 grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Budget</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(budgetTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Actual</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(actualTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Variance</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(varianceTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Variance %</span>
                  <span className="font-semibold text-slate-900">
                    {formatPercent(variancePct)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">{yearLabel}</div>
            </section>
          </CardContainer>

          <CardContainer>
            <section
              aria-label="Top department variances"
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:col-span-2"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Top department variances
                </h2>
                <p className="text-sm text-slate-600">
                  Largest absolute variance (actual − budget).
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {topDeptVarianceRows.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    No department totals found.
                  </div>
                ) : (
                  topDeptVarianceRows.map((r) => (
                    <div
                      key={r.department_name}
                      className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {r.department_name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Budget</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(r.budget)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Actual</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(r.actual)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Variance</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(r.variance)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Variance %</span>
                        <span className="font-medium text-slate-900">
                          {formatPercent(r.variancePct)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </CardContainer>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CardContainer>
            <section
              aria-label="Spending distribution"
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Spending distribution
                </h2>
                <p className="text-sm text-slate-600">
                  Top departments by actual spend.
                </p>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingDistribution}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {spendingDistribution.map((_, idx) => (
                        <Cell key={idx} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </CardContainer>

          {showVendorCards && (
            <CardContainer>
              <section
                aria-label="Vendor totals"
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Top vendors
                  </h2>
                  <p className="text-sm text-slate-600">
                    Largest vendors by total spend.
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="text-xs text-slate-600">
                      Total vendor spend
                    </div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">
                      {formatCurrency(vendorSummaryForCards.totalVendorSpend)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Transactions:{" "}
                      {vendorSummaryForCards.totalTransactionsCount.toLocaleString()}
                    </div>
                  </div>

                  {vendorSummaryForCards.topVendors.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No vendor totals found.
                    </div>
                  ) : (
                    vendorSummaryForCards.topVendors.map((v) => (
                      <div
                        key={v.name}
                        className="flex items-center justify-between rounded-lg bg-white p-3 ring-1 ring-slate-100"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {v.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatPercent(v.percent)} of total
                          </div>
                        </div>
                        <div className="ml-3 text-sm font-semibold text-slate-900">
                          {formatCurrency(v.total)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </CardContainer>
          )}
        </div>

        {showVarianceMatrix && (
          <CardContainer>
            <section
              aria-label="Department variance matrix"
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Department variance matrix
                </h2>
                <p className="text-sm text-slate-600">
                  Variance by department across years (actual − budget). Sorted by
                  latest year.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-600">
                      <th scope="col" className="px-3 py-2">
                        Department
                      </th>
                      {years
                        .slice()
                        .sort((a, b) => a - b)
                        .map((y) => (
                          <th key={y} scope="col" className="px-3 py-2">
                            FY {y}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptYearVarianceRows.slice(0, 25).map((row) => (
                      <tr
                        key={row.department_name}
                        className="bg-slate-50 ring-1 ring-slate-100 rounded-lg"
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 text-sm font-medium text-slate-900"
                        >
                          {row.department_name}
                        </th>
                        {years
                          .slice()
                          .sort((a, b) => a - b)
                          .map((y) => {
                            const cell = row.byYear[y];
                            const v = cell?.variance ?? 0;
                            return (
                              <td key={y} className="px-3 py-2 text-sm text-slate-800">
                                {formatCurrency(v)}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Showing top 25 departments by absolute variance in the latest year.
              </p>
            </section>
          </CardContainer>
        )}

        <CardContainer>
          <section
            aria-label="Department totals table"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Department totals
              </h2>
              <p className="text-sm text-slate-600">
                Budget, actual, and variance for {yearLabel}.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-600">
                    <th scope="col" className="px-3 py-2">
                      Department
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Budget
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Actual
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Variance
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Variance %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deptTableRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-sm text-slate-600">
                        No department totals found.
                      </td>
                    </tr>
                  ) : (
                    deptTableRows.map((r) => (
                      <tr
                        key={r.department_name}
                        className="bg-white ring-1 ring-slate-100 rounded-lg"
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 text-sm font-medium text-slate-900"
                        >
                          {r.department_name}
                        </th>
                        <td className="px-3 py-2 text-sm text-slate-800">
                          {formatCurrency(r.budget)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-800">
                          {formatCurrency(r.actual)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-800">
                          {formatCurrency(r.variance)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-800">
                          {formatPercent(r.variancePct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </CardContainer>
      </div>
    </div>
  );
}
