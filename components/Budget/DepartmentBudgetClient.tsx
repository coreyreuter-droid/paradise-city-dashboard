// components/Budget/DepartmentBudgetClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import { cityHref } from "@/lib/cityRouting";

type RawRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

type TransactionRow = {
  id: string | number;
  date: string;
  fiscal_year: number;
  description: string | null;
  amount: number;
  vendor: string | null;
};

type Props = {
  departmentName?: string;
  budgets: RawRow[];
  actuals: RawRow[];
  selectedYear: number | null;
  years: number[];
  transactions: TransactionRow[];
};

type YearSummary = {
  fiscal_year: number;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type CategorySummary = {
  category: string;
  budget: number;
  actuals: number;
  variance: number;
  percentSpent: number;
};

type VendorSummary = {
  vendor: string;
  totalAmount: number;
  txCount: number;
  shareOfActuals: number;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number) =>
  `${value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}%`;

const formatAxisCurrency = (value: number) => {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

export default function DepartmentBudgetClient(props: Props) {
  const {
    departmentName,
    budgets,
    actuals,
    selectedYear,
    years,
    transactions,
  } = props;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] =
    useState<"overview" | "vendors" | "transactions">("overview");

  const year = useMemo(() => {
    if (selectedYear) return selectedYear;
    if (years.length > 0) return years[0];
    return new Date().getFullYear();
  }, [selectedYear, years]);

  const normalizedDeptName = (departmentName || "").trim().toLowerCase();

  const filteredBudgets = useMemo(() => {
    return budgets.filter((row) => {
      const deptName = (row.department_name || "").trim().toLowerCase();
      return row.fiscal_year === year && deptName === normalizedDeptName;
    });
  }, [budgets, year, normalizedDeptName]);

  const filteredActuals = useMemo(() => {
    return actuals.filter((row) => {
      const deptName = (row.department_name || "").trim().toLowerCase();
      return row.fiscal_year === year && deptName === normalizedDeptName;
    });
  }, [actuals, year, normalizedDeptName]);

  const departmentDisplayName = useMemo(() => {
    if (departmentName) return departmentName;

    const source =
      filteredBudgets[0]?.department_name ||
      filteredActuals[0]?.department_name ||
      budgets[0]?.department_name ||
      actuals[0]?.department_name;

    if (!source) return "Department";

    const trimmed = source.trim();
    if (!trimmed) return "Department";

    const lower = trimmed.toLowerCase();
    return (
      {
        airport: "Airport Operations",
        "fire dept": "Fire Department",
        "police dept": "Police Department",
      }[lower] || trimmed
    );
  }, [departmentName, filteredBudgets, filteredActuals, budgets, actuals]);

  const yearSummaries: YearSummary[] = useMemo(() => {
    if (budgets.length === 0 && actuals.length === 0) return [];

    const budgetByYear = new Map<number, number>();
    const actualByYear = new Map<number, number>();

    budgets.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount) || 0;
      budgetByYear.set(y, (budgetByYear.get(y) || 0) + amt);
    });

    actuals.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount) || 0;
      actualByYear.set(y, (actualByYear.get(y) || 0) + amt);
    });

    const allYears = Array.from(
      new Set([...budgetByYear.keys(), ...actualByYear.keys()])
    ).sort((a, b) => a - b);

    return allYears.map((y) => {
      const budget = budgetByYear.get(y) || 0;
      const actual = actualByYear.get(y) || 0;
      const percentSpent = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        fiscal_year: y,
        budget,
        actuals: actual,
        percentSpent,
      };
    });
  }, [budgets, actuals]);

  const selectedSummary = yearSummaries.find((ys) => ys.fiscal_year === year);

  const totalBudget = selectedSummary?.budget ?? 0;
  const totalActuals = selectedSummary?.actuals ?? 0;
  const variance = totalActuals - totalBudget;
  const variancePct = totalBudget === 0 ? 0 : (variance / totalBudget) * 100;
  const execPctRaw = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const execPct = Math.max(0, Math.min(100, execPctRaw));

  const chartData = yearSummaries.map((ys) => ({
    year: ys.fiscal_year,
    Budget: Math.round(ys.budget),
    Actual: Math.round(ys.actuals),
  }));

  // Transactions for selected year
  const yearTransactions = useMemo(
    () => transactions.filter((tx) => tx.fiscal_year === year),
    [transactions, year]
  );

  const vendorSummaries: VendorSummary[] = useMemo(() => {
    if (yearTransactions.length === 0) return [];

    const totalsByVendor = new Map<string, { total: number; count: number }>();
    let totalActualsForVendors = 0;

    yearTransactions.forEach((tx) => {
      const vendor =
        (tx.vendor?.trim().length ?? 0) > 0
          ? (tx.vendor as string).trim()
          : "Unspecified vendor";
      const amount = Number(tx.amount) || 0;
      const entry = totalsByVendor.get(vendor) || { total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      totalsByVendor.set(vendor, entry);
      totalActualsForVendors += amount;
    });

    return Array.from(totalsByVendor.entries())
      .map(([vendor, { total, count }]) => ({
        vendor,
        totalAmount: total,
        txCount: count,
        shareOfActuals:
          totalActualsForVendors === 0
            ? 0
            : (total / totalActualsForVendors) * 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [yearTransactions]);

  const categorySummaries: CategorySummary[] = useMemo(() => {
    if (filteredBudgets.length === 0 && filteredActuals.length === 0) {
      return [];
    }

    const categories = new Map<string, { budget: number; actuals: number }>();

    filteredBudgets.forEach((row) => {
      const category = row.department_name?.trim() || "Uncategorized";
      const amt = Number(row.amount) || 0;
      const entry = categories.get(category) || { budget: 0, actuals: 0 };
      entry.budget += amt;
      categories.set(category, entry);
    });

    filteredActuals.forEach((row) => {
      const category = row.department_name?.trim() || "Uncategorized";
      const amt = Number(row.amount) || 0;
      const entry = categories.get(category) || { budget: 0, actuals: 0 };
      entry.actuals += amt;
      categories.set(category, entry);
    });

    return Array.from(categories.entries())
      .map(([category, { budget, actuals }]) => {
        const varianceVal = actuals - budget;
        const percentSpent = budget === 0 ? 0 : (actuals / budget) * 100;
        return {
          category,
          budget,
          actuals,
          variance: varianceVal,
          percentSpent,
        };
      })
      .sort((a, b) => b.budget - a.budget);
  }, [filteredBudgets, filteredActuals]);

  const handleYearChange = (newYear: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newYear == null) {
      params.delete("year");
    } else {
      params.set("year", String(newYear));
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTabChange = (tab: "overview" | "vendors" | "transactions") => {
    setActiveTab(tab);
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      role="region"
      aria-label="Department budget details"
    >
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-3 text-xs text-slate-500">
          <Link
            href={cityHref("/budget")}
            className="hover:underline hover:text-slate-700"
          >
            Budget
          </Link>
          <span className="mx-1 text-slate-400">›</span>
          <span className="text-slate-700">
            {departmentDisplayName}
          </span>
        </div>

        <SectionHeader
          eyebrow="Department budget detail"
          title={departmentDisplayName}
          description="Compare budget vs actuals over time, review spending by category, and explore top vendors for this department."
          rightSlot={
            years.length > 0 ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="dept-year-select"
                  className="text-xs font-medium text-slate-600"
                >
                  Fiscal year
                </label>
                <select
                  id="dept-year-select"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                  value={year}
                  onChange={(e) =>
                    handleYearChange(Number(e.target.value) || null)
                  }
                >
                  {years.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          }
        />

        {/* Tabs */}
        <div className="mb-4 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`rounded-full px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === "overview"
                ? "bg-slate-900 text-slate-50 shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
            aria-pressed={activeTab === "overview"}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("vendors")}
            className={`rounded-full px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === "vendors"
                ? "bg-slate-900 text-slate-50 shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
            aria-pressed={activeTab === "vendors"}
          >
            Vendors
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("transactions")}
            className={`rounded-full px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === "transactions"
                ? "bg-slate-900 text-slate-50 shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
            aria-pressed={activeTab === "transactions"}
          >
            Transactions
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)]">
            {/* Left column: multi-year chart + table */}
            <CardContainer>
              <figure
                className="space-y-3"
                aria-labelledby="dept-budget-multi-year-heading"
                aria-describedby="dept-budget-multi-year-desc"
              >
                <div>
                  <h2
                    id="dept-budget-multi-year-heading"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Budget vs Actuals by Year
                  </h2>
                  <p
                    id="dept-budget-multi-year-desc"
                    className="mt-1 text-xs text-slate-500"
                  >
                    Each bar shows the department&apos;s adopted budget and
                    actual spending by fiscal year.
                  </p>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        tickFormatter={formatAxisCurrency}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          formatCurrency(Number(value) || 0),
                          name,
                        ]}
                        labelFormatter={(label: any) => `Fiscal year ${label}`}
                      />
                      <Bar
                        dataKey="Budget"
                        radius={[4, 4, 0, 0]}
                        barSize={18}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`budget-${index}`} fill="#cbd5f5" />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="Actual"
                        radius={[4, 4, 0, 0]}
                        barSize={18}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`actual-${index}`} fill="#0f766e" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Accessible table fallback for the chart */}
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Department budget and actuals by year
                    </caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th
                          scope="col"
                          className="px-2 py-1 font-medium text-slate-700"
                        >
                          Fiscal year
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-1 text-right font-medium text-slate-700"
                        >
                          Budget
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-1 text-right font-medium text-slate-700"
                        >
                          Actuals
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr
                          key={row.year}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <th
                            scope="row"
                            className="px-2 py-1 font-normal text-slate-800"
                          >
                            {row.year}
                          </th>
                          <td className="px-2 py-1 text-right text-slate-800">
                            {formatCurrency(row.Budget)}
                          </td>
                          <td className="px-2 py-1 text-right text-slate-800">
                            {formatCurrency(row.Actual)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            </CardContainer>

            {/* Right column: current year metrics */}
            <div className="space-y-3">
              <CardContainer>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Current year snapshot ({year})
                </div>
                <dl className="mt-3 space-y-3 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-slate-500">Adopted budget</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totalBudget)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-slate-500">Actual spending</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totalActuals)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-slate-500">Execution to-date</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatPercent(execPct)}
                    </dd>
                  </div>
                </dl>
              </CardContainer>

              <CardContainer>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Variance ({year})
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Positive variance indicates spending over the adopted budget.
                </div>
                <div
                  className={`mt-2 inline-flex items-baseline rounded-full px-2 py-1 text-[11px] font-medium ${
                    variance > 0
                      ? "bg-red-50 text-red-700"
                      : variance < 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {variance > 0
                    ? "Over budget"
                    : variance < 0
                    ? "Under budget"
                    : "On budget"}
                </div>
                <div
                  className={`mt-1 text-2xl font-bold ${
                    variance > 0
                      ? "text-red-700"
                      : variance < 0
                      ? "text-emerald-700"
                      : "text-slate-900"
                  }`}
                >
                  {formatCurrency(Math.abs(variance))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {variance >= 0 ? "Over" : "Under"} budget by{" "}
                  {variancePct.toFixed(1)}%.
                </div>
              </CardContainer>

              <CardContainer>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Budget execution ({year})
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {execPctRaw.toFixed(1)}%
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${
                      execPctRaw <= 100 ? "bg-sky-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(execPctRaw, 150))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {execPctRaw <= 100
                    ? "Within the adopted budget."
                    : "Spending has exceeded the adopted budget."}
                </div>
              </CardContainer>
            </div>
          </div>
        )}

        {activeTab === "vendors" && (
          <CardContainer>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Top Vendors ({year})
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Summarized by total actual spending for this department in the
                  selected fiscal year.
                </p>
              </div>
            </div>

            {vendorSummaries.length === 0 ? (
              <p className="text-xs text-slate-500">
                No vendor-level transactions found for this department in{" "}
                {year}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-700"
                      >
                        Vendor
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium text-slate-700"
                      >
                        Total actuals
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium text-slate-700"
                      >
                        Transactions
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium text-slate-700"
                      >
                        Share of actuals
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorSummaries.map((vendor) => (
                      <tr
                        key={vendor.vendor}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 font-normal text-slate-800"
                        >
                          {vendor.vendor}
                        </th>
                        <td className="px-3 py-2 text-right text-slate-800">
                          {formatCurrency(vendor.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-800">
                          {vendor.txCount.toLocaleString("en-US")}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-800">
                          {formatPercent(vendor.shareOfActuals)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContainer>
        )}

        {activeTab === "transactions" && (
          <CardContainer>
            <div className="mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Transactions ({year})
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Line-item transactions recorded for this department in the
                selected fiscal year.
              </p>
            </div>

            {yearTransactions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No transactions found for this department in {year}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-700"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-700"
                      >
                        Vendor
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-700"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium text-slate-700"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                          {tx.date}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {tx.vendor || "Unspecified vendor"}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {tx.description || "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(Number(tx.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContainer>
        )}
      </div>
    </div>
  );
}
