// app/[citySlug]/overview/page.tsx

import ParadiseHomeClient from "@/components/City/HomeClient";
import {
  getAllBudgets,
  getAllActuals,
  getPortalSettings,
  getAvailableFiscalYears,
  getTransactionsForYear,
  getRevenuesForYear,
  getDataUploadLogs,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function toYear(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type PageProps = {
  params: { citySlug: string };
  searchParams?: SearchParams;
};

export default async function CityOverviewPage({
  searchParams,
}: PageProps) {
  const sp = searchParams ?? {};

  // 1) Fetch core data + upload logs
  const [
    budgetsRaw,
    actualsRaw,
    settings,
    availableYearsFromBudgets,
    uploadLogsRaw,
  ] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    getPortalSettings(),
    getAvailableFiscalYears(),
    getDataUploadLogs(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  // Gate overview if not published
  if (portalSettings && portalSettings.is_published === false) {
    const cityName = portalSettings.city_name || "Your City";

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {cityName} overview is not yet published
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Staff are preparing financial data for this portal. Once
          it&apos;s ready, the budget and spending overview will be
          available here.
        </p>
      </div>
    );
  }

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  const actuals = (actualsRaw ?? []) as ActualRow[];

  // 2) Build unified fiscal year list: budgets + actuals + explicit list
  const yearSet = new Set<number>();

  (availableYearsFromBudgets ?? []).forEach((y) => {
    const n = toYear(y);
    if (n !== null) yearSet.add(n);
  });

  budgets.forEach((b) => {
    const n = toYear((b as any).fiscal_year);
    if (n !== null) yearSet.add(n);
  });

  actuals.forEach((a) => {
    const n = toYear((a as any).fiscal_year);
    if (n !== null) yearSet.add(n);
  });

  const years = Array.from(yearSet).sort((a, b) => b - a); // newest first

  // 3) Determine selected fiscal year from query param (or default to latest)
  let selectedYear: number | undefined = undefined;

  if (years.length > 0) {
    const rawParam = sp.year;
    const param =
      typeof rawParam === "string"
        ? rawParam
        : Array.isArray(rawParam) && rawParam.length > 0
        ? rawParam[0]
        : undefined;

    const parsed = param ? Number(param) : NaN;

    if (Number.isFinite(parsed) && years.includes(parsed)) {
      selectedYear = parsed;
    } else {
      selectedYear = years[0];
    }
  }

  // 4) Fetch ONLY the transactions + revenues for the selected year
  let transactions: TransactionRow[] = [];
  let revenues: RevenueRow[] = [];
  let revenueTotal: number | null = null;

  if (selectedYear !== undefined) {
    const [transactionsRaw, revenuesRaw] = await Promise.all([
      getTransactionsForYear(selectedYear),
      getRevenuesForYear(selectedYear),
    ]);

    transactions =
      ((transactionsRaw ?? []) as TransactionRow[]) ?? [];

    revenues =
      ((revenuesRaw ?? []) as RevenueRow[]) ?? [];

    revenueTotal = revenues.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
  }

  // 5) Compute data freshness summary from upload logs
  const uploadLogs = (uploadLogsRaw ?? []) as any[];

  type FreshnessEntry = {
    table: string;
    fiscalYear: number | null;
    rowCount: number | null;
    lastUploadAt: string | null;
  };

  type DataFreshnessSummary = {
    budgets?: FreshnessEntry | null;
    actuals?: FreshnessEntry | null;
    transactions?: FreshnessEntry | null;
    revenues?: FreshnessEntry | null;
  };

  const tables: Array<keyof DataFreshnessSummary> = [
    "budgets",
    "actuals",
    "transactions",
    "revenues",
  ];

  const dataFreshness: DataFreshnessSummary = {};

  tables.forEach((tableName) => {
    const tableLogs = uploadLogs.filter(
      (log) => log?.table_name === tableName
    );

    if (!tableLogs.length) {
      (dataFreshness as any)[tableName] = null;
      return;
    }

    // sort descending by created_at
    const latest = tableLogs.sort((a, b) => {
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    })[0];

    (dataFreshness as any)[tableName] = {
      table: tableName,
      fiscalYear:
        typeof latest?.fiscal_year === "number"
          ? latest.fiscal_year
          : latest?.fiscal_year
          ? Number(latest.fiscal_year)
          : null,
      rowCount:
        typeof latest?.row_count === "number"
          ? latest.row_count
          : latest?.row_count
          ? Number(latest.row_count)
          : null,
      lastUploadAt: latest?.created_at ?? null,
    } satisfies FreshnessEntry;
  });

  return (
    <ParadiseHomeClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      availableYears={years}
      portalSettings={portalSettings}
      revenues={revenues}
      revenueTotal={revenueTotal}
      dataFreshness={dataFreshness}
    />
  );
}
