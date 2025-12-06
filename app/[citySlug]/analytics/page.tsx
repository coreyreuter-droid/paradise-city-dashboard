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

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}
