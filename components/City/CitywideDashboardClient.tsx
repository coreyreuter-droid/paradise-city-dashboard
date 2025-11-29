// components/City/CitywideDashboardClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { BudgetRow, ActualRow, TransactionRow } from "@/lib/types";
import { CITY_CONFIG } from "@/lib/cityConfig";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";

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

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

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

  // Aggregate budgets + actuals by department for selected year
  const { deptSummaries, totalBudget, totalActuals } = useMemo(() => {
    if (!selectedYear) {
      return {
        deptSummaries: [] as DepartmentSummary[],
        totalBudget: 0,
        totalActuals: 0,
      };
    }

    const budgetsForYear = budgets.filter(
      (b) => b.fiscal_year === selectedYear
    );
    const actualsForYear = actuals.filter(
      (a) => a.fiscal_year === selectedYear
    );

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
      const percentSpent =
        budget === 0 ? 0 : (actuals / budget) * 100;

      return {
        department_name: dept,
        budget,
        actuals,
        percentSpent,
      };
    });

    const totalBudget = summaries.reduce(
      (sum, d) => sum + d.budget,
      0
    );
    const totalActuals = summaries.reduce(
      (sum, d) => sum + d.actuals,
      0
    );

    // Sort by largest budgets first
    summaries.sort((a, b) => b.budget - a.budget);

    return {
      deptSummaries: summaries,
      totalBudget,
      totalActuals,
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

  // Top vendors by spend
  const topVendors = useMemo(() => {
    const byVendor = new Map<string, number>();
    transactionsForYear.forEach((tx) => {
      const vendor =
        tx.vendor && tx.vendor.trim().length > 0
          ? tx.vendor
          : "Unspecified";
      const amt = Number(tx.amount || 0);
      byVendor.set(vendor, (byVendor.get(vendor) || 0) + amt);
    });

    return Array.from(byVendor.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [transactionsForYear]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title="Citywide Overview"
          description="High-level view of budgets, actual spending, and top vendors across all departments."
        />

        {/* Fiscal year selector */}
        {years.length > 0 && (
          <div className="mb-4">
            <FiscalYearSelect options={years} label="Fiscal year" />
          </div>
        )}

        {/* Top-level metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
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
              Variance
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
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Department chart */}
          <div className="lg:col-span-2">
            <CardContainer>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                Budget vs actuals by department
              </h2>
              {deptSummaries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No budget/actuals data available for this year.
                </p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={deptSummaries.map((d) => ({
                        name: d.department_name,
                        Budget: d.budget,
                        Actuals: d.actuals,
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip
                        formatter={(value: any) =>
                          typeof value === "number"
                            ? formatCurrency(value)
                            : value
                        }
                      />
                      <Bar dataKey="Budget" fill={CITY_CONFIG.primaryColor} />
                      <Bar dataKey="Actuals" fill={CITY_CONFIG.accentColor} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContainer>
          </div>

          {/* Top vendors */}
          <div>
            <CardContainer>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
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
                <ul className="space-y-2 text-sm">
                  {topVendors.map((vendor) => (
                    <li
                      key={vendor.name}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate pr-2">{vendor.name}</span>
                      <span className="font-mono">
                        {formatCurrency(vendor.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContainer>

            <CardContainer>
              <div className="text-sm">
                <div className="font-semibold text-slate-800">
                  Drill into departments
                </div>
                <p className="mt-1 text-slate-500">
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
