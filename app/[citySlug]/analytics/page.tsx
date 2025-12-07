// app/[citySlug]/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
  getPortalSettings,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 0; // always hit Supabase; change if you want caching

type PageProps = {
  params: { citySlug: string };
};

export default async function AnalyticsPage({}: PageProps) {
  const [budgetsRaw, actualsRaw, transactionsRaw, settings] =
    await Promise.all([
      getAllBudgets(),
      getAllActuals(),
      getAllTransactions(),
      getPortalSettings(),
    ]);

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

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      enableTransactions={enableTransactions}
      enableVendors={enableVendors}
    />
  );
}
