import BudgetClient from "@/components/Budget/BudgetClient";
import {
  getAllBudgets,
  getAllActuals,
} from "../../../lib/queries";
import type { BudgetRow, ActualRow } from "../../../lib/types";

export const revalidate = 0; // optional

export default async function BudgetPage() {
  const [budgetsRaw, actualsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];

  return <BudgetClient budgets={budgets} actuals={actuals} />;
}
