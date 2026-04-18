// app/[citySlug]/download/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import DownloadCenterClient from "@/components/City/DownloadCenterClient";
import {
  getPortalSettings,
  getPortalFiscalYears,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

async function getDepartments(): Promise<string[]> {
  // Use department-level view (aggregated, fewer rows)
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
    .select("department_name")
    .order("department_name");

  if (error) {
    console.error("Error fetching departments:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: { department_name: string | null }) => {
    if (row.department_name?.trim()) {
      unique.add(row.department_name.trim());
    }
  });

  return Array.from(unique).sort();
}

async function getVendors(): Promise<string[]> {
  // Use pre-aggregated view instead of raw transactions table
  // This has one row per vendor per year, much smaller than raw transactions
  const { data, error } = await supabase
    .from("v_transaction_year_vendor")
    .select("vendor")
    .not("vendor", "is", null);

  if (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: { vendor: string | null }) => {
    if (row.vendor?.trim()) {
      unique.add(row.vendor.trim());
    }
  });

  return Array.from(unique).sort();
}

async function getRevenueSources(): Promise<string[]> {
  const { data, error } = await supabase
    .from("revenues")
    .select("category")
    .not("category", "is", null);

  if (error) {
    console.error("Error fetching revenue sources:", error);
    return [];
  }

  const unique = new Set<string>();
  (data ?? []).forEach((row: { category: string | null }) => {
    if (row.category?.trim()) {
      unique.add(row.category.trim());
    }
  });

  return Array.from(unique).sort();
}

// Record counts are now loaded client-side for faster page load


export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `Download Center – ${city} Financial Transparency`,
    description: `Download ${city}'s financial data in CSV format for your own analysis.`,
  };
}

export default async function DownloadPage() {
  const [settings, years, departments, vendors, revenueSources] =
    await Promise.all([
      getPortalSettings(),
      getPortalFiscalYears(),
      getDepartments(),
      getVendors(),
      getRevenueSources(),
    ]);

  const enableActuals = settings?.enable_actuals !== false;
  const enableTransactions = settings?.enable_transactions === true;
  const enableVendors = enableTransactions && settings?.enable_vendors === true;
  const enableRevenues = settings?.enable_revenues === true;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-sm text-slate-600">Loading download options...</div>
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
      />
    </Suspense>
  );
}
