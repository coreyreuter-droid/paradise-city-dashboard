// app/[citySlug]/departments/[departmentName]/page.tsx
import {
  getBudgetsForDepartment,
  getActualsForDepartment,
  getTransactionsForDepartment,
  getPortalSettings,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import DepartmentDetailClient from "@/components/City/DepartmentDetailClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";

// Next now hands params/searchParams as Promises in RSC.
// We accept them but only use params; the client handles ?year=
type PageProps = {
  params: {
    citySlug: string;
    departmentName: string;
  };
  searchParams: Record<string, string | string[] | undefined> | Promise<
    Record<string, string | string[] | undefined>
  >;
};

export const revalidate = 0;

export default async function DepartmentDetailPage({
  params,
}: PageProps) {
  const decodedName = decodeURIComponent(params.departmentName);

  const [budgetsRaw, actualsRaw, transactionsRaw, settings] =
    await Promise.all([
      getBudgetsForDepartment(decodedName),
      getActualsForDepartment(decodedName),
      getTransactionsForDepartment(decodedName),
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
    <DepartmentDetailClient
      departmentName={decodedName}
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}
