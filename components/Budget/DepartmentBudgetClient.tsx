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
  date: string; // transactions.date
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

  const [year, setYear] = useState<number>(selectedYear);

  // Keep URL in sync when year changes
  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);

    const params = new URLSearchParams(searchParams.toString());
    if (Number.isFinite(nextYear)) {
      params.set("year", String(nextYear));
    } else {
      params.delete("year");
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Aggregate by year
  const yearSummaries: YearSummary[] = useMemo(() => {
    const budgetByYear = new Map<number, number>();
    budgets.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount || 0);
      budgetByYear.set(y, (budgetByYear.get(y) || 0) + amt);
    });

    const actualsByYear = new Map<number, number>();
    actuals.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount || 0);
      actualsByYear.set(y, (actualsByYear.get(y) || 0) + amt);
    });

    const allYears = Array.from(
      new Set([...budgetByYear.keys(), ...actualsByYear.keys()])
    ).sort((a, b) => a - b);

    return allYears.map((y) => {
      const budget = budgetByYear.get(y) || 0;
      const actuals = actualsByYear.get(y) || 0;
      const percentSpent =
        budget > 0 ? Math.round((actuals / budget) * 100) : 0;
      return { fiscal_year: y, budget, actuals, percentSpent };
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

  // Filter transactions for the selected year using fiscal_year
  const yearTransactions = useMemo(
    () => transactions.filter((tx) => tx.fiscal_year === year),
    [transactions, year]
  );

  // Vendor/category drilldown
  const vendorSummaries: VendorSummary[] = useMemo(() => {
    if (yearTransactions.length === 0 || totalActuals === 0) {
      return [];
    }

    const map = new Map<string, { total: number; count: number }>();

    yearTransactions.forEach((tx) => {
      const key =
        tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified";

      const amt = Number(tx.amount || 0);
      const existing = map.get(key) || { total: 0, count: 0 };

      existing.total += amt;
      existing.count += 1;

      map.set(key, existing);
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
          title={departmentName}
          description="Multi-year budget vs actuals for this department."
        />

        {/* Year selector for the KPI card */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">
              Fiscal year
            </label>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
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
          <span className="text-xs text-slate-500">
            Currently viewing: <strong>{year}</strong>
          </span>
        </div>

        {/* KPI card for selected year */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold text-slate-900">
              {departmentName} – Budget vs Actuals ({year})
            </p>
            <div className="text-right text-xs text-slate-500">
              <p>Total Budget: {formatCurrency(totalBudget)}</p>
              <p>Total Actuals: {formatCurrency(totalActuals)}</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
            <span>Execution</span>
            <span>{execPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${execPct}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <span className="font-medium text-slate-800">
                {variance >= 0 ? "Over Budget" : "Under Budget"}:
              </span>{" "}
              <span
                className={variance >= 0 ? "text-red-600" : "text-emerald-600"}
              >
                {formatCurrency(Math.abs(variance))} (
                {variancePct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Multi-year chart */}
        <CardContainer>
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Multi-year trend
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Total annual budget vs actuals for {departmentName}.
            </p>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(value) =>
                      value >= 1_000_000
                        ? `${(value / 1_000_000).toFixed(1)}M`
                        : `${(value / 1_000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name) => [
                      formatCurrency(value),
                      name,
                    ]}
                  />

                  {/* Budget: dark gray */}
                  <Bar
                    dataKey="Budget"
                    barSize={14}
                    radius={[4, 4, 4, 4]}
                    fill="#4b5563"
                  />

                  {/* Actual: green if <= budget, red (#FF746C) if > budget */}
                  <Bar dataKey="Actual" barSize={14} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`dept-actual-cell-${index}`}
                        fill={
                          entry.Actual <= entry.Budget
                            ? "#10b981"
                            : "#FF746C"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Custom legend: Budget + split-color Actual */}
              <div className="mt-3 flex flex-wrap items-center gap-6 text-xs">
                {/* Budget */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: "#4b5563" }}
                  />
                  <span>Budget</span>
                </div>

                {/* Actual – half green, half red */}
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
                    <span
                      className="inline-block h-full w-1/2 float-left"
                      style={{ backgroundColor: "#10b981" }}
                    />
                    <span
                      className="inline-block h-full w-1/2 float-left"
                      style={{ backgroundColor: "#FF746C" }}
                    />
                  </span>
                  <span>Actual (green = under, red = over)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContainer>

        {/* Vendor/category drilldown */}
        <CardContainer>
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Spending by vendor ({year})
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Top spending categories for {departmentName}, grouped by vendor.
            </p>

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
                        <td className="px-3 py-2 text-slate-800">
                          {v.vendor_name}
                        </td>
                        <td className="px-3 py-2 text-slate-900">
                          {formatCurrency(v.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {v.txCount}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
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
            <p className="mb-4 text-xs text-slate-500">
              Line items for {departmentName} in the selected fiscal year.
            </p>

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
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {tx.description || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {tx.vendor || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-900 text-right">
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
