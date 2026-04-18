// app/[citySlug]/funds/page.tsx
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsByFundForYear,
  getBudgetActualsByFundDeptForYear,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearFundRow, BudgetActualsYearFundDeptRow } from "@/lib/queries";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import FundsListClient from "@/components/City/FundsListClient";

export const revalidate = 60;

type PageProps = {
  searchParams: { year?: string } | Promise<{ year?: string }>;
};

export default async function FundsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [settings, years] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const sortedYears = (years ?? []).slice().sort((a, b) => b - a);
  const yearParam = sp?.year ? Number(sp.year) : NaN;
  const selectedYear =
    Number.isFinite(yearParam) && sortedYears.includes(yearParam)
      ? yearParam
      : sortedYears[0] ?? null;

  let fundSummary: BudgetActualsYearFundRow[] = [];
  let fundDeptSummary: BudgetActualsYearFundDeptRow[] = [];

  if (selectedYear != null) {
    const [funds, fundDepts] = await Promise.all([
      getBudgetActualsByFundForYear(selectedYear),
      getBudgetActualsByFundDeptForYear(selectedYear),
    ]);
    fundSummary = (funds ?? []) as BudgetActualsYearFundRow[];
    fundDeptSummary = (fundDepts ?? []) as BudgetActualsYearFundDeptRow[];
  }

  const accentColor = portalSettings?.accent_color || portalSettings?.primary_color || undefined;

  return (
    <FundsListClient
      years={sortedYears}
      fundSummary={fundSummary}
      fundDeptSummary={fundDeptSummary}
      accentColor={accentColor}
    />
  );
}
