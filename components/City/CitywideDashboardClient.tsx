"use client";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";



import { useMemo, useState } from "react";
import Link from "next/link";
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

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};

// Shared legend: Budget (gray) + Actual (green/red)
const MultiYearLegend = () => {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-6 text-xs">
      {/* Budget */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: "#4b5563" }} // slate-600
        />
        <span>Budget</span>
      </div>

      {/* Actual – half green, half red */}
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
          <span
            className="inline-block h-full w-1/2 float-left"
            style={{ backgroundColor: "#10b981" }} // emerald-500
          />
          <span
            className="inline-block h-full w-1/2 float-left"
            style={{ backgroundColor: "#FF746C" }} // custom red
          />
        </span>
        <span>Actual (green = under, red = over)</span>
      </div>
    </div>
  );
};

export default function CitywideDashboardClient({
  budgets,
  actuals,
  transactions,
}: Props) {
  // All years present in budgets/actuals
  const years = useMemo(
    () =>
      Array.from(
        new Set([
          ...budgets.map((b) => b.fiscal_year),
          ...actuals.map((a) => a.fiscal_year),
        ])
      ).sort((a, b) => a - b),
    [budgets, actuals]
  );

  const latestYear = years[years.length - 1] ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(latestYear);

  // Multi-year totals
  const yearSummaries = useMemo(() => {
    const budgetByYear = new Map<number, number>();
    const actualByYear = new Map<number, number>();

    budgets.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount || 0);
      budgetByYear.set(y, (budgetByYear.get(y) || 0) + amt);
    });

    actuals.forEach((row) => {
      const y = row.fiscal_year;
      const amt = Number(row.amount || 0);
      actualByYear.set(y, (actualByYear.get(y) || 0) + amt);
    });

    return Array.from(
      new Set([...budgetByYear.keys(), ...actualByYear.keys()])
    )
      .sort((a, b) => a - b)
      .map((y) => {
        const budget = budgetByYear.get(y) || 0;
        const actual = actualByYear.get(y) || 0;
        const execPct = budget > 0 ? (actual / budget) * 100 : 0;
        return { fiscal_year: y, budget, actual, execPct };
      });
  }, [budgets, actuals]);

  // YOY summaries for citywide totals
  const yoySummaries = useMemo(
    () =>
      yearSummaries.map((ys, idx) => {
        if (idx === 0) {
          return {
            ...ys,
            budgetChangePct: null as number | null,
            actualChangePct: null as number | null,
          };
        }
        const prev = yearSummaries[idx - 1];
        const budgetChangePct =
          prev.budget === 0
            ? null
            : ((ys.budget - prev.budget) / prev.budget) * 100;
        const actualChangePct =
          prev.actual === 0
            ? null
            : ((ys.actual - prev.actual) / prev.actual) * 100;

        return {
          ...ys,
          budgetChangePct,
          actualChangePct,
        };
      }),
    [yearSummaries]
  );

  const latestSummary = yearSummaries.find(
    (ys) => ys.fiscal_year === latestYear
  );

  const totalBudget = latestSummary?.budget ?? 0;
  const totalActuals = latestSummary?.actual ?? 0;
  const execPct =
    totalBudget > 0
      ? Math.max(0, Math.min(100, (totalActuals / totalBudget) * 100))
      : 0;

  const chartData = yearSummaries.map((ys) => ({
    year: ys.fiscal_year,
    Budget: Math.round(ys.budget),
    Actual: Math.round(ys.actual),
  }));

  // For selected year: dept + vendor breakdowns
  const selectedYearActuals = actuals.filter(
    (row) => row.fiscal_year === selectedYear
  );
  const selectedYearTx = transactions.filter(
    (tx) => tx.fiscal_year === selectedYear
  );

  const topDepartments = useMemo(() => {
    const map = new Map<string, number>();

    selectedYearActuals.forEach((row) => {
      const name =
        row.department_name && row.department_name.trim().length > 0
          ? row.department_name
          : "Unspecified";
      const amt = Number(row.amount || 0);
      map.set(name, (map.get(name) || 0) + amt);
    });

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [selectedYearActuals]);

  const topVendors = useMemo(() => {
    const map = new Map<string, number>();

    selectedYearTx.forEach((tx) => {
      const name =
        tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified";
      const amt = Number(tx.amount || 0);
      map.set(name, (map.get(name) || 0) + amt);
    });

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [selectedYearTx]);

  const totalActualsForYear = selectedYearActuals.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );

  // Department × Year heatmap data (actuals)
  const deptHeatmap = useMemo(() => {
    if (years.length === 0) {
      return {
        departments: [] as {
          name: string;
          byYear: Map<number, number>;
          totalAll: number;
        }[],
        max: 0,
      };
    }

    const byDept = new Map<
      string,
      { byYear: Map<number, number>; totalAll: number }
    >();

    actuals.forEach((row) => {
      const y = row.fiscal_year;
      const name =
        row.department_name && row.department_name.trim().length > 0
          ? row.department_name
          : "Unspecified";
      const amt = Number(row.amount || 0);

      if (!byDept.has(name)) {
        byDept.set(name, { byYear: new Map(), totalAll: 0 });
      }
      const entry = byDept.get(name)!;
      entry.byYear.set(y, (entry.byYear.get(y) || 0) + amt);
      entry.totalAll += amt;
    });

    const departments = Array.from(byDept.entries())
      .map(([name, info]) => ({
        name,
        byYear: info.byYear,
        totalAll: info.totalAll,
      }))
      .sort((a, b) => b.totalAll - a.totalAll)
      .slice(0, 12); // top 12 departments overall

    let max = 0;
    departments.forEach((dept) => {
      years.forEach((y) => {
        const v = dept.byYear.get(y) || 0;
        if (v > max) max = v;
      });
    });

    return { departments, max };
  }, [actuals, years]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          title="Citywide Financial Overview"
          description="Multi-year budget vs actuals, plus top departments and vendors for the selected fiscal year."
        />

        {/* Year selector for breakdown cards */}
        <div className="mt-2 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">
              Fiscal year (breakdowns)
            </label>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500">
            Latest year: <strong>{latestYear}</strong>
          </span>
        </div>

        {/* KPI strip for latest year */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total budget ({latestYear})
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(totalBudget)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total actuals ({latestYear})
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(totalActuals)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Execution rate ({latestYear})
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xl font-semibold text-slate-900">
                {execPct.toFixed(1)}%
              </p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${execPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Multi-year chart */}
        <CardContainer>
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Multi-year citywide budget vs actuals
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Total annual budget and actual spending across all departments.
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
                    barSize={16}
                    radius={[4, 4, 4, 4]}
                    fill="#4b5563"
                  />

                  {/* Actual: green if <= budget, red if > budget */}
                  <Bar dataKey="Actual" barSize={16} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`actual-cell-${index}`}
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

              <MultiYearLegend />
            </div>
          </div>
        </CardContainer>

        {/* YOY & Heatmap row */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Year-over-year citywide change */}
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Year-over-year change (citywide)
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                How total budget and actuals are changing year to year.
              </p>
              {yoySummaries.length < 2 ? (
                <p className="text-xs text-slate-500">
                  Not enough years of data to calculate year-over-year change.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Year
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Budget
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Actuals
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Budget YOY
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Actuals YOY
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yoySummaries.map((ys) => {
                        const budgetChange = ys.budgetChangePct;
                        const actualChange = ys.actualChangePct;
                        const budgetClass =
                          budgetChange == null
                            ? "text-slate-500"
                            : budgetChange >= 0
                            ? "text-emerald-700"
                            : "text-red-700";
                        const actualClass =
                          actualChange == null
                            ? "text-slate-500"
                            : actualChange >= 0
                            ? "text-emerald-700"
                            : "text-red-700";

                        return (
                          <tr
                            key={ys.fiscal_year}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-2 text-slate-800">
                              {ys.fiscal_year}
                            </td>
                            <td className="px-3 py-2 text-slate-900">
                              {formatCurrency(ys.budget)}
                            </td>
                            <td className="px-3 py-2 text-slate-900">
                              {formatCurrency(ys.actual)}
                            </td>
                            <td className={`px-3 py-2 ${budgetClass}`}>
                              {budgetChange == null
                                ? "—"
                                : `${budgetChange >= 0 ? "+" : ""}${budgetChange.toFixed(
                                    1
                                  )}%`}
                            </td>
                            <td className={`px-3 py-2 ${actualClass}`}>
                              {actualChange == null
                                ? "—"
                                : `${actualChange >= 0 ? "+" : ""}${actualChange.toFixed(
                                    1
                                  )}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContainer>

          {/* Department spending heatmap */}
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Department spending heatmap
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                Top departments by total actuals across all years. Darker cells
                indicate higher spending in that year.
              </p>
              {deptHeatmap.departments.length === 0 || deptHeatmap.max === 0 ? (
                <p className="text-xs text-slate-500">
                  Not enough actuals data to show a heatmap.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-slate-700">
                          Department
                        </th>
                        {years.map((y) => (
                          <th
                            key={y}
                            className="px-2 py-2 text-center font-semibold text-slate-700"
                          >
                            {y}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deptHeatmap.departments.map((dept) => (
                        <tr
                          key={dept.name}
                          className="border-t border-slate-100"
                        >
                          <td className="px-2 py-2 text-slate-800 whitespace-nowrap">
                            <Link
                              href={`/paradise/departments/${encodeURIComponent(
                                dept.name || "Unspecified"
                              )}?year=${selectedYear}`}
                              className="text-sky-700 hover:underline"
                            >
                              {dept.name}
                            </Link>
                          </td>
                          {years.map((y) => {
                            const v = dept.byYear.get(y) || 0;
                            const intensity =
                              deptHeatmap.max === 0
                                ? 0
                                : v / deptHeatmap.max;
                            const bgAlpha = 0.1 + intensity * 0.9; // 0.1–1.0
                            const bgColor =
                              intensity === 0
                                ? "transparent"
                                : `rgba(37, 99, 235, ${bgAlpha.toFixed(
                                    2
                                  )})`; // indigo-ish
                            const textColor =
                              intensity > 0.6 ? "#f9fafb" : "#0f172a"; // white-ish on dark

                            return (
                              <td
                                key={y}
                                className="px-2 py-2 text-center align-middle"
                                style={{
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {v === 0 ? "—" : formatCompact(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContainer>
        </div>

        {/* Two-column breakdowns: top departments & top vendors */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Top departments */}
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Top departments by actuals ({selectedYear})
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                Departments with the highest spending in the selected fiscal
                year.
              </p>
              {topDepartments.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No actuals data for this year.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Department
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Actuals
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          % of citywide
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDepartments.map((d) => {
                        const share =
                          totalActualsForYear > 0
                            ? (d.total / totalActualsForYear) * 100
                            : 0;
                        return (
                          <tr
                            key={d.name}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-2 text-slate-800">
                              <Link
                                href={`/paradise/departments/${encodeURIComponent(
                                  d.name || "Unspecified"
                                )}?year=${selectedYear}`}
                                className="text-sky-700 hover:underline"
                              >
                                {d.name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-slate-900">
                              {formatCurrency(d.total)}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {share.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContainer>

          {/* Top vendors */}
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Top vendors ({selectedYear})
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                Vendors receiving the most spending in the selected fiscal year.
              </p>
              {topVendors.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No transactions data for this year.
                </p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {topVendors.map((v) => (
                        <tr
                          key={v.name}
                          className="border-b border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-800">
                            {v.name}
                          </td>
                          <td className="px-3 py-2 text-slate-900">
                            {formatCurrency(v.total)}
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
      </div>
    </main>
  );
}
