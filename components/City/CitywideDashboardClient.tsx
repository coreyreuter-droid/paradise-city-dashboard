// components/City/CitywideDashboardClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type { BudgetRow, ActualRow, TransactionRow } from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import BudgetByDepartmentChart from "@/components/Analytics/BudgetByDepartmentChart";

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number) =>
  `${value.toFixed(1).replace(/-0\.0/, "0.0")}%`;

const formatAxisCurrency = (value: number) => {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const formatAxisCurrencyShort = (value: number) => {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const shortenLabel = (name: string, max = 26) => {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
};

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type CategorySummary = {
  category: string;
  total: number;
};

type VendorSummary = {
  name: string;
  total: number;
  percent: number;
};

type DistributionSlice = { name: string; value: number };

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

const buildDistribution = (items: DistributionSlice[]): DistributionSlice[] => {
  if (items.length <= 8) return items;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 8);
  const otherTotal = sorted.slice(8).reduce((sum, item) => sum + item.value, 0);

  return [...top, { name: "Other departments", value: otherTotal }];
};

const BUDGET_COLOR = "#3b82f6"; // blue-500
const ACTUAL_COLOR = "#111827"; // gray-900

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#facc15",
  "#60a5fa",
  "#a855f7",
  "#f97373",
  "#0ea5e9",
  "#10b981",
];

export default function CitywideDashboardClient({
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();

  // All available fiscal years
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    budgets.forEach((b) => yearSet.add(b.fiscal_year));
    actuals.forEach((a) => yearSet.add(a.fiscal_year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [budgets, actuals]);

  // Selected fiscal year from ?year=, defaulting to latest
  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (Number.isFinite(parsed) && years.includes(parsed)) {
      return parsed;
    }
    return years[0];
  }, [searchParams, years]);

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : new Date().getFullYear());

  const yearParam = selectedYear ? `?year=${selectedYear}` : "";

  // Aggregate budgets + actuals by department for selected year
  const {
    deptSummaries,
    totalBudget,
    totalActuals,
    budgetsForYear,
    actualsForYear,
  } = useMemo(() => {
    if (!selectedYear) {
      return {
        deptSummaries: [] as DepartmentSummary[],
        totalBudget: 0,
        totalActuals: 0,
        budgetsForYear: [] as BudgetRow[],
        actualsForYear: [] as ActualRow[],
      };
    }

    const budgetsForYear = budgets.filter((b) => b.fiscal_year === selectedYear);
    const actualsForYear = actuals.filter((a) => a.fiscal_year === selectedYear);

    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();

    budgetsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(dept, (budgetByDept.get(dept) || 0) + amt);
    });

    actualsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(dept, (actualsByDept.get(dept) || 0) + amt);
    });

    const allDepts = Array.from(
      new Set([...budgetByDept.keys(), ...actualsByDept.keys()])
    );

    const summaries: DepartmentSummary[] = allDepts.map((dept) => {
      const budget = budgetByDept.get(dept) || 0;
      const actuals = actualsByDept.get(dept) || 0;
      const percentSpent = budget === 0 ? 0 : (actuals / budget) * 100;

      return {
        department_name: dept,
        budget,
        actuals,
        percentSpent,
      };
    });

    const totalBudget = summaries.reduce((sum, d) => sum + d.budget, 0);
    const totalActuals = summaries.reduce((sum, d) => sum + d.actuals, 0);

    // Sort by largest budgets first
    summaries.sort((a, b) => b.budget - a.budget);

    return {
      deptSummaries: summaries,
      totalBudget,
      totalActuals,
      budgetsForYear,
      actualsForYear,
    };
  }, [budgets, actuals, selectedYear]);

  const variance = totalActuals - totalBudget;
  const execPct =
    totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

  // Filter transactions for selected year
  const transactionsForYear = useMemo(
    () =>
      selectedYear
        ? transactions.filter((t) => t.fiscal_year === selectedYear)
        : [],
    [transactions, selectedYear]
  );

  // Top vendors by spend (+ % of total)
  const {
    topVendors,
    totalVendorSpend,
  }: {
    topVendors: VendorSummary[];
    totalVendorSpend: number;
  } = useMemo(() => {
    const byVendor = new Map<string, number>();
    transactionsForYear.forEach((tx) => {
      const vendor =
        tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified";
      const amt = Number(tx.amount || 0);
      byVendor.set(vendor, (byVendor.get(vendor) || 0) + amt);
    });

    const total = Array.from(byVendor.values()).reduce((sum, v) => sum + v, 0);

    const vendors = Array.from(byVendor.entries()).map(([name, total]) => ({
      name,
      total,
      percent:
        total === 0 || total === undefined || !Number.isFinite(total)
          ? 0
          : (total / (total || 1)) * 100, // placeholder, fixed below
    }));

    // Actually compute percent of global total
    const adjusted = vendors.map((v) => ({
      ...v,
      percent: total > 0 ? (v.total / total) * 100 : 0,
    }));

    const sorted = adjusted.sort((a, b) => b.total - a.total).slice(0, 10);

    return {
      topVendors: sorted,
      totalVendorSpend: total,
    };
  }, [transactionsForYear]);

  // Budget distribution (top departments + "Other") for pie
  const budgetDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.budget > 0)
      .map((d) => ({
        name: d.department_name,
        value: d.budget,
      }));

    return buildDistribution(base);
  }, [deptSummaries]);

  // Actuals distribution (top departments + "Other") for pie
  const actualsDistribution = useMemo(() => {
    const base: DistributionSlice[] = deptSummaries
      .filter((d) => d.actuals > 0)
      .map((d) => ({
        name: d.department_name,
        value: d.actuals,
      }));

    return buildDistribution(base);
  }, [deptSummaries]);

  // Top spending categories (actuals grouped by category)
  const categorySummaries: CategorySummary[] = useMemo(() => {
    if (!selectedYear) return [];
    const byCategory = new Map<string, number>();

    actualsForYear.forEach((row) => {
      const cat =
        row.category && row.category.trim().length > 0
          ? row.category
          : "Unspecified";
      const amt = Number(row.amount || 0);
      byCategory.set(cat, (byCategory.get(cat) || 0) + amt);
    });

    return Array.from(byCategory.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [actualsForYear, selectedYear]);

  // ---- X-axis helpers for Top spending categories ----
  const maxCategoryTotal = useMemo(
    () =>
      categorySummaries.length > 0
        ? Math.max(...categorySummaries.map((c) => Math.max(0, c.total)))
        : 0,
    [categorySummaries]
  );

  const categoryTicks = useMemo(() => {
    if (!maxCategoryTotal) return [0];
    const step = maxCategoryTotal / 4;
    return [0, step, step * 2, step * 3, maxCategoryTotal];
  }, [maxCategoryTotal]);

  // Multi-year trend line (total budget vs actuals)
  const multiYearTrend = useMemo(() => {
    const byYear = new Map<
      number,
      { year: number; budget: number; actuals: number }
    >();

    budgets.forEach((b) => {
      const year = b.fiscal_year;
      const entry = byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.budget += Number(b.amount || 0);
      byYear.set(year, entry);
    });

    actuals.forEach((a) => {
      const year = a.fiscal_year;
      const entry = byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.actuals += Number(a.amount || 0);
      byYear.set(year, entry);
    });

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [budgets, actuals]);

  const execPctClamped = Math.max(0, Math.min(execPct, 150));
  const execPctDisplay = execPct < 0 ? 0 : execPct;

  // ---- Department P&L (per-department variance for selected year) ----
  const departmentPnl = useMemo(
    () =>
      deptSummaries.map((d) => ({
        ...d,
        variance: d.budget - d.actuals,
      })),
    [deptSummaries]
  );

  // ---- Citywide YOY variance matrix (departments x years) ----
  const {
    varianceMatrixRows,
    varianceMatrixYears,
  }: {
    varianceMatrixRows: DeptYearVarianceRow[];
    varianceMatrixYears: number[];
  } = useMemo(() => {
    const yearSet = new Set<number>();
    budgets.forEach((b) => yearSet.add(b.fiscal_year));
    actuals.forEach((a) => yearSet.add(a.fiscal_year));

    const allYears = Array.from(yearSet).sort((a, b) => a - b);
    if (allYears.length === 0) {
      return { varianceMatrixRows: [], varianceMatrixYears: [] };
    }

    type Agg = { budget: number; actuals: number };
    const map = new Map<string, Map<number, Agg>>();

    const upsert = (
      deptRaw: string | null,
      year: number,
      field: keyof Agg,
      amount: number
    ) => {
      const dept = (deptRaw ?? "Unspecified").trim() || "Unspecified";
      let byYear = map.get(dept);
      if (!byYear) {
        byYear = new Map<number, Agg>();
        map.set(dept, byYear);
      }
      const existing = byYear.get(year) || { budget: 0, actuals: 0 };
      existing[field] += amount;
      byYear.set(year, existing);
    };

    budgets.forEach((b) => {
      upsert(b.department_name, b.fiscal_year, "budget", Number(b.amount || 0));
    });

    actuals.forEach((a) => {
      upsert(
        a.department_name,
        a.fiscal_year,
        "actuals",
        Number(a.amount || 0)
      );
    });

    const rows: DeptYearVarianceRow[] = Array.from(map.entries()).map(
      ([department_name, byYearMap]) => {
        const byYear: DeptYearVarianceRow["byYear"] = {};

        allYears.forEach((year) => {
          const agg = byYearMap.get(year) || { budget: 0, actuals: 0 };
          const variance = agg.actuals - agg.budget;
          const percentSpent =
            agg.budget === 0 ? 0 : (agg.actuals / agg.budget) * 100;
          byYear[year] = { variance, percentSpent };
        });

        return { department_name, byYear };
      }
    );

    const latestYear = allYears[allYears.length - 1];
    rows.sort((a, b) => {
      const av = Math.abs(a.byYear[latestYear]?.variance ?? 0);
      const bv = Math.abs(b.byYear[latestYear]?.variance ?? 0);
      return bv - av;
    });

    const limitedRows = rows.slice(0, 12);

    return {
      varianceMatrixRows: limitedRows,
      varianceMatrixYears: allYears,
    };
  }, [budgets, actuals]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Citywide overview"
          title="Citywide Overview"
          description="High-level view of budgets, actual spending, and top vendors across all departments."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect options={years} label="Fiscal year" />
            ) : null
          }
        />
        <div className="mb-4 flex items-center gap-1 text-[11px] text-slate-500 px-1">
          <Link
            href="/paradise"
            className="hover:text-slate-800"
          >
            Overview
          </Link>
          <span className="text-slate-400">›</span>
          <span className="font-medium text-slate-700">
            Analytics
          </span>
        </div>

        {/* Top-level metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Budget ({yearLabel})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalBudget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Actuals ({yearLabel})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalActuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatPercent(execPct)} of budget spent
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Variance ({yearLabel})
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${
                variance > 0
                  ? "text-emerald-700"
                  : variance < 0
                  ? "text-red-700"
                  : "text-slate-900"
              }`}
            >
              {formatCurrency(variance)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Positive = under budget; negative = over budget.
            </div>
          </CardContainer>

          {/* Budget execution gauge */}
          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Budget execution
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatPercent(execPctDisplay)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Overall share of adopted budget that has been spent.
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${
                  execPct <= 100 ? "bg-sky-500" : "bg-red-500"
                }`}
                style={{ width: `${execPctClamped}%` }}
              />
            </div>
          </CardContainer>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left side: pies + dept chart + P&L + trend + matrix */}
          <div className="space-y-6 lg:col-span-2">
            {/* Distribution pies */}
            <div className="grid gap-4 md:grid-cols-2">
              <CardContainer>
                <h2 className="mb-1 text-sm font-semibold text-slate-800">
                  Budget distribution by department
                </h2>
                <p className="mb-2 text-xs text-slate-500">
                  How the adopted budget is allocated across departments in{" "}
                  {yearLabel}.
                </p>
                {budgetDistribution.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No budget data available for this year.
                  </p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={budgetDistribution}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {budgetDistribution.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name) =>
                              typeof value === "number"
                                ? [formatCurrency(value), name]
                                : [value, name]
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {budgetDistribution.map((slice, index) => {
                        const percent =
                          totalBudget > 0
                            ? (slice.value / totalBudget) * 100
                            : 0;
                        return (
                          <div
                            key={slice.name}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                              <span className="max-w-[8.5rem] truncate sm:max-w-[11rem]">
                                {slice.name}
                              </span>
                            </div>
                            <span className="whitespace-nowrap">
                              {Math.round(percent)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContainer>

              <CardContainer>
                <h2 className="mb-1 text-sm font-semibold text-slate-800">
                  Spending distribution by department
                </h2>
                <p className="mb-2 text-xs text-slate-500">
                  Where actual spending has gone so far in {yearLabel}.
                </p>
                {actualsDistribution.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No spending data available for this year.
                  </p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={actualsDistribution}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {actualsDistribution.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name) =>
                              typeof value === "number"
                                ? [formatCurrency(value), name]
                                : [value, name]
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {actualsDistribution.map((slice, index) => {
                        const percent =
                          totalActuals > 0
                            ? (slice.value / totalActuals) * 100
                            : 0;
                        return (
                          <div
                            key={slice.name}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                              <span className="max-w-[8.5rem] truncate sm:max-w-[11rem]">
                                {slice.name}
                              </span>
                            </div>
                            <span className="whitespace-nowrap">
                              {Math.round(percent)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContainer>
            </div>

            {/* Department chart */}
            <CardContainer>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Budget vs actuals by department
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fiscal year {yearLabel}. Departments sorted by largest
                    adopted budget.
                  </p>
                </div>
                {deptSummaries.length > 0 && (
                  <div className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold">
                      {deptSummaries.length}
                    </span>{" "}
                    departments.
                  </div>
                )}
              </div>

              {deptSummaries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No budget/actuals data available for this year.
                </p>
              ) : (
                <BudgetByDepartmentChart
                  year={yearLabel}
                  departments={deptSummaries}
                />
              )}
            </CardContainer>

            {/* Department P&L table for selected year */}
            <CardContainer>
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Department P&amp;L (budget vs actuals vs variance)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fiscal year {yearLabel}. Positive variance = remaining
                    budget; negative variance = over-spend.
                  </p>
                </div>
                {departmentPnl.length > 0 && (
                  <div className="text-xs text-slate-500">
                    Top{" "}
                    <span className="font-semibold">
                      {Math.min(departmentPnl.length, 15)}
                    </span>{" "}
                    departments by budget.
                  </div>
                )}
              </div>

              {departmentPnl.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No department-level P&amp;L data available for this year.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="mt-1 w-full min-w-[520px] border-separate border-spacing-y-1 text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="py-1 pr-2">Department</th>
                        <th className="py-1 pr-2 text-right">Budget</th>
                        <th className="py-1 pr-2 text-right">Actuals</th>
                        <th className="py-1 pr-2 text-right">Variance</th>
                        <th className="py-1 pr-2 text-right">% Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentPnl
                        .slice(0, 15)
                        .map(
                          ({
                            department_name,
                            budget,
                            actuals,
                            percentSpent,
                            variance,
                          }) => (
                            <tr
                              key={department_name}
                              className="rounded-md bg-white text-slate-800 shadow-sm"
                            >
                              <td className="max-w-[220px] truncate py-1.5 pl-2 pr-2 align-middle">
                                <Link
                                  href={`/paradise/departments/${encodeURIComponent(
                                    department_name
                                  )}${yearParam}`}
                                  className="font-medium text-sky-700 hover:underline"
                                >
                                  {department_name}
                                </Link>
                              </td>
                              <td className="whitespace-nowrap py-1.5 px-2 text-right align-middle font-mono text-[11px] sm:text-xs">
                                {formatCurrency(budget)}
                              </td>
                              <td className="whitespace-nowrap py-1.5 px-2 text-right align-middle font-mono text-[11px] sm:text-xs">
                                {formatCurrency(actuals)}
                              </td>
                              <td
                                className={`whitespace-nowrap py-1.5 px-2 text-right align-middle font-mono text-[11px] sm:text-xs ${
                                  variance > 0
                                    ? "text-emerald-700"
                                    : variance < 0
                                    ? "text-red-700"
                                    : "text-slate-700"
                                }`}
                              >
                                {formatCurrency(variance)}
                              </td>
                              <td className="whitespace-nowrap py-1.5 pr-3 pl-2 text-right align-middle font-mono text-[11px] sm:text-xs text-slate-700">
                                {formatPercent(percentSpent)}
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContainer>

            {/* Multi-year trend */}
            <CardContainer>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Multi-year budget vs actuals trend
                  </h2>
                  <p className="text-xs text-slate-500">
                    Total adopted budget compared to actual spending over time.
                  </p>
                </div>
              </div>

              {multiYearTrend.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Not enough data to show a trend.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={multiYearTrend.map((d) => ({
                        year: d.year,
                        Budget: d.budget,
                        Actuals: d.actuals,
                      }))}
                      margin={{ top: 10, right: 16, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis
                        tickFormatter={formatAxisCurrency}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={80}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        labelFormatter={(label) => `Fiscal year ${label}`}
                        formatter={(value: any, name) =>
                          typeof value === "number"
                            ? [formatCurrency(value), name]
                            : [value, name]
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Budget"
                        dot={false}
                        strokeWidth={2}
                        stroke={BUDGET_COLOR}
                      />
                      <Line
                        type="monotone"
                        dataKey="Actuals"
                        dot={false}
                        strokeWidth={2}
                        stroke={ACTUAL_COLOR}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContainer>

            {/* Citywide YOY variance matrix */}
            <CardContainer>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Department variance by year
                  </h2>
                  <p className="text-xs text-slate-500">
                    Variance (actuals minus budget) across years for the largest
                    departments. Positive = over budget; negative = under.
                  </p>
                </div>
                {varianceMatrixRows.length > 0 && (
                  <div className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold">
                      {varianceMatrixRows.length}
                    </span>{" "}
                    departments across{" "}
                    <span className="font-semibold">
                      {varianceMatrixYears.length}
                    </span>{" "}
                    years.
                  </div>
                )}
              </div>

              {varianceMatrixRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Not enough data to compute a variance matrix.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="py-2 pr-2">Department</th>
                        {varianceMatrixYears.map((year) => (
                          <th
                            key={year}
                            className="py-2 px-2 text-right"
                          >
                            {year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {varianceMatrixRows.map((row) => (
                        <tr
                          key={row.department_name}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="max-w-[200px] truncate py-1.5 pr-2 align-middle text-slate-800">
                            <Link
                              href={`/paradise/departments/${encodeURIComponent(
                                row.department_name
                              )}`}
                              className="font-medium text-sky-700 hover:underline"
                            >
                              {row.department_name}
                            </Link>
                          </td>
                          {varianceMatrixYears.map((year) => {
                            const cell = row.byYear[year] || {
                              variance: 0,
                              percentSpent: 0,
                            };
                            const cls =
                              cell.variance > 0
                                ? "text-red-700"
                                : cell.variance < 0
                                ? "text-emerald-700"
                                : "text-slate-700";
                            return (
                              <td
                                key={year}
                                className={`whitespace-nowrap py-1.5 px-2 text-right align-middle font-mono text-[11px] sm:text-xs ${cls}`}
                              >
                                <div>{formatCurrency(cell.variance)}</div>
                                <div className="text-[10px] text-slate-400">
                                  {formatPercent(cell.percentSpent)} spent
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContainer>
          </div>

          {/* Right side: categories + vendors + drill */}
          <div className="space-y-4">
            {/* Top categories */}
            <CardContainer>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Top spending categories
              </h2>
              {categorySummaries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No spending breakdown by category available for this year.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categorySummaries}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      barCategoryGap={12}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        domain={[
                          0,
                          maxCategoryTotal ? maxCategoryTotal : 1,
                        ]}
                        ticks={categoryTicks}
                        tickFormatter={formatAxisCurrencyShort}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={90}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(name: string) =>
                          shortenLabel(name)
                        }
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value: any) =>
                          typeof value === "number"
                            ? formatCurrency(value)
                            : value
                        }
                      />
                      <Bar
                        dataKey="total"
                        barSize={10}
                        radius={[0, 4, 4, 0]}
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContainer>

            {/* Top vendors */}
            <CardContainer>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Top vendors by spend
              </h2>
              {transactionsForYear.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No transactions available for this year.
                </p>
              ) : topVendors.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Could not compute vendor breakdown.
                </p>
              ) : (
                <ul className="space-y-2 text-xs sm:text-sm">
                  {topVendors.map((vendor) => (
                    <li key={vendor.name}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate pr-2">
                          {vendor.name}
                        </span>
                        <span className="whitespace-nowrap font-mono">
                          {formatCurrency(vendor.total)}
                        </span>
                      </div>
                      {totalVendorSpend > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-sky-500"
                              style={{
                                width: `${Math.max(
                                  2,
                                  Math.min(vendor.percent, 100)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-[11px] text-slate-500">
                            {formatPercent(vendor.percent)}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContainer>

            {/* Drill card */}
            <CardContainer>
              <div className="text-sm">
                <div className="font-semibold text-slate-800">
                  Drill into departments
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  For more detail, use the{" "}
                  <Link
                    href="/paradise/departments"
                    className="font-medium text-sky-700 hover:underline"
                  >
                    Departments
                  </Link>{" "}
                  view to see multi-year trends and department-level
                  transactions.
                </p>
              </div>
            </CardContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
