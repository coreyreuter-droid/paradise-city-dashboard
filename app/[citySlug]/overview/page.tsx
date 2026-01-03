// app/[citySlug]/overview/page.tsx
import ParadiseHomeClient from "@/components/City/HomeClient";
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
  getBudgetActualsYearTotals,
  getRevenuesForYear,
  getDataUploadLogs,
  getVendorSummariesForYear,
  getRecentTransactionsForYear,
} from "@/lib/queries";
import { calculateInsights } from "@/lib/insights";
import type { TransactionRow, RevenueRow } from "@/lib/types";
import type {
  PortalSettings,
  VendorYearSummary,
  BudgetActualsYearDeptRow,
  DataUploadLogRow,
} from "@/lib/queries";

export const revalidate = 60;

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  searchParams: SearchParams | Promise<SearchParams>;
};

export default async function CityOverviewPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const [portalSettings, portalYears, uploadLogsRaw, yearTotals] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
    getDataUploadLogs(),
    getBudgetActualsYearTotals(),
  ]);

  const settings = portalSettings;

  if (settings && settings.is_published === false) {
    const cityName = settings.city_name || "Your City";
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {cityName} overview is not yet published
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Staff are preparing financial data for this portal. Once it&apos;s ready,
          the budget and spending overview will be available here.
        </p>
      </div>
    );
  }

  const years = (portalYears ?? []).slice().sort((a, b) => b - a);

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
    selectedYear = Number.isFinite(parsed) && years.includes(parsed) ? parsed : years[0];
  }

  let deptBudgetActuals: BudgetActualsYearDeptRow[] = [];
  let recentTransactions: TransactionRow[] = [];
  let vendorSummaries: VendorYearSummary[] = [];
  let revenues: RevenueRow[] = [];
  let revenueTotal: number | null = null;

  if (selectedYear !== undefined) {
    const enableTransactions = settings?.enable_transactions === true;
    const enableVendors = enableTransactions && settings?.enable_vendors === true;
    const enableRevenues = settings?.enable_revenues === true;

    const [deptRows, recentTxRaw, vendorRaw, revenuesRaw] = await Promise.all([
      getBudgetActualsSummaryForYear(selectedYear),
      enableTransactions ? getRecentTransactionsForYear(selectedYear, 20) : Promise.resolve([]),
      enableVendors ? getVendorSummariesForYear(selectedYear, { limit: 500 }) : Promise.resolve([]),
      enableRevenues ? getRevenuesForYear(selectedYear) : Promise.resolve([]),
    ]);

    deptBudgetActuals = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    recentTransactions = (recentTxRaw ?? []) as TransactionRow[];
    vendorSummaries = (vendorRaw ?? []) as VendorYearSummary[];

    revenues = (revenuesRaw ?? []) as RevenueRow[];
    revenueTotal =
      enableRevenues && revenues.length > 0
        ? revenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        : null;
  }

  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

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

  const tables: Array<keyof DataFreshnessSummary> = ["budgets", "actuals", "transactions", "revenues"];
  const dataFreshness: DataFreshnessSummary = {};

  tables.forEach((tableName) => {
    const tableLogs = uploadLogs.filter((log) => log.table_name === tableName);

    if (!tableLogs.length) {
      dataFreshness[tableName] = null;
      return;
    }

    const latest = tableLogs.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];

    dataFreshness[tableName] = {
      table: tableName,
      fiscalYear:
        typeof latest.fiscal_year === "number"
          ? latest.fiscal_year
          : latest.fiscal_year
          ? Number(latest.fiscal_year)
          : null,
      rowCount:
        typeof latest.row_count === "number"
          ? latest.row_count
          : latest.row_count
          ? Number(latest.row_count)
          : null,
      lastUploadAt: latest.created_at ?? null,
    } satisfies FreshnessEntry;
  });

  // Calculate department insights for the Overview page
  const departments = deptBudgetActuals.map((d) => ({
    department_name: d.department_name || "Unspecified",
    budget: Number(d.budget_amount || 0),
    actuals: Number(d.actual_amount || 0),
    percentSpent: Number(d.budget_amount || 0) > 0
      ? (Number(d.actual_amount || 0) / Number(d.budget_amount || 0)) * 100
      : 0,
  }));

  const insights = calculateInsights({ departments });

  return (
    <ParadiseHomeClient
      deptBudgetActuals={deptBudgetActuals}
      yearTotals={yearTotals}
      recentTransactions={recentTransactions}
      vendorSummaries={vendorSummaries}
      availableYears={years}
      portalSettings={settings}
      revenues={revenues}
      revenueTotal={revenueTotal}
      dataFreshness={dataFreshness}
      insights={insights}
    />
  );
}
