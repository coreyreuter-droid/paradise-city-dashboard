// app/[citySlug]/download/page.tsx
import { Suspense } from "react";
import DownloadCenterClient from "@/components/City/DownloadCenterClient";
import {
  getPortalSettings,
  getPortalFiscalYears,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

async function getDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("department_name")
    .order("department_name");

  if (error) {
    console.error("Error fetching departments:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: any) => {
    if (row.department_name?.trim()) {
      unique.add(row.department_name.trim());
    }
  });

  return Array.from(unique).sort();
}

async function getVendors(): Promise<string[]> {
  const { data, error } = await supabase
    .from("transaction_year_vendor")
    .select("vendor")
    .order("total_amount", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: any) => {
    if (row.vendor?.trim()) {
      unique.add(row.vendor.trim());
    }
  });

  return Array.from(unique);
}

async function getRevenueSources(): Promise<string[]> {
  const { data, error } = await supabase
    .from("revenues")
    .select("category")
    .limit(1000);

  if (error) {
    console.error("Error fetching revenue sources:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: any) => {
    if (row.category?.trim()) {
      unique.add(row.category.trim());
    }
  });

  return Array.from(unique).sort();
}

async function getRecordCounts(): Promise<{
  budgets: number;
  actuals: number;
  transactions: number;
  revenues: number;
}> {
  const [budgets, actuals, transactions, revenues] = await Promise.all([
    supabase.from("budgets").select("*", { count: "exact", head: true }),
    supabase.from("actuals").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase.from("revenues").select("*", { count: "exact", head: true }),
  ]);

  return {
    budgets: budgets.count ?? 0,
    actuals: actuals.count ?? 0,
    transactions: transactions.count ?? 0,
    revenues: revenues.count ?? 0,
  };
}

export default async function DownloadPage() {
  const [settings, years, departments, vendors, revenueSources, recordCounts] =
    await Promise.all([
      getPortalSettings(),
      getPortalFiscalYears(),
      getDepartments(),
      getVendors(),
      getRevenueSources(),
      getRecordCounts(),
    ]);

  const enableActuals = settings?.enable_actuals !== false;
  const enableTransactions = settings?.enable_transactions === true;
  const enableVendors = enableTransactions && settings?.enable_vendors === true;
  const enableRevenues = settings?.enable_revenues === true;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-sm text-slate-500">Loading download options...</div>
        </div>
      }
    >
      <DownloadCenterClient
        years={years}
        departments={departments}
        vendors={vendors}
        revenueSources={revenueSources}
        enableActuals={enableActuals}
        enableTransactions={enableTransactions}
        enableVendors={enableVendors}
        enableRevenues={enableRevenues}
        recordCounts={recordCounts}
      />
    </Suspense>
  );
}
