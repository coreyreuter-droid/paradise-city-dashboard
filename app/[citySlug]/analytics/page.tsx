// app/[citySlug]/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
  getPortalSettings,
  getRevenueYears,
  getRevenuesForYear,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 0; // always hit Supabase; change if you want caching

type PageProps = {
  params: { citySlug: string };
};

type SearchParamsShape = {
  year?: string | string[];
};

type RevenueSummary = {
  year: number;
  total: number;
};

function pickFirst(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await searchParams;

  // Load portal settings first to determine gating + whether revenues are enabled.
  const settings = await getPortalSettings();
  const portalSettings = settings as PortalSettings | null;

  // If the portal itself is not published, show the unpublished message.
  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict module gating: Analytics depends on Actuals.
  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    // City does not publish Actuals → Analytics does not exist.
    notFound();
  }

  const enableTransactions =
    portalSettings?.enable_transactions === true;

  const enableVendors =
    enableTransactions && portalSettings?.enable_vendors === true;

  const enableRevenues =
    portalSettings?.enable_revenues === true;

  // Load budgets/actuals/transactions in parallel.
  const [budgetsRaw, actualsRaw, transactionsRaw] =
    await Promise.all([
      getAllBudgets(),
      getAllActuals(),
      getAllTransactions(),
    ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  // Optional: compute a small revenue summary for the *selected* year
  // so it stays in sync with the fiscal year selector.
  let revenueSummary: RevenueSummary | null = null;

  if (enableRevenues) {
    const yearsRaw = await getRevenueYears();
    const years = (yearsRaw ?? [])
      .map((y) => Number(y))
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a); // desc, latest first

    if (years.length > 0) {
      const yearParam = pickFirst(resolvedSearchParams.year);
      const parsed = yearParam ? Number(yearParam) : NaN;

      const selectedYearForRevenue =
        Number.isFinite(parsed) && years.includes(parsed)
          ? parsed
          : years[0];

      const revenues: RevenueRow[] =
        (await getRevenuesForYear(selectedYearForRevenue)) ?? [];

      if (revenues.length > 0) {
        const total = revenues.reduce(
          (sum, r) => sum + Number(r.amount || 0),
          0
        );
        revenueSummary = {
          year: selectedYearForRevenue,
          total,
        };
      } else {
        // No rows for that year → treat as no summary
        revenueSummary = null;
      }
    }
  }

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      enableTransactions={enableTransactions}
      enableVendors={enableVendors}
      enableRevenues={enableRevenues}
      revenueSummary={revenueSummary}
    />
  );
}
