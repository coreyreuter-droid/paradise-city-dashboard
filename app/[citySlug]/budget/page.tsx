// app/[citySlug]/budget/page.tsx
import BudgetClient from "@/components/Budget/BudgetClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAllBudgets,
  getAllActuals,
  getPortalSettings,
} from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

export default async function BudgetPage() {
  const [budgetsRaw, actualsRaw, settings] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const budgets: BudgetRow[] = (budgetsRaw ?? []) as BudgetRow[];
  const actuals: ActualRow[] = (actualsRaw ?? []) as ActualRow[];

  return <BudgetClient budgets={budgets} actuals={actuals} />;
}
