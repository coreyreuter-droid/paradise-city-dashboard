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
  if (abs >= 1_000_000_000) {
    return `$${(v / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(v);
};

const buildDistribution = (
  base: DistributionSlice[]
): DistributionSlice[] => {
  if (base.length <= 7) return base;

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

const safeFiscalYear = (
  value:
    | BudgetRow["fiscal_year"]
    | ActualRow["fiscal_year"]
    | TransactionRow["fiscal_year"]
): number | null => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  // Filter budgets + actuals to selected year
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

    const budgetsForYear = budgets.filter(
      (b) => safeFiscalYear(b.fiscal_year) === selectedYear
    );
    const actualsForYear = actuals.filter(
      (a) => safeFiscalYear(a.fiscal_year) === selectedYear
    );

    const byDept = new Map<string, DepartmentSummary>();

    budgetsForYear.forEach((row) => {
      const name = row.department_name || "Unspecified";
      const existing = byDept.get(name) || {
        department_name: name,
        budget: 0,
        actuals: 0,
        variance: 0,
        percentSpent: 0,
      };
      existing.budget += Number(row.amount || 0);
      byDept.set(name, existing);
    });

    actualsForYear.forEach((row) => {
      const name = row.department_name || "Unspecified";
      const existing = byDept.get(name) || {
        department_name: name,
        budget: 0,
        actuals: 0,
        variance: 0,
        percentSpent: 0,
      };
      existing.actuals += Number(row.amount || 0);
      byDept.set(name, existing);
    });

    const summaries: DepartmentSummary[] = Array.from(byDept.values()).map(
      (d) => {
        const variance = Number(d.actuals) - Number(d.budget);
        const percentSpent =
          d.budget === 0 ? 0 : (Number(d.actuals) / Number(d.budget)) * 100;
        return {
          ...d,
          variance,
          percentSpent,
        };
      }
    );

    // sort by budget desc
    summaries.sort((a, b) => b.budget - a.budget);

    const totalBudget = summaries.reduce(
      (sum, d) => sum + Number(d.budget || 0),
      0
    );
    const totalActuals = summaries.reduce(
      (sum, d) => sum + Number(d.actuals || 0),
      0
    );

    return {
      deptSummaries: summaries,
      totalBudget,
      totalActuals,
      budgetsForYear,
      actualsForYear,
    };
  }, [budgets, actuals, selectedYear]);

  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const execPctClamped = Math.max(0, Math.min(execPct, 200));
  const execPctDisplay = Math.max(0, execPct);

  const hasAnyActualsForSelectedYear = deptSummaries.some(
    (d) => d.actuals > 0
  );

  // Total transactions + top vendors for selected year
  const { transactionsForYear, topVendors, totalVendorSpend } = useMemo(() => {
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

    const vendors: VendorSummary[] = Array.from(byVendor.entries())
      .map(([name, total]) => ({
        name,
        total,
        percent:
          totalVendorSpend === 0 ? 0 : (total / totalVendorSpend) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      transactionsForYear: filtered,
      topVendors: vendors,
      totalVendorSpend,
    };
  }, [transactions, selectedYear]);

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

  // Multi-year variance matrix + stats
  const deptYearVarianceRows: DeptYearVarianceRow[] = useMemo(() => {
    if (budgets.length === 0 && actuals.length === 0) {
      return [];
    }

    const depts = new Set<string>();
    const yearsSet = new Set<number>();

    budgets.forEach((b) => {
      const dept = b.department_name || "Unspecified";
      const fy = b.fiscal_year;
      depts.add(dept);
      yearsSet.add(fy);
    });

    actuals.forEach((a) => {
      const dept = a.department_name || "Unspecified";
      const fy = a.fiscal_year;
      depts.add(dept);
      yearsSet.add(fy);
    });

    const years = Array.from(yearsSet).sort((a, b) => a - b);

    const rows: DeptYearVarianceRow[] = [];

    depts.forEach((dept) => {
      const byYear: DeptYearVarianceRow["byYear"] = {};

      years.forEach((year) => {
        const budgetTotal = budgets
          .filter(
            (b) =>
              b.department_name === dept && b.fiscal_year === year
          )
          .reduce((sum, b) => sum + Number(b.amount || 0), 0);

        const actualsTotal = actuals
          .filter(
            (a) =>
              a.department_name === dept && a.fiscal_year === year
          )
          .reduce((sum, a) => sum + Number(a.amount || 0), 0);

        const variance = actualsTotal - budgetTotal;
        const percentSpent =
          budgetTotal === 0 ? 0 : (actualsTotal / budgetTotal) * 100;

        byYear[year] = {
          variance,
          percentSpent,
        };
      });

      rows.push({
        department_name: dept,
        byYear,
      });
    });

    const latestYear =
      years.length > 0 ? years[years.length - 1] : undefined;

    if (!latestYear) return rows;

    // sort by absolute variance in latest year
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

      result.push({
        year,
        Budget: budgetTotal,
        Actuals: actualsTotal,
        Variance: actualsTotal - budgetTotal,
      });
    });

    return result;
  }, [budgets, actuals]);

  const deptAdditionalStats = useMemo(() => {
    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let onTargetCount = 0;

    deptSummaries.forEach((d) => {
      if (d.budget === 0 && d.actuals === 0) return;

      const variance = d.actuals - d.budget;
      const pct = d.percentSpent;

      if (Math.abs(pct - 100) <= 1) {
        onTargetCount += 1;
      } else if (variance > 0) {
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

  const totalTransactionsCount = transactionsForYear.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Citywide analytics"
          title="Budget, spending, and vendors"
          description="High-level trends, department performance, and vendor-level spending across the city."
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
          <Link
            href={cityHref("/")}
            className="hover:text-slate-800"
          >
            Overview
          </Link>
          <span className="text-slate-400">›</span>
          <span className="font-medium text-slate-700">
            Analytics
          </span>
        </nav>

        <div className="space-y-6">
          {/* High-level KPIs */}
          <CardContainer>
            <section
              aria-label="Citywide budget and spending summary"
              className="grid gap-4 md:grid-cols-4"
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total budget ({yearLabel})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalBudget)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Sum of all adopted budgets across departments.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total actuals ({yearLabel})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalActuals)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  All recorded spending for this fiscal year.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Variance (actuals - budget)
                </div>
                <div
                  className={`mt-1 text-2xl font-bold ${
                    variance < 0
                      ? "text-emerald-700"
                      : variance > 0
                      ? "text-red-700"
                      : "text-slate-900"
                  }`}
                >
                  {formatCurrency(variance)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Negative indicates citywide under-spend versus adopted
                  budget.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  % of budget spent
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPercent(execPctDisplay)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Overall execution of the adopted budget across all
                  departments.
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${
                      execPct <= 100 ? "bg-sky-500" : "bg-red-500"
                    }`}
                    style={{ width: `${execPctClamped}%` }}
                  />
                </div>
              </div>
            </section>
          </CardContainer>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left side: pies + dept chart + P&L + trend + matrix */}
            <div className="space-y-6 lg:col-span-2">
              {/* Distribution pies */}
              <div className="grid gap-4 md:grid-cols-2">
                <CardContainer>
                  <figure
                    role="group"
                    aria-labelledby="budget-distribution-heading"
                    aria-describedby="budget-distribution-desc"
                    className="space-y-3"
                  >
                    <div>
                      <h2
                        id="budget-distribution-heading"
                        className="mb-1 text-sm font-semibold text-slate-800"
                      >
                        Budget distribution by department
                      </h2>
                      <p
                        id="budget-distribution-desc"
                        className="mb-2 text-xs text-slate-500"
                      >
                        How the adopted budget is allocated across departments
                        for{" "}
                        {yearLabel}.
                      </p>
                    </div>

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
                                paddingAngle={1}
                              >
                                {budgetDistribution.map((entry, index) => (
                                  <Cell
                                    key={entry.name}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
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

                        <div className="overflow-x-auto">
                          <table className="mt-3 min-w-full border border-slate-200 text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left">
                                  Department
                                </th>
                                <th scope="col" className="px-3 py-2 text-right">
                                  Budget
                                </th>
                                <th scope="col" className="px-3 py-2 text-right">
                                  Share of budget
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {budgetDistribution.map((slice) => {
                                const total = budgetDistribution.reduce(
                                  (sum, s) => sum + s.value,
                                  0
                                );
                                const percent =
                                  total === 0 ? 0 : (slice.value / total) * 100;

                                return (
                                  <tr key={slice.name}>
                                    <th
                                      scope="row"
                                      className="px-3 py-2 text-left font-medium text-slate-800"
                                    >
                                      {slice.name}
                                    </th>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {formatCurrency(slice.value)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {formatPercent(percent)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </figure>
                </CardContainer>

                <CardContainer>
                  <figure
                    role="group"
                    aria-labelledby="actuals-distribution-heading"
                    aria-describedby="actuals-distribution-desc"
                    className="space-y-3"
                  >
                    <div>
                      <h2
                        id="actuals-distribution-heading"
                        className="mb-1 text-sm font-semibold text-slate-800"
                      >
                        Spending distribution by department
                      </h2>
                      <p
                        id="actuals-distribution-desc"
                        className="mb-2 text-xs text-slate-500"
                      >
                        Where actual spending has gone so far in{" "}
                        {yearLabel}.
                      </p>
                    </div>

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
                                paddingAngle={1}
                              >
                                {actualsDistribution.map((entry, index) => (
                                  <Cell
                                    key={entry.name}
                                    fill={
                                      PIE_COLORS[index % PIE_COLORS.length]
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

                        <div className="overflow-x-auto">
                          <table className="mt-3 min-w-full border border-slate-200 text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left">
                                  Department
                                </th>
                                <th scope="col" className="px-3 py-2 text-right">
                                  Actuals
                                </th>
                                <th scope="col" className="px-3 py-2 text-right">
                                  Share of spending
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {actualsDistribution.map((slice) => {
                                const total = actualsDistribution.reduce(
                                  (sum, s) => sum + s.value,
                                  0
                                );
                                const percent =
                                  total === 0 ? 0 : (slice.value / total) * 100;

                                return (
                                  <tr key={slice.name}>
                                    <th
                                      scope="row"
                                      className="px-3 py-2 text-left font-medium text-slate-800"
                                    >
                                      {slice.name}
                                    </th>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {formatCurrency(slice.value)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {formatPercent(percent)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </figure>
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
                    showTable={true}
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
                          variance < 0
                            ? "text-emerald-700"
                            : variance > 0
                            ? "text-red-700"
                            : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(variance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        % of budget spent
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
                <figure
                  role="group"
                  aria-labelledby="citywide-yoy-heading"
                  aria-describedby="citywide-yoy-desc"
                  className="space-y-3"
                >
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2
                        id="citywide-yoy-heading"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Citywide budget vs actuals over time
                      </h2>
                      <p
                        id="citywide-yoy-desc"
                        className="text-xs text-slate-500"
                      >
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
                    <>
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

                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full border border-slate-200 text-xs">
                          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left">
                                Fiscal year
                              </th>
                              <th scope="col" className="px-3 py-2 text-right">
                                Budget
                              </th>
                              <th scope="col" className="px-3 py-2 text-right">
                                Actuals
                              </th>
                              <th scope="col" className="px-3 py-2 text-right">
                                Variance
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {yoyTrendData.map((row) => (
                              <tr key={row.year}>
                                <th
                                  scope="row"
                                  className="px-3 py-2 text-left font-medium text-slate-800"
                                >
                                  {row.year}
                                </th>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  {formatCurrency(row.Budget)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  {formatCurrency(row.Actuals)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  {formatCurrency(row.Variance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </figure>
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
                        {deptYearVarianceRows.map((row) => (
                          <tr
                            key={row.department_name}
                            className="border-t border-slate-200"
                          >
                            <th
                              scope="row"
                              className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left font-medium text-slate-800"
                            >
                              {row.department_name}
                            </th>
                            {years
                              .slice()
                              .sort((a, b) => a - b)
                              .map((year) => {
                                const cell = row.byYear[year];
                                if (!cell) {
                                  return (
                                    <td
                                      key={year}
                                      className="px-2 py-1 text-center text-slate-300"
                                    >
                                      –
                                    </td>
                                  );
                                }

                                const varianceVal = cell.variance;
                                const pct = cell.percentSpent;
                                const isOver = varianceVal > 0;
                                const isNear =
                                  Math.abs(pct - 100) <= 1;
                                const bgClass = isNear
                                  ? "bg-slate-100 text-slate-700"
                                  : isOver
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700";

                                return (
                                  <td
                                    key={year}
                                    className={`px-2 py-1 text-right ${bgClass}`}
                                  >
                                    {formatCurrency(varianceVal)}
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-600">
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-emerald-100" />
                        <span>Under budget</span>
                        <span className="font-semibold text-emerald-700">
                          {deptAdditionalStats.underBudgetCount}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-slate-200" />
                        <span>Near budget</span>
                        <span className="font-semibold text-slate-700">
                          {deptAdditionalStats.onTargetCount}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-red-100" />
                        <span>Over budget</span>
                        <span className="font-semibold text-red-700">
                          {deptAdditionalStats.overBudgetCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContainer>
            </div>

            {/* Right side: vendors + transactions summary + guidance */}
            <div className="space-y-6">
              {/* Vendors summary */}
              <CardContainer>
                <section
                  aria-label="Top vendors for the selected fiscal year"
                  className="space-y-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">
                        Top vendors ({yearLabel})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Vendors ranked by total spending in the selected
                        fiscal year.
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {totalVendorSpend > 0 && (
                        <span>
                          Total vendor spend:{" "}
                          <span className="font-mono text-slate-900">
                            {formatCurrency(totalVendorSpend)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {topVendors.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No vendor-level spending available for this year.
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs text-slate-700">
                      {topVendors.map((vendor) => (
                        <div
                          key={vendor.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                              {vendor.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate pr-2">
                              {vendor.name}
                            </span>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="font-mono">
                              {formatCurrency(vendor.total)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatPercent(vendor.percent)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </CardContainer>

              {/* Transactions summary */}
              <CardContainer>
                <section
                  aria-label="Transactions summary"
                  className="space-y-2 text-xs text-slate-600"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">
                        Transactions overview
                      </h2>
                      <p>
                        Summary of transaction volume for{" "}
                        {yearLabel}.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Transactions
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {totalTransactionsCount.toLocaleString("en-US")}
                      </div>
                    </div>
                  </div>

                  <p>
                    Use the{" "}
                    <Link
                      href={cityHref("/transactions")}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      Transactions
                    </Link>{" "}
                    page to filter by department, vendor, or keyword and
                    export CSVs for detailed analysis.
                  </p>
                </section>
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
                    responsible for the largest share of the budget, how
                    execution compares across years, and which vendors
                    account for most of your spend.
                  </p>
                  <p>
                    Drill down into the{" "}
                    <Link
                      href={cityHref("/departments")}
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
