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
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import BudgetByDepartmentChart from "../Analytics/BudgetByDepartmentChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import type { BudgetActualsYearDeptRow, VendorYearSummary } from "@/lib/queries";
import { getMillionDomain } from "@/lib/chartDomain";


const BUDGET_COLOR = "#334155";
const ACTUAL_COLOR = "#0f766e";

const PIE_COLORS = [
  "#0f172a", // slate-900
  "#334155", // slate-700
  "#64748b", // slate-500
  "#0f766e", // teal-700 (positive alt)
  "#15803d", // green-700 (positive)
  "#b45309", // amber-700 (warning)
  "#b91c1c", // red-700 (negative)
  "#94a3b8", // slate-400 (fallback)
];


type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  variance: number;
  percentSpent: number;
};

type VendorSummary = {
  name: string;
  total: number;
  percent: number;
  txnCount: number;
};

type DistributionSlice = {
  name: string;
  value: number;
};

type DeptYearVarianceRow = {
  department_name: string;
  byYear: Record<
    number,
    {
      variance: number;
      percentSpent: number;
    }
  >;
};

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

function buildTopNPlusOther(items: DistributionSlice[], topN: number): DistributionSlice[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const otherValue = sorted.slice(topN).reduce((sum, r) => sum + r.value, 0);
  if (otherValue > 0) return [...top, { name: "Other", value: otherValue }];
  return top;
}

function clampPct(p: number) {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(p, 999));
}

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
  const yearValue =
    selectedYear ?? (years.length > 0 ? years[0] : new Date().getFullYear());
  const yearLabel = yearValue;

  const { deptSummaries, totalBudget, totalActuals } = useMemo(() => {
    const rows = deptBudgetActuals ?? [];

    const summaries: DepartmentSummary[] = rows.map((r) => {
      const budget = Number(r.budget_amount ?? 0);
      const actuals = Number(r.actual_amount ?? 0);
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

    summaries.sort((a, b) => b.budget - a.budget);

    const totalBudget = summaries.reduce((sum, d) => sum + (d.budget || 0), 0);
    const totalActuals = summaries.reduce((sum, d) => sum + (d.actuals || 0), 0);

    return { deptSummaries: summaries, totalBudget, totalActuals };
  }, [deptBudgetActuals]);

  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const execPctClamped = clampPct(execPct);

  const { topVendors, totalVendorSpend, totalTransactionsCount } = useMemo(() => {
    if (!enableTransactions) {
      return {
        topVendors: [] as VendorSummary[],
        totalVendorSpend: 0,
        totalTransactionsCount: 0,
      };
    }

    const rows = vendorSummaries ?? [];
    const totalVendorSpend = rows.reduce((sum, v) => sum + Number(v.total_amount || 0), 0);
    const totalTransactionsCount = rows.reduce((sum, v) => sum + Number(v.txn_count || 0), 0);

    const vendors: VendorSummary[] = rows
      .map((v) => {
        const name = (v.vendor || "Unspecified").toString();
        const total = Number(v.total_amount || 0);
        const txnCount = Number(v.txn_count || 0);
        const percent = totalVendorSpend === 0 ? 0 : (total / totalVendorSpend) * 100;
        return { name, total, percent, txnCount };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { topVendors: vendors, totalVendorSpend, totalTransactionsCount };
  }, [vendorSummaries, enableTransactions]);

  const topMovers = useMemo(() => {
    const rows = deptSummaries
      .map((d) => ({
        department_name: d.department_name,
        budget: d.budget,
        actuals: d.actuals,
        variance: d.actuals - d.budget,
        variancePct: d.budget === 0 ? 0 : ((d.actuals - d.budget) / d.budget) * 100,
      }))
      .filter((r) => Math.abs(r.variance) > 0.5);

    const over = rows
      .filter((r) => r.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5);

    const under = rows
      .filter((r) => r.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 5);

    return { over, under };
  }, [deptSummaries]);

  const budgetDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.budget > 0)
      .map((d) => ({ name: d.department_name, value: d.budget }));
    return buildTopNPlusOther(base, 7);
  }, [deptSummaries]);

  const actualsDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.actuals > 0)
      .map((d) => ({ name: d.department_name, value: d.actuals }));
    return buildTopNPlusOther(base, 7);
  }, [deptSummaries]);

const yoyTrendData = useMemo(() => {
  return (yoyTotals ?? []).slice();
}, [yoyTotals]);

const { yoyDomain, yoyTicks } = useMemo(() => {
  if (!yoyTrendData || yoyTrendData.length === 0) {
    return { yoyDomain: undefined, yoyTicks: undefined };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const row of yoyTrendData) {
    const b = Number(row.Budget ?? 0);
    const a = Number(row.Actuals ?? 0);

    if (Number.isFinite(b)) {
      min = Math.min(min, b);
      max = Math.max(max, b);
    }
    if (Number.isFinite(a)) {
      min = Math.min(min, a);
      max = Math.max(max, a);
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { yoyDomain: undefined, yoyTicks: undefined };
  }

  // convert to millions
  let minM = min / 1_000_000;
  let maxM = max / 1_000_000;

  // if flat, force a small band
  if (minM === maxM) {
    minM -= 0.1;
    maxM += 0.1;
  }

  // snap bounds to 0.1M
  const lowerM = Math.floor(minM * 10) / 10;
  const upperM = Math.ceil(maxM * 10) / 10;

  // build ticks every 0.1M
  const ticks: number[] = [];
  for (let v = lowerM; v <= upperM + 1e-9; v += 0.1) {
    ticks.push(Number(v.toFixed(1)) * 1_000_000);
  }

  return {
    yoyDomain: [lowerM * 1_000_000, upperM * 1_000_000] as [number, number],
    yoyTicks: ticks,
  };
}, [yoyTrendData]);




  const deptYearVarianceRows: DeptYearVarianceRow[] = useMemo(() => {
    if (!deptAllYears || deptAllYears.length === 0 || years.length === 0) return [];

    const sortedYears = years.slice().sort((a, b) => a - b);
    const byDept = new Map<string, Map<number, { variance: number; percentSpent: number }>>();

    for (const r of deptAllYears) {
      const dept = (r.department_name || "Unspecified").trim() || "Unspecified";
      const fy = Number(r.fiscal_year);
      if (!Number.isFinite(fy)) continue;

      const budget = Number(r.budget_amount ?? 0);
      const actual = Number(r.actual_amount ?? 0);
      const variance = actual - budget;
      const percentSpent = budget === 0 ? 0 : (actual / budget) * 100;

      if (!byDept.has(dept)) byDept.set(dept, new Map());
      byDept.get(dept)!.set(fy, { variance, percentSpent });
    }

    const rows: DeptYearVarianceRow[] = [];
    for (const [dept, perYear] of byDept.entries()) {
      const byYear: DeptYearVarianceRow["byYear"] = {};
      for (const y of sortedYears) {
        const cell = perYear.get(y);
        if (cell) byYear[y] = cell;
      }
      rows.push({ department_name: dept, byYear });
    }

    const latestYear = sortedYears[sortedYears.length - 1];
    rows.sort((a, b) => {
      const av = a.byYear[latestYear]?.variance ?? 0;
      const bv = b.byYear[latestYear]?.variance ?? 0;
      return Math.abs(bv) - Math.abs(av);
    });

    return rows;
  }, [deptAllYears, years]);

  const deptAdditionalStats = useMemo(() => {
    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let onTargetCount = 0;

    deptSummaries.forEach((d) => {
      if (d.budget === 0 && d.actuals === 0) return;

      const variance = d.actuals - d.budget;
      const pct = d.percentSpent;

      if (Math.abs(pct - 100) <= 5) onTargetCount += 1;
      else if (variance > 0) overBudgetCount += 1;
      else underBudgetCount += 1;
    });

    return { underBudgetCount, overBudgetCount, onTargetCount };
  }, [deptSummaries]);

  const analyticsTitle = enableVendors ? "Budget, spending, and vendors" : "Budget and spending";
  const analyticsDescription = enableVendors
    ? "High-level trends, department performance, and vendor-level spending for the selected fiscal year."
    : "High-level trends and department performance for the selected fiscal year.";

  const showRevenueSummaryCard = enableRevenues && revenueSummary && revenueSummary.total >= 0;

  const distributionTotalBudget = budgetDistribution.reduce((s, x) => s + x.value, 0);
  const distributionTotalActuals = actualsDistribution.reduce((s, x) => s + x.value, 0);

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
                <p className="mt-1 text-xs text-slate-500">Use the Revenues page for a full breakdown by source.</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total revenues ({revenueSummary!.year})
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(revenueSummary!.total)}</p>
                </div>
                <Link
                  href={cityHref("/revenues")}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
                <div className="mt-1 text-sm text-slate-600">Sum of all adopted budgets across departments.</div>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Total actuals ({yearLabel})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalActuals)}</div>
                <div className="mt-1 text-sm text-slate-600">All recorded spending for this fiscal year.</div>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Variance (actuals - budget)
                </div>
                <div
                  className={`mt-1 text-2xl font-bold ${
                    variance < 0 ? "text-emerald-700" : variance > 0 ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {formatCurrency(variance)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Negative indicates govwide under-spend versus adopted budget.
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">% of budget spent</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{formatPercent(execPct)}</div>
                <div className="mt-1 text-sm text-slate-600">Overall execution across all departments.</div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${execPct <= 100 ? "bg-slate-900" : "bg-red-500"}`}
                    style={{ width: `${Math.max(0, Math.min(execPctClamped, 100))}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </section>
          </CardContainer>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 min-w-0 lg:col-span-2">
              {/* Distribution pies — bigger pie, list below, remove tables */}
              <div className="grid gap-4 md:grid-cols-2">
                <CardContainer>
                  <figure role="group" className="space-y-3">
                    <div>
                      <h2 className="mb-1 text-sm font-semibold text-slate-800">
                        Budget distribution by department
                      </h2>
                      <p className="mb-2 text-sm text-slate-600">
                        Top 7 departments + Other for {yearLabel}.
                      </p>
                    </div>

                    {budgetDistribution.length === 0 ? (
                      <p className="text-sm text-slate-600">No budget data available for this year.</p>
                    ) : (
                      <>
                        <div className="h-72 w-full min-w-0 overflow-hidden sm:h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={budgetDistribution}
                                dataKey="value"
                                nameKey="name"
                                outerRadius="82%"
                                paddingAngle={1}
                              >
                                {budgetDistribution.map((entry, index) => {
                                  const isOther = entry.name === "Other";
                                  const color = isOther ? "#94a3b8" : PIE_COLORS[index % PIE_COLORS.length];
                                  return <Cell key={entry.name} fill={color} />;
                                })}
                              </Pie>
                              <Tooltip
formatter={(value: any, name?: string) => {
  const key = name ?? "";
  return [formatCurrency(Number(value ?? 0)), key];
}}

                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="pt-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Top shares
                          </div>
                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {budgetDistribution.map((slice, idx) => {
                              const isOther = slice.name === "Other";
                              const color = isOther ? "#94a3b8" : PIE_COLORS[idx % PIE_COLORS.length];
                              const pct =
                                distributionTotalBudget === 0 ? 0 : (slice.value / distributionTotalBudget) * 100;
                              return (
                                <li key={slice.name} className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-2">
                                    <span
                                      className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                                      style={{ backgroundColor: color }}
                                      aria-hidden="true"
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-900">{slice.name}</div>
                                      <div className="text-xs text-slate-500">{formatCurrency(slice.value)}</div>
                                    </div>
                                  </div>
                                  <div className="text-right font-mono text-sm text-slate-900">
                                    {formatPercent(pct, 1)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </>
                    )}
                  </figure>
                </CardContainer>

                <CardContainer>
                  <figure role="group" className="space-y-3">
                    <div>
                      <h2 className="mb-1 text-sm font-semibold text-slate-800">
                        Spending distribution by department
                      </h2>
                      <p className="mb-2 text-sm text-slate-600">
                        Top 7 departments + Other for {yearLabel}.
                      </p>
                    </div>

                    {actualsDistribution.length === 0 ? (
                      <p className="text-sm text-slate-600">No spending data available for this year.</p>
                    ) : (
                      <>
                        <div className="h-72 w-full min-w-0 overflow-hidden sm:h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={actualsDistribution}
                                dataKey="value"
                                nameKey="name"
                                outerRadius="82%"
                                paddingAngle={1}
                              >
                                {actualsDistribution.map((entry, index) => {
                                  const isOther = entry.name === "Other";
                                  const color = isOther ? "#94a3b8" : PIE_COLORS[index % PIE_COLORS.length];
                                  return <Cell key={entry.name} fill={color} />;
                                })}
                              </Pie>
                            <Tooltip
                              formatter={(value: any, name?: string) => {
                                const key = name ?? "";
                                return [formatCurrency(Number(value ?? 0)), key];
                              }}
                            />
   
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="pt-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Top shares
                          </div>
                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {actualsDistribution.map((slice, idx) => {
                              const isOther = slice.name === "Other";
                              const color = isOther ? "#94a3b8" : PIE_COLORS[idx % PIE_COLORS.length];
                              const pct =
                                distributionTotalActuals === 0 ? 0 : (slice.value / distributionTotalActuals) * 100;
                              return (
                                <li key={slice.name} className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-2">
                                    <span
                                      className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                                      style={{ backgroundColor: color }}
                                      aria-hidden="true"
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-900">{slice.name}</div>
                                      <div className="text-xs text-slate-500">{formatCurrency(slice.value)}</div>
                                    </div>
                                  </div>
                                  <div className="text-right font-mono text-sm text-slate-900">
                                    {formatPercent(pct, 1)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </>
                    )}
                  </figure>
                </CardContainer>
              </div>

              <CardContainer>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800">Budget vs Actuals by Department</h2>
                    <p className="text-sm text-slate-600">
                      Fiscal year {yearLabel}. Departments sorted by largest adopted budget.
                    </p>
                  </div>
                  {deptSummaries.length > 0 && (
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold">{deptSummaries.length}</span> departments.
                    </div>
                  )}
                </div>

                {deptSummaries.length === 0 ? (
                  <p className="text-sm text-slate-600">No budget/actuals data available for this year.</p>
                ) : (
                  <BudgetByDepartmentChart year={yearValue} departments={deptSummaries} showTable={true} />
                )}
              </CardContainer>

              <CardContainer>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Govwide Budget vs Actuals
                    </h2>
                    <p className="text-sm text-slate-600">
                      Govwide view of budget and actuals for {yearLabel}.
                    </p>

                  </div>
                  <div className="text-sm text-slate-600">{yearLabel} • Govwide totals</div>
                </div>

<div className="grid gap-4">
  <div className="space-y-2 text-sm min-w-0">
    {/* Budget / Actuals / Variance / % spent – leave this block exactly as-is */}
    <div className="flex items-center justify-between">
      <span className="text-slate-600">Budget</span>
      <span className="font-mono text-slate-900">{formatCurrency(totalBudget)}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-slate-600">Actuals</span>
      <span className="font-mono text-slate-900">{formatCurrency(totalActuals)}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-slate-600">Variance</span>
      <span
        className={`font-mono ${
          variance < 0 ? "text-emerald-700" : variance > 0 ? "text-red-700" : "text-slate-900"
        }`}
      >
        {formatCurrency(variance)}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-slate-600">% of budget spent</span>
      <span className="font-mono text-slate-900">{formatPercent(execPct)}</span>
    </div>

    <div className="mt-2 text-sm text-slate-600">
      Budget execution above 100% indicates total actual spending higher than the adopted budget.
    </div>
  </div>



                  <div className="min-w-0">

</div>

                </div>
              </CardContainer>

              <CardContainer>
                <figure role="group" className="space-y-3">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-800">Govwide Budget vs Actuals Over Time</h2>
                      <p className="text-sm text-slate-600">
                        Multi-year govwide view of total budget, actuals, and variance.
                      </p>
                    </div>
                  </div>

                  {yoyTrendData.length === 0 ? (
                    <p className="text-sm text-slate-600">No multi-year data available.</p>
                  ) : (
                    <>
                      <div className="h-80 w-full min-w-0 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={yoyTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="year" tickLine={false} axisLine={false} />
<YAxis
  domain={yoyDomain}
    ticks={yoyTicks}
  tickFormatter={formatAxisCurrencyShort}
/>

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
                    </>
                  )}
                </figure>
              </CardContainer>

              <CardContainer>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800">Department Variance by Year</h2>
                    <p className="text-sm text-slate-600">
                      For each department and fiscal year, shows whether spending was above or below budget.
                    </p>
                  </div>
                </div>

                {deptYearVarianceRows.length === 0 ? (
                  <p className="text-sm text-slate-600">No department/year variance data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[420px] overflow-y-auto">
                      <table className="min-w-full border border-slate-200 text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">Department</th>
                            {years.slice().sort((a, b) => a - b).map((year) => (
                              <th key={year} className="px-2 py-2 text-right">{year}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {deptYearVarianceRows.map((row) => (
                            <tr key={row.department_name} className="border-t border-slate-200">
                              <th
                                scope="row"
                                className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left font-medium text-slate-800"
                              >
                                {row.department_name}
                              </th>
                              {years.slice().sort((a, b) => a - b).map((year) => {
                                const cell = row.byYear[year];
                                if (!cell) return <td key={year} className="px-2 py-1 text-center text-slate-300">–</td>;

                                const varianceVal = cell.variance;
                                const pct = cell.percentSpent;
                                const isOver = varianceVal > 0;
                                const isNear = Math.abs(pct - 100) <= 5;

                                const bgClass = isNear
                                  ? "bg-slate-100 text-slate-700"
                                  : isOver
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700";

                                return (
                                  <td key={year} className={`px-2 py-1 text-right ${bgClass}`}>
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
<p className="mt-1 text-[11px] text-slate-500">
  Counts reflect fiscal year{" "}
  <span className="font-semibold text-slate-700">{yearLabel}</span>. Near budget means spending within ±5% of the adopted budget.
</p>


                  </div>
                )}
              </CardContainer>
            </div>

            <div className="space-y-6 min-w-0">
                            <CardContainer>
                <div className="space-y-2 text-sm text-slate-600">
                  <h2 className="text-sm font-semibold text-slate-800">How to use this page</h2>
                  <p>
                    Use this govwide view to quickly answer high-level questions about budget execution, spending trends,
                    and department performance across your government.
                  </p>
                  <p>
                    Drill down into the{" "}
                    <Link href={cityHref("/departments")} className="text-sm font-medium text-slate-800 hover:underline">
                      Departments
                    </Link>{" "}
                    view to see department-level detail.
                  </p>
                </div>
              </CardContainer>

              <CardContainer>
                <section aria-label="Top movers" className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Top movers ({yearLabel})</h2>
                    <p className="text-sm text-slate-600">
                      Biggest departments running above or below adopted budget.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-red-700">Most over budget</div>
                      {topMovers.over.length === 0 ? (
                        <p className="text-sm text-slate-600">No over-budget departments found.</p>
                      ) : (
                        <ul className="space-y-2">
                          {topMovers.over.map((r) => (
                            <li key={r.department_name} className="flex items-start justify-between gap-3">
                              <Link
                                href={`${cityHref(`/departments/${encodeURIComponent(r.department_name)}`)}?year=${yearValue}`}
                                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:underline"
                              >
                                {r.department_name}
                              </Link>
                              <div className="text-right">
                                <div className="font-mono text-sm text-red-700">{formatCurrency(r.variance)}</div>
                                <div className="text-xs text-slate-500">{formatPercent(r.variancePct, 1)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Most under budget</div>
                      {topMovers.under.length === 0 ? (
                        <p className="text-sm text-slate-600">No under-budget departments found.</p>
                      ) : (
                        <ul className="space-y-2">
                          {topMovers.under.map((r) => (
                            <li key={r.department_name} className="flex items-start justify-between gap-3">
                              <Link
                                href={`${cityHref(`/departments/${encodeURIComponent(r.department_name)}`)}?year=${yearValue}`}
                                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:underline"
                              >
                                {r.department_name}
                              </Link>
                              <div className="text-right">
                                <div className="font-mono text-sm text-emerald-700">{formatCurrency(r.variance)}</div>
                                <div className="text-xs text-slate-500">{formatPercent(r.variancePct, 1)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link href={cityHref("/departments")} className="text-sm font-medium text-slate-800 hover:underline">
                      View all departments →
                    </Link>
                  </div>

                </section>
              </CardContainer>

              {enableVendors && (
                <CardContainer>
                  <section aria-label="Top vendors for the selected fiscal year" className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-800">Top Vendors ({yearLabel})</h2>
                        <p className="text-sm text-slate-600">
                          Vendors ranked by total spending in the selected fiscal year.
                        </p>
                      </div>
                      <div className="text-sm text-slate-600">
                        {totalVendorSpend > 0 && (
                          <span>
                            Total vendor spend:{" "}
                            <span className="font-mono text-slate-900">{formatCurrency(totalVendorSpend)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {topVendors.length === 0 ? (
                      <p className="text-sm text-slate-600">No vendor-level spending available for this year.</p>
                    ) : (
                      <div className="space-y-1.5 text-sm text-slate-700">
                        {topVendors.map((vendor) => (
                          <div key={vendor.name} className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                {vendor.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate pr-2">{vendor.name}</span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <span className="font-mono">{formatCurrency(vendor.total)}</span>
                              <span className="text-xs text-slate-600">
                                {formatPercent(vendor.percent, 1)} • {vendor.txnCount.toLocaleString("en-US")} tx
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <Link href={cityHref("/vendors")} className="text-sm font-medium text-slate-800 hover:underline">
                        View all vendors →
                      </Link>
                    </div>
                  </section>
                </CardContainer>
              )}

              {enableTransactions && (
                <CardContainer>
                  <section aria-label="Transactions summary" className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-800">Transactions Overview</h2>
                        <p>Summary of transaction volume for {yearLabel}.</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Transactions
                        </div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          {totalTransactionsCount.toLocaleString("en-US")}
                        </div>
                      </div>
                    </div>

                    <p>
                      Use the{" "}
                      <Link href={cityHref("/transactions")} className="text-sm font-medium text-slate-800 hover:underline">
                        Transactions
                      </Link>{" "}
                      page to filter by department{enableVendors ? ", vendor" : ""} or keyword and export CSVs.
                    </p>
                  </section>
                </CardContainer>
              )}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}