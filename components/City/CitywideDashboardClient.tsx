"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { VendorYearSummary, BudgetActualsYearDeptRow } from "@/lib/queries";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import BudgetByDepartmentChart from "../Analytics/BudgetByDepartmentChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

const BUDGET_COLOR = "#334155";
const ACTUAL_COLOR = "#0f766e";

const PIE_COLORS = [
  "#0f766e",
  "#0369a1",
  "#4f46e5",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#15803d",
];

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  variance: number;
  percentSpent: number;
};

type DistributionSlice = { name: string; value: number };

type DeptYearVarianceRow = {
  department_name: string;
  byYear: Record<number, { variance: number; percentSpent: number }>;
};

type VendorSummary = {
  name: string;
  total: number;
  percent: number;
};

type RevenueSummary = {
  year: number;
  total: number;
};

type Props = {
  years: number[];
  selectedYear: number | null;

  deptBudgetActuals: BudgetActualsYearDeptRow[]; // selected year
  deptAllYears: BudgetActualsYearDeptRow[];      // all years
  yoyTotals: Array<{ year: number; Budget: number; Actuals: number; Variance: number }>;

  vendorSummaries: VendorYearSummary[];

  enableTransactions: boolean;
  enableVendors: boolean;
  enableRevenues: boolean;

  revenueSummary?: RevenueSummary | null;
  fiscalYearNote?: string | null;
};

const formatAxisCurrencyShort = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return formatCurrency(v);
};

const buildDistribution = (base: DistributionSlice[]): DistributionSlice[] => {
  if (base.length <= 7) return base;

  const sorted = [...base].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const otherValue = sorted.slice(7).reduce((sum, s) => sum + s.value, 0);

  if (otherValue <= 0) return top;

  return [...top, { name: "Other", value: otherValue }];
};

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
  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : new Date().getFullYear());

  const deptSummaries: DepartmentSummary[] = useMemo(() => {
    const rows = (deptBudgetActuals ?? []).map((r) => {
      const budget = Number(r.budget_amount || 0);
      const actuals = Number(r.actual_amount || 0);
      const variance = actuals - budget;
      const percentSpent = budget === 0 ? 0 : (actuals / budget) * 100;
      return {
        department_name: r.department_name || "Unspecified",
        budget,
        actuals,
        variance,
        percentSpent,
      };
    });

    rows.sort((a, b) => b.budget - a.budget);
    return rows;
  }, [deptBudgetActuals]);

  const totalBudget = useMemo(
    () => deptSummaries.reduce((sum, d) => sum + d.budget, 0),
    [deptSummaries]
  );

  const totalActuals = useMemo(
    () => deptSummaries.reduce((sum, d) => sum + d.actuals, 0),
    [deptSummaries]
  );

  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const execPctClamped = Math.max(0, Math.min(execPct, 200));
  const execPctDisplay = Math.max(0, execPct);

  const budgetDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.budget > 0)
      .map((d) => ({ name: d.department_name, value: d.budget }));
    return buildDistribution(base);
  }, [deptSummaries]);

  const actualsDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.actuals > 0)
      .map((d) => ({ name: d.department_name, value: d.actuals }));
    return buildDistribution(base);
  }, [deptSummaries]);

  // Vendors (summary table)
  const { topVendors, totalVendorSpend, totalTransactionsCount } = useMemo(() => {
    if (!selectedYear || vendorSummaries.length === 0) {
      return { topVendors: [] as VendorSummary[], totalVendorSpend: 0, totalTransactionsCount: 0 };
    }

    const forYear = vendorSummaries.filter((v) => v.fiscal_year === selectedYear);
    const totalVendorSpend = forYear.reduce((sum, v) => sum + Number(v.total_amount || 0), 0);
    const totalTransactionsCount = forYear.reduce((sum, v) => sum + Number(v.txn_count || 0), 0);

    const vendors: VendorSummary[] = forYear
      .map((v) => {
        const name = v.vendor && v.vendor.trim().length > 0 ? v.vendor.trim() : "Unspecified";
        const total = Number(v.total_amount || 0);
        const percent = totalVendorSpend === 0 ? 0 : (total / totalVendorSpend) * 100;
        return { name, total, percent };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { topVendors: vendors, totalVendorSpend, totalTransactionsCount };
  }, [vendorSummaries, selectedYear]);

  // YOY chart data (already computed server-side)
  const yoyTrendData = useMemo(() => yoyTotals ?? [], [yoyTotals]);

  // Dept variance matrix (computed from all-years summary table)
  const deptYearVarianceRows: DeptYearVarianceRow[] = useMemo(() => {
    if (!deptAllYears || deptAllYears.length === 0) return [];

    const deptSet = new Set<string>();
    deptAllYears.forEach((r) => deptSet.add(r.department_name || "Unspecified"));

    const sortedYears = years.slice().sort((a, b) => a - b);
    const rows: DeptYearVarianceRow[] = [];

    deptSet.forEach((dept) => {
      const byYear: DeptYearVarianceRow["byYear"] = {};

      sortedYears.forEach((y) => {
        const row = deptAllYears.find(
          (r) => Number(r.fiscal_year) === y && (r.department_name || "Unspecified") === dept
        );

        if (!row) return;

        const budget = Number(row.budget_amount || 0);
        const actuals = Number(row.actual_amount || 0);
        const variance = actuals - budget;
        const percentSpent = budget === 0 ? 0 : (actuals / budget) * 100;

        byYear[y] = { variance, percentSpent };
      });

      rows.push({ department_name: dept, byYear });
    });

    const latestYear = sortedYears.length ? sortedYears[sortedYears.length - 1] : undefined;
    if (latestYear) {
      rows.sort((a, b) => {
        const av = a.byYear[latestYear]?.variance ?? 0;
        const bv = b.byYear[latestYear]?.variance ?? 0;
        return Math.abs(bv) - Math.abs(av);
      });
    }

    return rows;
  }, [deptAllYears, years]);

  const deptAdditionalStats = useMemo(() => {
    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let onTargetCount = 0;

    deptSummaries.forEach((d) => {
      if (d.budget === 0 && d.actuals === 0) return;
      const pct = d.percentSpent;
      if (Math.abs(pct - 100) <= 1) onTargetCount += 1;
      else if (d.variance > 0) overBudgetCount += 1;
      else underBudgetCount += 1;
    });

    return { underBudgetCount, overBudgetCount, onTargetCount };
  }, [deptSummaries]);

  const analyticsTitle = enableVendors ? "Budget, spending, and vendors" : "Budget and spending";
  const analyticsDescription = enableVendors
    ? "High-level trends, department performance, and vendor-level spending for the selected fiscal year."
    : "High-level trends and department performance for the selected fiscal year.";

  const showRevenueSummaryCard = enableRevenues && revenueSummary && revenueSummary.total >= 0;

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <SectionHeader
          eyebrow="Govwide analytics"
          title={analyticsTitle}
          description={analyticsDescription}
          rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
        />

        {fiscalYearNote && <p className="mb-3 px-1 text-xs text-slate-500">{fiscalYearNote}</p>}

        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 px-1 text-sm text-slate-600">
          <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
          <span className="text-slate-500">›</span>
          <span className="font-medium text-slate-700">Analytics</span>
        </nav>

        {showRevenueSummaryCard && (
          <CardContainer>
            <section
              aria-label="Revenue summary"
              className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Revenue summary</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Total recorded revenues for fiscal year <span className="font-semibold">{revenueSummary!.year}</span>.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total revenues ({revenueSummary!.year})
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(revenueSummary!.total)}
                  </p>
                </div>
                <Link
                  href={cityHref("/revenues")}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  View Revenues
                </Link>
              </div>
            </section>
          </CardContainer>
        )}

        <div className="space-y-4 md:space-y-6">
          <CardContainer>
            <section aria-label="Govwide budget and spending summary" className="grid gap-4 md:grid-cols-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Total budget ({yearLabel})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalBudget)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Total actuals ({yearLabel})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalActuals)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Variance (actuals - budget)
                </div>
                <div className={`mt-1 text-2xl font-bold ${variance < 0 ? "text-emerald-700" : variance > 0 ? "text-red-700" : "text-slate-900"}`}>
                  {formatCurrency(variance)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">% of budget spent</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{formatPercent(execPctDisplay)}</div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${execPct <= 100 ? "bg-sky-500" : "bg-red-500"}`} style={{ width: `${execPctClamped}%` }} />
                </div>
              </div>
            </section>
          </CardContainer>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 min-w-0 lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <CardContainer>
                  <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={budgetDistribution} dataKey="value" nameKey="name" outerRadius="80%" paddingAngle={1}>
                          {budgetDistribution.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContainer>

                <CardContainer>
                  <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={actualsDistribution} dataKey="value" nameKey="name" outerRadius="80%" paddingAngle={1}>
                          {actualsDistribution.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContainer>
              </div>

              <CardContainer>
                {deptSummaries.length === 0 ? (
                  <p className="text-sm text-slate-600">No budget/actuals data available for this year.</p>
                ) : (
                  <BudgetByDepartmentChart year={yearLabel} departments={deptSummaries} showTable={true} />
                )}
              </CardContainer>

              <CardContainer>
                <figure role="group" aria-labelledby="citywide-yoy-heading" className="space-y-3">
                  <h2 id="citywide-yoy-heading" className="text-sm font-semibold text-slate-800">
                    Govwide Budget vs Actuals Over Time
                  </h2>

                  {yoyTrendData.length === 0 ? (
                    <p className="text-sm text-slate-600">No multi-year data available.</p>
                  ) : (
                    <div className="h-80 w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yoyTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="year" tickLine={false} axisLine={false} />
                          <YAxis tickFormatter={formatAxisCurrencyShort} tickLine={false} axisLine={false} />
                          <Tooltip
                            labelFormatter={(label) => `Fiscal year ${label}`}
                            formatter={(value: any, name) =>
                              typeof value === "number" ? [formatCurrency(value), name] : [value, name]
                            }
                          />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="Budget" dot={false} strokeWidth={2} stroke={BUDGET_COLOR} />
                          <Line type="monotone" dataKey="Actuals" dot={false} strokeWidth={2} stroke={ACTUAL_COLOR} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </figure>
              </CardContainer>

              <CardContainer>
                <h2 className="text-sm font-semibold text-slate-800">Department Variance by Year</h2>
                {deptYearVarianceRows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No department/year variance data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[420px] overflow-y-auto">
                      <table className="min-w-full border border-slate-200 text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">Department</th>
                            {years.slice().sort((a, b) => a - b).map((y) => (
                              <th key={y} className="px-2 py-2 text-right">{y}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {deptYearVarianceRows.map((row) => (
                            <tr key={row.department_name} className="border-t border-slate-200">
                              <th scope="row" className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left font-medium text-slate-800">
                                {row.department_name}
                              </th>
                              {years.slice().sort((a, b) => a - b).map((y) => {
                                const cell = row.byYear[y];
                                if (!cell) {
                                  return (
                                    <td key={y} className="px-2 py-1 text-center text-slate-300">–</td>
                                  );
                                }

                                const varianceVal = cell.variance;
                                const pct = cell.percentSpent;
                                const isOver = varianceVal > 0;
                                const isNear = Math.abs(pct - 100) <= 1;

                                const bgClass = isNear
                                  ? "bg-slate-100 text-slate-700"
                                  : isOver
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700";

                                return (
                                  <td key={y} className={`px-2 py-1 text-right ${bgClass}`}>
                                    {formatCurrency(varianceVal)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-emerald-100" />
                        <span>Under budget</span>
                        <span className="font-semibold text-emerald-700">{deptAdditionalStats.underBudgetCount}</span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-slate-200" />
                        <span>Near budget</span>
                        <span className="font-semibold text-slate-700">{deptAdditionalStats.onTargetCount}</span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-red-100" />
                        <span>Over budget</span>
                        <span className="font-semibold text-red-700">{deptAdditionalStats.overBudgetCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContainer>
            </div>

            <div className="space-y-6 min-w-0">
              {enableVendors && (
                <CardContainer>
                  <h2 className="text-sm font-semibold text-slate-800">Top Vendors ({yearLabel})</h2>
                  {topVendors.length === 0 ? (
                    <p className="text-sm text-slate-600">No vendor-level spending available for this year.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {topVendors.map((v) => (
                        <div key={v.name} className="flex items-center justify-between gap-3">
                          <span className="truncate">{v.name}</span>
                          <span className="font-mono">{formatCurrency(v.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {enableTransactions && (
                    <div className="mt-3 text-xs text-slate-600">
                      Transactions (from vendor summaries):{" "}
                      <span className="font-semibold text-slate-900">
                        {totalTransactionsCount.toLocaleString("en-US")}
                      </span>
                    </div>
                  )}

                  <Link href={cityHref("/vendors")} className="mt-3 inline-block text-xs font-semibold text-sky-700 hover:underline">
                    View all vendors
                  </Link>
                </CardContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
