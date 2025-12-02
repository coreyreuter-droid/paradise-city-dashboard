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
import BudgetByDepartmentChart from "../Analytics/BudgetByDepartmentChart";
import { formatCurrency, formatPercent } from "@/lib/format";

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

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
};

const formatAxisCurrencyShort = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const safeFiscalYear = (val: unknown): number | null => {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

const buildDistribution = (base: DistributionSlice[]): DistributionSlice[] => {
  if (base.length <= 8) {
    return base;
  }

  const sorted = [...base].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const otherValue = sorted.slice(7).reduce((sum, s) => sum + s.value, 0);

  if (otherValue <= 0) return top;

  return [
    ...top,
    {
      name: "Other",
      value: otherValue,
    },
  ];
};

export default function CitywideDashboardClient({
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();

  const years = useMemo(() => {
    const set = new Set<number>();

    budgets.forEach((b) => {
      const fy = safeFiscalYear(b.fiscal_year);
      if (fy !== null) set.add(fy);
    });

    actuals.forEach((a) => {
      const fy = safeFiscalYear(a.fiscal_year);
      if (fy !== null) set.add(fy);
    });

    transactions.forEach((t) => {
      const fy = safeFiscalYear(t.fiscal_year);
      if (fy !== null) set.add(fy);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [budgets, actuals, transactions]);

  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;
    const param = searchParams.get("year");

    if (!param) {
      return years[0];
    }

    const parsed = Number(param);
    if (Number.isNaN(parsed)) {
      return years[0];
    }

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

    const deptSummaries: DepartmentSummary[] = allDepts.map((dept) => {
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

    deptSummaries.sort((a, b) => b.budget - a.budget);

    const totalBudget = deptSummaries.reduce(
      (sum, d) => sum + d.budget,
      0
    );
    const totalActuals = deptSummaries.reduce(
      (sum, d) => sum + d.actuals,
      0
    );

    return {
      deptSummaries,
      totalBudget,
      totalActuals,
      budgetsForYear,
      actualsForYear,
    };
  }, [budgets, actuals, selectedYear]);

  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const execPctClamped = Math.max(0, Math.min(150, execPct));

  const execPctDisplay = execPct < 0
    ? 0
    : execPct > 999
    ? 999
    : execPct;

  const hasAnyActualsForSelectedYear = deptSummaries.some(
    (d) => d.actuals > 0
  );

  // Total transactions + top vendors for selected year
  const { transactionsForYear, topVendors, totalVendorSpend } =
    useMemo(() => {
      if (!selectedYear) {
        return {
          transactionsForYear: [] as TransactionRow[],
          topVendors: [] as VendorSummary[],
          totalVendorSpend: 0,
        };
      }

      const filtered = transactions.filter(
        (tx) => tx.fiscal_year === selectedYear
      );

      const byVendor = new Map<string, number>();

      filtered.forEach((tx) => {
        const name =
          (tx.vendor && tx.vendor.trim().length > 0
            ? tx.vendor
            : "Unspecified") ?? "Unspecified";
        const amt = Number(tx.amount || 0);
        byVendor.set(name, (byVendor.get(name) || 0) + amt);
      });

      const totalVendorSpend = Array.from(byVendor.values()).reduce(
        (sum, v) => sum + v,
        0
      );

      const vendorRows: VendorSummary[] = Array.from(
        byVendor.entries()
      )
        .map(([name, total]) => ({
          name,
          total,
          percent:
            totalVendorSpend === 0
              ? 0
              : (total / totalVendorSpend) * 100,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      return {
        transactionsForYear: filtered,
        topVendors: vendorRows,
        totalVendorSpend,
      };
    }, [transactions, selectedYear]);

  const deptAdditionalStats = useMemo(() => {
    if (deptSummaries.length === 0) {
      return {
        underBudgetCount: 0,
        overBudgetCount: 0,
        onTargetCount: 0,
      };
    }

    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let onTargetCount = 0;

    deptSummaries.forEach((d) => {
      if (d.budget === 0 && d.actuals === 0) {
        return;
      }
      const diff = d.actuals - d.budget;
      const pctDiff =
        d.budget === 0 ? 0 : (diff / d.budget) * 100;

      if (Math.abs(pctDiff) <= 1) {
        onTargetCount += 1;
      } else if (diff > 0) {
        overBudgetCount += 1;
      } else {
        underBudgetCount += 1;
      }
    });

    return {
      underBudgetCount,
      overBudgetCount,
      onTargetCount,
    };
  }, [deptSummaries]);

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

    const total = Array.from(byCategory.values()).reduce(
      (sum, v) => sum + v,
      0
    );
    if (total === 0) return [];

    return Array.from(byCategory.entries())
      .map(([category, amount]) => ({
        category,
        total: amount,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [actualsForYear, selectedYear]);

  // Citywide department/year variance matrix
  const deptYearVarianceRows: DeptYearVarianceRow[] = useMemo(() => {
    if (budgets.length === 0 && actuals.length === 0) {
      return [];
    }

    const yearSet = new Set<number>();
    budgets.forEach((b) => {
      const fy = safeFiscalYear(b.fiscal_year);
      if (fy !== null) yearSet.add(fy);
    });
    actuals.forEach((a) => {
      const fy = safeFiscalYear(a.fiscal_year);
      if (fy !== null) yearSet.add(fy);
    });

    const allYears = Array.from(yearSet).sort((a, b) => a - b);
    if (allYears.length === 0) return [];

    const map = new Map<
      string,
      Map<
        number,
        {
          budget: number;
          actuals: number;
        }
      >
    >();

    const upsert = (
      dept: string | null,
      year: number,
      type: "budget" | "actuals",
      val: number
    ) => {
      const department_name = dept || "Unspecified";
      if (!map.has(department_name)) {
        map.set(department_name, new Map());
      }
      const byYear = map.get(department_name)!;
      const entry =
        byYear.get(year) || { budget: 0, actuals: 0 };
      entry[type] += val;
      byYear.set(year, entry);
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
      const aLatest = a.byYear[latestYear]?.variance ?? 0;
      const bLatest = b.byYear[latestYear]?.variance ?? 0;
      return Math.abs(bLatest) - Math.abs(aLatest);
    });

    return rows;
  }, [budgets, actuals]);

  const yoyTrendData = useMemo(() => {
    if (budgets.length === 0 && actuals.length === 0) {
      return [];
    }

    const yearSet = new Set<number>();
    budgets.forEach((b) => {
      const fy = safeFiscalYear(b.fiscal_year);
      if (fy !== null) yearSet.add(fy);
    });
    actuals.forEach((a) => {
      const fy = safeFiscalYear(a.fiscal_year);
      if (fy !== null) yearSet.add(fy);
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);

    const result: {
      year: number;
      Budget: number;
      Actuals: number;
      Variance: number;
    }[] = [];

    sortedYears.forEach((year) => {
      const budgetTotal = budgets
        .filter((b) => b.fiscal_year === year)
        .reduce((sum, b) => sum + Number(b.amount || 0), 0);

      const actualsTotal = actuals
        .filter((a) => a.fiscal_year === year)
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);

      const variance = actualsTotal - budgetTotal;

      result.push({
        year,
        Budget: budgetTotal,
        Actuals: actualsTotal,
        Variance: variance,
      });
    });

    return result;
  }, [budgets, actuals]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Citywide overview"
          title="Citywide Overview"
          description="Multi-year citywide budget vs actuals, department performance, and spending distribution."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect
                options={years}
                label="Fiscal year"
              />
            ) : null
          }
        />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1 px-1 text-[11px] text-slate-500"
        >
          <Link href="/paradise" className="hover:text-slate-800">
            Overview
          </Link>
          <span className="text-slate-400">›</span>
          <span className="font-medium text-slate-700">
            Analytics
          </span>
        </nav>

        <div className="space-y-6">
          {/* High-level KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <CardContainer>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total budget ({yearLabel})
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalBudget)}
              </div>
            </CardContainer>

            <CardContainer>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total actuals ({yearLabel})
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalActuals)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {hasAnyActualsForSelectedYear
                  ? "Includes all posted transactions."
                  : "Actuals not yet available for this year."}
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
                {formatCurrency(Math.abs(variance))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {variance === 0
                  ? "On budget."
                  : variance > 0
                  ? "Over adopted budget."
                  : "Under adopted budget."}
              </div>
            </CardContainer>

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
                    How the adopted budget is allocated across departments for{" "}
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
                              outerRadius="80%"
                            >
                              {budgetDistribution.map((_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    PIE_COLORS[
                                      index % PIE_COLORS.length
                                    ]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any, name: string) => [
                                formatCurrency(Number(value)),
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {budgetDistribution.map((slice, index) => {
                          const total = budgetDistribution.reduce(
                            (sum, s) => sum + s.value,
                            0
                          );
                          const percent =
                            total === 0
                              ? 0
                              : (slice.value / total) * 100;

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
                                      PIE_COLORS[
                                        index % PIE_COLORS.length
                                      ],
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
                              outerRadius="80%"
                            >
                              {actualsDistribution.map((_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    PIE_COLORS[
                                      index % PIE_COLORS.length
                                    ]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any, name: string) => [
                                formatCurrency(Number(value)),
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {actualsDistribution.map((slice, index) => {
                          const total = actualsDistribution.reduce(
                            (sum, s) => sum + s.value,
                            0
                          );
                          const percent =
                            total === 0
                              ? 0
                              : (slice.value / total) * 100;

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
                                      PIE_COLORS[
                                        index % PIE_COLORS.length
                                      ],
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

              {/* Budget vs actuals by department */}
              <CardContainer>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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

              {/* Citywide P&L and top categories */}
              <CardContainer>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Citywide budget vs actuals and categories
                    </h2>
                    <p className="text-xs text-slate-500">
                      Citywide view of budget, actuals, and top spending
                      categories for {yearLabel}.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {yearLabel} • Citywide totals
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Budget</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Actuals</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(totalActuals)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Variance</span>
                      <span
                        className={`font-mono ${
                          variance > 0
                            ? "text-emerald-700"
                            : variance < 0
                            ? "text-red-700"
                            : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(Math.abs(variance))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Budget execution
                      </span>
                      <span className="font-mono text-slate-900">
                        {formatPercent(execPctDisplay)}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500">
                      Budget execution above 100% indicates total actual
                      spending higher than the adopted budget.
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Top spending categories
                    </h3>
                    {categorySummaries.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No categorized spending available for this year.
                      </p>
                    ) : (
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {categorySummaries.map((cat) => (
                          <div key={cat.category}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate pr-2">
                                {cat.category}
                              </span>
                              <span className="whitespace-nowrap font-mono">
                                {formatCurrency(cat.total)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContainer>

              {/* YOY Budget vs Actuals line chart */}
              <CardContainer>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Citywide budget vs actuals over time
                    </h2>
                    <p className="text-xs text-slate-500">
                      Multi-year citywide view of total budget, actuals, and
                      variance.
                    </p>
                  </div>
                </div>

                {yoyTrendData.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No multi-year data available.
                  </p>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={yoyTrendData}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 10,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={formatAxisCurrencyShort}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          labelFormatter={(label) =>
                            `Fiscal year ${label}`
                          }
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
                      For each department and fiscal year, shows whether
                      spending was above or below budget.
                    </p>
                  </div>
                </div>

                {deptYearVarianceRows.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No department/year variance data available.
                  </p>
                ) : (
                  <div className="max-h-[420px] overflow-auto">
                    <table className="min-w-full border border-slate-200 text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">
                            Department
                          </th>
                          {years
                            .slice()
                            .sort((a, b) => a - b)
                            .map((year) => (
                              <th
                                key={year}
                                className="px-2 py-2 text-right"
                              >
                                {year}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deptYearVarianceRows.map(
                          ({ department_name, byYear }) => (
                            <tr
                              key={department_name}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="sticky left-0 z-[1] bg-white px-2 py-1.5 pr-3 text-left align-top text-xs font-medium text-slate-900">
                                <Link
                                  href={`/paradise/departments/${encodeURIComponent(
                                    department_name
                                  )}${yearParam}`}
                                  className="hover:underline"
                                >
                                  {department_name}
                                </Link>
                              </td>
                              {years
                                .slice()
                                .sort((a, b) => a - b)
                                .map((year) => {
                                  const cell =
                                    byYear[year] ?? {
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
                                      className={`whitespace-nowrap px-2 py-1.5 text-right align-middle font-mono text-[11px] sm:text-xs ${cls}`}
                                    >
                                      <div>
                                        {formatCurrency(
                                          cell.variance
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {formatPercent(
                                          cell.percentSpent
                                        )}{" "}
                                        spent
                                      </div>
                                    </td>
                                  );
                                })}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContainer>
            </div>

            {/* Right side: department status + vendors + guidance */}
            <div className="space-y-6">
              {/* Department status */}
              <CardContainer>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Department budget status
                  </h2>
                  <p className="text-xs text-slate-500">
                    How departments are tracking relative to budget in{" "}
                    {yearLabel}.
                  </p>
                </div>

                {deptSummaries.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No department data available for this year.
                  </p>
                ) : (
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Under budget</span>
                      <span className="font-semibold text-emerald-700">
                        {deptAdditionalStats.underBudgetCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>On target (±1%)</span>
                      <span className="font-semibold text-slate-900">
                        {deptAdditionalStats.onTargetCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Over budget</span>
                      <span className="font-semibold text-red-700">
                        {deptAdditionalStats.overBudgetCount}
                      </span>
                    </div>
                  </div>
                )}
              </CardContainer>

              {/* Top vendors */}
              <CardContainer>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Top vendors ({yearLabel})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Largest vendors by total spending in the selected year.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {transactionsForYear.length.toLocaleString(
                      "en-US"
                    )}{" "}
                    transactions
                  </div>
                </div>

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

              {/* Guidance card */}
              <CardContainer>
                <div className="space-y-2 text-xs text-slate-600">
                  <h2 className="text-sm font-semibold text-slate-800">
                    How to use this page
                  </h2>
                  <p>
                    Use this citywide view to quickly answer high-level
                    questions about budget execution, spending trends, and
                    department performance across the city.
                  </p>
                  <p>
                    For example, you can identify which departments are
                    consistently over or under budget, how spending compares
                    year over year, and where the largest vendors and
                    categories of spending are.
                  </p>
                  <p>
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
      </div>
    </div>
  );
}
