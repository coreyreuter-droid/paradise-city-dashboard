// app/[citySlug]/departments/[departmentName]/page.tsx

import { notFound } from "next/navigation";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DepartmentDetailClient from "@/components/City/DepartmentDetailClient";
import {
  getPortalFiscalYears,
  getPortalSettings,
  getBudgetActualsSummaryForDepartment,
  getBudgetsForDepartmentYear,
  getActualsForDepartmentYear,
  getTransactionsForDepartmentYear,
} from "@/lib/queries";
import type { BudgetRow, ActualRow, TransactionRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = {
  year?: string | string[];
};

type ParamsShape = {
  citySlug: string;
  departmentName: string;
};

type PageProps = {
  params: ParamsShape | Promise<ParamsShape>;
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

export default async function DepartmentDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const sp = await searchParams;

  const departmentName = decodeURIComponent(resolvedParams.departmentName);

  const [settingsRaw, portalYearsRaw] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const settings = settingsRaw as PortalSettings | null;

  if (settings && settings.is_published === false) {
    return <UnpublishedMessage settings={settings} />;
  }

  const enableTransactions = settings?.enable_transactions === true;
  const enableVendors = enableTransactions && settings?.enable_vendors === true;

  const portalYears = (portalYearsRaw ?? []).slice().sort((a, b) => b - a);
  if (portalYears.length === 0) notFound();

  // YOY: use summary rows for THIS department across years (fast)
  const deptSummaryAllYears = await getBudgetActualsSummaryForDepartment(departmentName);

  const availableYears =
    deptSummaryAllYears.length > 0
      ? Array.from(new Set(deptSummaryAllYears.map((r) => Number(r.fiscal_year))))
          .filter((y) => Number.isFinite(y))
          .sort((a, b) => b - a)
      : portalYears;

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && availableYears.includes(parsedYear)
      ? parsedYear
      : availableYears[0];

  // Selected-year detail: raw rows scoped to department (fast)
  const [budgetsRaw, actualsRaw, txRaw] = await Promise.all([
    getBudgetsForDepartmentYear(departmentName, selectedYear),
    getActualsForDepartmentYear(departmentName, selectedYear),
    enableTransactions
      ? getTransactionsForDepartmentYear(departmentName, selectedYear)
      : Promise.resolve([]),
  ]);

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  const actuals = (actualsRaw ?? []) as ActualRow[];
  const transactions = (txRaw ?? []) as TransactionRow[];

  const hasAnyData =
    budgets.length > 0 ||
    actuals.length > 0 ||
    (enableTransactions && transactions.length > 0) ||
    deptSummaryAllYears.length > 0;

  if (!hasAnyData) notFound();

  return (
    <DepartmentDetailClient
      departmentName={departmentName}
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      enableVendors={enableVendors}
      availableYears={availableYears}
    />
  );
}
