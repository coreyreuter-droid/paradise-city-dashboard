// app/[citySlug]/funds/[fundName]/page.tsx
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsByFundDeptForYear,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearFundDeptRow } from "@/lib/queries";
import FundDetailClient from "@/components/City/FundDetailClient";

export const revalidate = 60;

type PageProps = {
  params: { citySlug: string; fundName: string } | Promise<{ citySlug: string; fundName: string }>;
  searchParams: { year?: string } | Promise<{ year?: string }>;
};

export default async function FundDetailPage({ params, searchParams }: PageProps) {
  const p = await params;
  const sp = await searchParams;

  const fundName = decodeURIComponent(p.fundName);

  const [settings, years] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const sortedYears = (years ?? []).slice().sort((a, b) => b - a);
  const yearParam = sp?.year ? Number(sp.year) : NaN;
  const selectedYear =
    Number.isFinite(yearParam) && sortedYears.includes(yearParam)
      ? yearParam
      : sortedYears[0] ?? null;

  let fundDeptRows: BudgetActualsYearFundDeptRow[] = [];

  if (selectedYear != null) {
    const rows = await getBudgetActualsByFundDeptForYear(selectedYear);
    // Filter to just this fund
    fundDeptRows = ((rows ?? []) as BudgetActualsYearFundDeptRow[]).filter(
      (r) => (r.fund_name || "Unspecified") === fundName
    );
  }

  return (
    <FundDetailClient
      fundName={fundName}
      years={sortedYears}
      fundDeptRows={fundDeptRows}
    />
  );
}
