// components/City/VendorsDashboardClient.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DrillBarList from "../ui/DrillBarList";
import type { DrillBarItem } from "../ui/DrillBarList";
import DataTable, { DataTableColumn } from "../DataTable";
import { cityHref } from "@/lib/cityRouting";
import { formatCurrency } from "@/lib/format";
import type { VendorYearSummary } from "@/lib/queries";
import { CITY_CONFIG } from "@/lib/cityConfig";

type Props = {
  years: number[];
  selectedYear: number | null;
  vendorSummaries: VendorYearSummary[];
  vendorQuery: string | null;
};

type VendorRow = {
  name: string;
  total: number;
  txnCount: number;
};

function buildSearchUrl(
  pathname: string,
  currentParams: URLSearchParams,
  updates: { year?: string | null; q?: string | null }
): string {
  const params = new URLSearchParams(currentParams.toString());
  if (updates.year !== undefined) {
    if (!updates.year || updates.year === "latest") params.delete("year");
    else params.set("year", updates.year);
  }
  if (updates.q !== undefined) {
    const trimmed = updates.q?.trim() ?? "";
    if (trimmed.length === 0) params.delete("q");
    else params.set("q", trimmed);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function VendorsDashboardClient({
  years,
  selectedYear,
  vendorSummaries,
  vendorQuery,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vendorInput, setVendorInput] = useState<string>(vendorQuery ?? "");

  const yearLabel = selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const rows: VendorRow[] = useMemo(() => {
    return vendorSummaries
      .map((s) => ({
        name: s.vendor && s.vendor.trim().length > 0 ? s.vendor.trim() : "Unspecified",
        total: Number(s.total_amount || 0),
        txnCount: Number(s.txn_count || 0),
      }))
      .filter((r) => r.total !== 0 || r.txnCount !== 0)
      .sort((a, b) => b.total - a.total);
  }, [vendorSummaries]);

  const totalVendors = rows.length;
  const totalSpend = rows.reduce((sum, v) => sum + v.total, 0);
  const totalTxns = rows.reduce((sum, v) => sum + v.txnCount, 0);

  // Drill bar items for top vendors
  const drillItems: DrillBarItem[] = useMemo(() => {
    return rows.slice(0, 15).map((v) => ({
      name: v.name,
      budget: v.total, // use budget slot for total spend (bar visualization)
      actual: 0,
      href:
        v.name !== "Unspecified"
          ? `${cityHref("/transactions")}?q=${encodeURIComponent(v.name)}${
              selectedYear ? `&year=${selectedYear}` : ""
            }`
          : undefined,
    }));
  }, [rows, selectedYear]);

  const handleVendorSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(buildSearchUrl(pathname, searchParams, { q: vendorInput }));
  };

  const handleClearFilter = () => {
    setVendorInput("");
    router.push(buildSearchUrl(pathname, searchParams, { q: null }));
  };

  const columns: DataTableColumn<VendorRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Vendor",
        sortable: true,
        sortAccessor: (row) => row.name.toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.name === "Unspecified" ? (
            <span className="italic text-slate-500">Unspecified</span>
          ) : (
            <Link
              href={`${cityHref("/transactions")}?q=${encodeURIComponent(row.name)}${
                selectedYear ? `&year=${selectedYear}` : ""
              }`}
              className="font-medium text-slate-800 hover:underline"
            >
              {row.name}
            </Link>
          ),
      },
      {
        key: "total",
        header: "Total spend",
        sortable: true,
        sortAccessor: (row) => row.total,
        headerClassName: "text-right",
        cellClassName: "whitespace-nowrap text-right font-mono",
        cell: (row) => formatCurrency(row.total),
      },
      {
        key: "txnCount",
        header: "Transactions",
        sortable: true,
        sortAccessor: (row) => row.txnCount,
        headerClassName: "text-right",
        cellClassName: "whitespace-nowrap text-right",
        cell: (row) => row.txnCount.toLocaleString("en-US"),
      },
    ],
    [selectedYear]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Vendors"
        title="Vendor spending"
        description="See which vendors receive the most spending. Click any vendor to view their transactions."
        rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400">›</span>
        <span className="font-medium text-slate-700">Vendors</span>
      </nav>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vendors</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalVendors.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total spend</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalTxns.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <CardContainer>
        <form onSubmit={handleVendorSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end" aria-label="Vendor search">
          <div className="flex-1">
            <label htmlFor="vendor-filter" className="text-xs font-medium text-slate-700">Search vendors</label>
            <input
              id="vendor-filter"
              type="search"
              value={vendorInput}
              onChange={(e) => setVendorInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="e.g. Utilities Inc"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Search
            </button>
            {vendorQuery && (
              <button type="button" onClick={handleClearFilter} className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2">
                Clear
              </button>
            )}
          </div>
        </form>
      </CardContainer>

      {/* Visual top vendors bar chart */}
      {drillItems.length > 0 && (
        <CardContainer>
          <section aria-label="Top vendors by spend" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Top vendors — FY {yearLabel}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Click any vendor to see their transactions.
              </p>
            </div>
            <DrillBarList
              items={drillItems}
              showActuals={false}
              ariaLabel="Top vendors ranked by spend"
            />
          </section>
        </CardContainer>
      )}

      {/* Full table */}
      <CardContainer>
        <section aria-label="Vendor list" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">All vendors</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              No vendor data available for {yearLabel ?? "the selected year"}.
            </p>
          ) : (
            <DataTable<VendorRow>
              data={rows}
              columns={columns}
              getRowKey={(row) => row.name || "Unspecified"}
              pageSize={50}
              showPagination={false}
              initialSortKey="total"
              initialSortDirection="desc"
            />
          )}
        </section>
      </CardContainer>
    </div>
  );
}
