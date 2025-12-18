// components/City/DepartmentDetailClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { BudgetRow, ActualRow, TransactionRow } from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";
import { cityHref } from "@/lib/cityRouting";

type DeptYearPoint = { year: number; budget: number; actuals: number };

type Props = {
  departmentName?: string;
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  enableVendors: boolean;
  /** Optional: used for FY selector (avoids needing all-years raw data). */
  availableYears?: number[];
  /** Optional: used for YOY chart/table (avoids needing all-years raw data). */
  multiYearSeriesOverride?: DeptYearPoint[];
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
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const formatPercent = (value: number) => `${value.toFixed(1).replace(/-0\.0/, "0.0")}%`;

const normalizeName = (name: string | null | undefined) => (name ?? "").trim().toLowerCase();

type DeptVendorSummary = {
  name: string;
  total: number;
  txCount: number;
  percent: number;
};

type DeptCategorySummary = {
  category: string;
  total: number;
  percent: number;
};

export default function DepartmentDetailClient({
  departmentName,
  budgets,
  actuals,
  transactions,
  enableVendors,
  availableYears,
  multiYearSeriesOverride,
}: Props) {
  const searchParams = useSearchParams();
  const [activeVendor, setActiveVendor] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (departmentName && departmentName.trim().length > 0) return departmentName;

    const fromQuery = searchParams.get("department") || searchParams.get("dept");
    if (fromQuery && fromQuery.trim().length > 0) return fromQuery;

    const fromBudgets = budgets.find((b) => b.department_name)?.department_name;
    if (fromBudgets && fromBudgets.trim().length > 0) return fromBudgets;

    const fromActuals = actuals.find((a) => a.department_name)?.department_name;
    if (fromActuals && fromActuals.trim().length > 0) return fromActuals;

    const fromTx = transactions.find((t) => t.department_name)?.department_name;
    if (fromTx && fromTx.trim().length > 0) return fromTx;

    return "Department detail";
  }, [departmentName, searchParams, budgets, actuals, transactions]);

  const normalizedDisplay = useMemo(() => normalizeName(displayName), [displayName]);

  const deptBudgets = useMemo(
    () => budgets.filter((b) => normalizeName(b.department_name) === normalizedDisplay),
    [budgets, normalizedDisplay]
  );

  const deptActuals = useMemo(
    () => actuals.filter((a) => normalizeName(a.department_name) === normalizedDisplay),
    [actuals, normalizedDisplay]
  );

  const deptTx = useMemo(
    () => transactions.filter((t) => normalizeName(t.department_name) === normalizedDisplay),
    [transactions, normalizedDisplay]
  );

  const deptYears = useMemo(() => {
    if (Array.isArray(availableYears) && availableYears.length > 0) {
      return [...availableYears]
        .map((y) => Number(y))
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => b - a);
    }

    const set = new Set<number>();
    deptBudgets.forEach((b) => set.add(b.fiscal_year));
    deptActuals.forEach((a) => set.add(a.fiscal_year));
    deptTx.forEach((t) => set.add(t.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, deptBudgets, deptActuals, deptTx]);

  const selectedYear = useMemo(() => {
    if (deptYears.length === 0) return undefined;

    const yearParam = searchParams.get("year");
    if (!yearParam) return deptYears[0];

    const parsed = Number(yearParam);
    if (Number.isNaN(parsed)) return deptYears[0];

    if (!deptYears.includes(parsed)) return deptYears[0];

    return parsed;
  }, [searchParams, deptYears]);

  const multiYearSeriesComputed = useMemo(() => {
    const byYear = new Map<number, { year: number; budget: number; actuals: number }>();

    deptBudgets.forEach((b) => {
      const year = b.fiscal_year;
      const entry = byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.budget += Number(b.amount || 0);
      byYear.set(year, entry);
    });

    deptActuals.forEach((a) => {
      const year = a.fiscal_year;
      const entry = byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.actuals += Number(a.amount || 0);
      byYear.set(year, entry);
    });

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [deptBudgets, deptActuals]);

  const multiYearSeries = useMemo(() => {
    if (Array.isArray(multiYearSeriesOverride) && multiYearSeriesOverride.length > 0) {
      return [...multiYearSeriesOverride]
        .map((p) => ({ year: Number(p.year), budget: Number(p.budget || 0), actuals: Number(p.actuals || 0) }))
        .filter((p) => Number.isFinite(p.year))
        .sort((a, b) => a.year - b.year);
    }
    return multiYearSeriesComputed;
  }, [multiYearSeriesOverride, multiYearSeriesComputed]);

  const selectedYearTotals = useMemo(() => {
    if (!selectedYear) return { budget: 0, actuals: 0, variance: 0, percentSpent: 0 };

    const totalBudget = deptBudgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const totalActuals = deptActuals.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const variance = totalActuals - totalBudget;
    const percentSpent = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

    return { budget: totalBudget, actuals: totalActuals, variance, percentSpent };
  }, [deptBudgets, deptActuals, selectedYear]);

  const deptTxForYear = useMemo(
    () =>
      selectedYear
        ? deptTx
            .filter((t) => t.fiscal_year === selectedYear)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [],
    [deptTx, selectedYear]
  );

  const deptVendorSummaries: DeptVendorSummary[] = useMemo(() => {
    if (!enableVendors) return [];
    if (deptTxForYear.length === 0) return [];

    const byVendor = new Map<string, { total: number; count: number }>();

    deptTxForYear.forEach((tx) => {
      const name = tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified";
      const amt = Number(tx.amount || 0);
      const existing = byVendor.get(name) || { total: 0, count: 0 };
      existing.total += amt;
      existing.count += 1;
      byVendor.set(name, existing);
    });

    const grandTotal = Array.from(byVendor.values()).reduce((sum, v) => sum + v.total, 0);

    return Array.from(byVendor.entries())
      .map(([name, info]) => ({
        name,
        total: info.total,
        txCount: info.count,
        percent: grandTotal === 0 ? 0 : (info.total / grandTotal) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptTxForYear, enableVendors]);

  const deptCategorySummaries: DeptCategorySummary[] = useMemo(() => {
    if (!selectedYear) return [];
    if (deptActuals.length === 0) return [];

    const byCategory = new Map<string, number>();

    deptActuals.forEach((row) => {
      const cat = row.category && row.category.trim().length > 0 ? row.category : "Unspecified";
      const amt = Number(row.amount || 0);
      byCategory.set(cat, (byCategory.get(cat) || 0) + amt);
    });

    const grandTotal = Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0);

    return Array.from(byCategory.entries())
      .map(([category, totalAmt]) => ({
        category,
        total: totalAmt,
        percent: grandTotal === 0 ? 0 : (totalAmt / grandTotal) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptActuals, selectedYear]);

  const activeVendorTx = useMemo(() => {
    if (!enableVendors || !activeVendor || !selectedYear) return [];
    return deptTxForYear.filter(
      (tx) => (tx.vendor && tx.vendor.trim().length > 0 ? tx.vendor : "Unspecified") === activeVendor
    );
  }, [activeVendor, deptTxForYear, selectedYear, enableVendors]);

  const baseTransactionColumns: DataTableColumn<TransactionRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        sortAccessor: (row) => row.date,
        cellClassName: "whitespace-nowrap",
        cell: (row) => row.date,
      },
      {
        key: "vendor",
        header: "Vendor",
        sortable: true,
        sortAccessor: (row) => (row.vendor || "Unspecified").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const name = row.vendor || "Unspecified";
          return (
            <button
              type="button"
              onClick={() => (enableVendors ? setActiveVendor(name) : undefined)}
              className={
                enableVendors
                  ? "whitespace-nowrap text-sky-700 hover:underline"
                  : "whitespace-nowrap text-slate-700"
              }
              aria-disabled={!enableVendors}
            >
              {enableVendors ? name : "Hidden"}
            </button>
          );
        },
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        sortAccessor: (row) => (row.description || "").toLowerCase(),
        cell: (row) => row.description || <span className="italic text-slate-600">No description</span>,
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        sortAccessor: (row) => Number(row.amount || 0),
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (row) => formatCurrency(Number(row.amount || 0)),
      },
    ],
    [enableVendors]
  );

  const transactionColumns = useMemo(() => {
    if (enableVendors) return baseTransactionColumns;
    return baseTransactionColumns.filter((col) => col.key !== "vendor");
  }, [baseTransactionColumns, enableVendors]);

  const vendorTotal = useMemo(() => activeVendorTx.reduce((sum, t) => sum + Number(t.amount || 0), 0), [activeVendorTx]);

  // --- UI below is unchanged from your current version ---
  // (rest of your JSX remains the same as you provided)

  return (
    <div id="main-content" className="min-h-screen bg-slate-50">
      {/* KEEP YOUR EXISTING JSX HERE */}
      {/* I’m not re-pasting the full JSX again in this message because you already have it in your current file.
          The only changes above are: props + deptYears + multiYearSeries override. */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ... your existing UI ... */}
      </div>

      {enableVendors && activeVendor && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          {/* ... your existing slideout ... */}
        </div>
      )}
    </div>
  );
}
