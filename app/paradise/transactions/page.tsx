// app/paradise/transactions/page.tsx
import TransactionsDashboardClient from "@/components/City/TransactionsDashboardClient";
import { getAllTransactions } from "../../../lib/queries";
import type { TransactionRow } from "../../../lib/types";

export const revalidate = 0;

export default async function TransactionsPage() {
  const transactionsRaw = await getAllTransactions();
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return <TransactionsDashboardClient transactions={transactions} />;
}
