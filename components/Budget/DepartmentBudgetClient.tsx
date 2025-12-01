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
  department_name: string | null;
};

type YearSummary = {
  fiscal_year: number;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type VendorSummary = {
  vendor_name: string;
  totalAmount: number;
  txCount: number;
  shareOfActuals: number;
};

type Props = {
  departmentName: string;
  budgets: RawRow[];
  actuals: RawRow[];
  selectedYear: number;
  years: number[];
  transactions: TransactionRow[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

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
  const { departmentName, budgets, actuals, selectedYear, years, transactions } =
    props;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [year, setYear] = useState<number>(selectedYear);

  // Sync year selector with URL
  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(nextYear));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Aggregate budgets + actuals by year
  const yearSummaries: YearSummary[] = useMemo(() => {
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
  const execPctRaw =
    totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
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

  // Vendor summaries
  const vendorSummaries: VendorSummary[] = useMemo(() => {
    if (!yearTransactions.length || totalActuals === 0) return [];

    const map = new Map<string, { total: number; count: number }>();

    yearTransactions.forEach((tx) => {
      const vendor =
        tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified";
      const amt = Number(tx.amount) || 0;
      const existing = map.get(vendor) || { total: 0, count: 0 };
      existing.total += amt;
      existing.count += 1;
      map.set(vendor, existing);
    });

    return Array.from(map.entries())
      .map(([vendor, v]) => ({
        vendor_name: vendor,
        totalAmount: v.total,
        txCount: v.count,
        shareOfActuals:
          totalActuals === 0 ? 0 : (v.total / totalActuals) * 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [yearTransactions, totalActuals]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-3 text-xs text-slate-500">
          <Link
            href="/paradise/budget"
            className="hover:underline hover:text-slate-700"
          >
            Budget
          </Link>
          <span className="mx-1 text-slate-400">›</span>
          <span className="text-slate-700">
            {departmentName} ({year})
          </span>
        </div>

        <SectionHeader
          eyebrow="Department budget overview"
          title={departmentName}
          description="Multi-year budget vs actuals and vendor spending for this department."
          rightSlot={
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-700">
                Fiscal year
              </label>
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {/* KPI cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Budget ({year})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalBudget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Actuals ({year})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalActuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatCurrency(totalActuals)} spent out of{" "}
              {formatCurrency(totalBudget)}.
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Variance ({year})
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
                style={{ width: `${Math.max(0, Math.min(execPctRaw, 150))}%` }}
              />
            </div>
          </CardContainer>
        </div>

        {/* Multi-year chart */}
        <CardContainer>
          <div className="p-4">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Multi-year budget vs actuals
                </h2>
                <p className="text-xs text-slate-500">
                  Total annual budget compared to actual spending for{" "}
                  {departmentName}.
                </p>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    tick={{ fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />

                  <Bar
                    dataKey="Budget"
                    barSize={14}
                    fill="#4b5563"
                    radius={[4, 4, 4, 4]}
                  />
                  <Bar dataKey="Actual" barSize={14} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.Actual <= entry.Budget ? "#10b981" : "#FF746C"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-slate-600" />
                  <span>Budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
                    <span className="inline-block float-left h-full w-1/2 bg-emerald-500" />
                    <span className="inline-block float-left h-full w-1/2 bg-[#FF746C]" />
                  </span>
                  <span>Actual (green = under, red = over)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContainer>

        {/* Vendors */}
        <CardContainer>
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Spending by vendor ({year})
            </h2>

            {vendorSummaries.length === 0 ? (
              <p className="text-xs text-slate-500">No transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Vendor
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Total spent
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        # Transactions
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        % of actuals
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorSummaries.map((v) => (
                      <tr
                        key={v.vendor_name}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-2">{v.vendor_name}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(v.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {v.txCount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {v.shareOfActuals.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContainer>

        {/* Recent transactions */}
        <CardContainer>
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Recent transactions ({year})
            </h2>

            {yearTransactions.length === 0 ? (
              <p className="text-xs text-slate-500">No transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Description
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Vendor
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-100 align-top"
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono">
                          {new Date(tx.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          {tx.description || "—"}
                        </td>
                        <td className="px-3 py-2">{tx.vendor || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(Number(tx.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContainer>
      </div>
    </main>
  );
}
