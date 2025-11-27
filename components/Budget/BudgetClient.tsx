"use client";

import { useState } from "react";
import Link from "next/link";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import BudgetCharts from "./BudgetCharts";


type RawRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type Props = {
  budgets: RawRow[];
  actuals: RawRow[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function BudgetClient({ budgets, actuals }: Props) {
  const years = Array.from(
    new Set(budgets.map((b) => b.fiscal_year))
  ).sort((a, b) => b - a);

  const [selectedYear, setSelectedYear] = useState<number>(
    years[0] ?? new Date().getFullYear()
  );

  const handleYearChange = (yearString: string) => {
    const y = Number(yearString);
    if (!Number.isNaN(y)) setSelectedYear(y);
  };

  // Filter to selected year
  const budgetRows = budgets.filter(
    (row) => row.fiscal_year === selectedYear
  );
  const actualRows = actuals.filter(
    (row) => row.fiscal_year === selectedYear
  );

  // Aggregate budgets
  const budgetByDept = new Map<string, number>();
  budgetRows.forEach((row) => {
    const dept = row.department_name || "Unspecified";
    const amt = Number(row.amount || 0);
    budgetByDept.set(dept, (budgetByDept.get(dept) || 0) + amt);
  });

  // Aggregate actuals
  const actualsByDept = new Map<string, number>();
  actualRows.forEach((row) => {
    const dept = row.department_name || "Unspecified";
    const amt = Number(row.amount || 0);
    actualsByDept.set(dept, (actualsByDept.get(dept) || 0) + amt);
  });

  // Only show departments that exist in this year
  const departments: DepartmentSummary[] = Array.from(
    new Set([...budgetByDept.keys(), ...actualsByDept.keys()])
  ).map((dept) => {
    const budget = budgetByDept.get(dept) || 0;
    const actual = actualsByDept.get(dept) || 0;
    const percentSpent =
      budget > 0 ? Math.round((actual / budget) * 100) : 0;

    return { department_name: dept, budget, actuals: actual, percentSpent };
  });

  departments.sort((a, b) => b.budget - a.budget);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          title="Budget vs Actuals"
          description={`Summary by department for fiscal year ${selectedYear}.`}
        />

        {/* Year selector */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">
              Fiscal year
            </label>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500">
            Currently viewing: <strong>{selectedYear}</strong>
          </span>
        </div>

        {/* Charts block */}
        {departments.length > 0 && (
          <div className="mb-6">
            <BudgetCharts year={selectedYear} departments={departments} />
          </div>
        )}

        {/* Table card */}
        <CardContainer>
          {departments.length === 0 ? (
            <p className="text-slate-500">
              No budget / actuals data available for display.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Department
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Budget
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Actuals
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      % Spent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr
                      key={dept.department_name}
                      className="border-b border-slate-100"
                    >
                    <td className="px-3 py-2 text-slate-900">
                    <Link
                      href={`/paradise/departments/${encodeURIComponent(
                        dept.department_name || "Unspecified"
                      )}?year=${selectedYear}`}
                      className="text-sky-700 hover:underline"
                    >
                      {dept.department_name || "Unspecified"}
                    </Link>
                    </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatCurrency(dept.budget)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatCurrency(dept.actuals)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {dept.percentSpent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContainer>
      </div>
    </main>
  );
}
