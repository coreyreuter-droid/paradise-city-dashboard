// app/[citySlug]/taxpayer-receipt/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import TaxpayerReceipt from "@/components/City/TaxpayerReceipt";
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearDeptRow } from "@/lib/queries";
import { cityHref } from "@/lib/cityRouting";
import { CITY_CONFIG } from "@/lib/cityConfig";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `Taxpayer Receipt – ${city} Financial Transparency`,
    description: `See how your tax dollars are spent in ${city}. Enter your property tax amount to get a personalized breakdown.`,
  };
}

export default async function TaxpayerReceiptPage() {
  const [settings, yearsRaw] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);
  const latestYear = years[0] ?? null;

  let departments: Array<{ department_name: string; budget: number }> = [];
  let totalBudget = 0;

  if (latestYear) {
    const rows = (await getBudgetActualsSummaryForYear(latestYear) ?? []) as BudgetActualsYearDeptRow[];
    departments = rows.map((r) => ({
      department_name: r.department_name ?? "Unspecified",
      budget: Number(r.budget_amount || 0),
    }));
    totalBudget = departments.reduce((s, d) => s + d.budget, 0);
  }

  const cityName = portalSettings?.city_name?.trim() || CITY_CONFIG.displayName;
  const accentColor = portalSettings?.accent_color || undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Your taxes"
        title="Taxpayer receipt"
        description={`See how your tax dollars are spent in ${cityName}. Enter your annual property tax amount to get a personalized breakdown of where your money goes.`}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">Taxpayer receipt</span>
      </nav>

      <TaxpayerReceipt
        departments={departments}
        totalBudget={totalBudget}
        fiscalYear={latestYear}
        cityName={cityName}
        accentColor={accentColor}
      />
    </div>
  );
}
