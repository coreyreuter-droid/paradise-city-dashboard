// components/City/VendorsDashboardClient.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
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
    if (!updates.year || updates.year === "latest") {
      params.delete("year");
    } else {
      params.set("year", updates.year);
    }
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

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const rows: VendorRow[] = useMemo(() => {
    const base = vendorSummaries.map((s) => ({
      name:
        s.vendor && s.vendor.trim().length > 0
          ? s.vendor.trim()
          : "Unspecified",
      total: Number(s.total_amount || 0),
      txnCount: Number(s.txn_count || 0),
    }));

    return base
      .filter((r) => r.total !== 0 || r.txnCount !== 0)
      .sort((a, b) => b.total - a.total);
  }, [vendorSummaries]);

  const totalVendors = rows.length;
  const totalSpend = rows.reduce((sum, v) => sum + v.total, 0);
  const topVendor = rows[0]?.name ?? null;

  const handleVendorSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = buildSearchUrl(pathname, searchParams, {
      q: vendorInput,
    });
    router.push(url);
  };

  const handleClearFilter = () => {
    setVendorInput("");
    const url = buildSearchUrl(pathname, searchParams, { q: null });
    router.push(url);
  };

  const accentColor =
    CITY_CONFIG.accentColor || CITY_CONFIG.primaryColor || undefined;

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
            <span className="italic text-slate-600">Unspecified</span>
          ) : (
            <Link
              href={`${cityHref("/transactions")}?q=${encodeURIComponent(
                row.name
              )}${selectedYear ? `&year=${selectedYear}` : ""}`}
              className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline"
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
        cell: (row) => <span>{formatCurrency(row.total)}</span>,
      },
      {
        key: "txnCount",
        header: "Transactions",
        sortable: true,
        sortAccessor: (row) => row.txnCount,
        headerClassName: "text-right",
        cellClassName: "whitespace-nowrap text-right",
        cell: (row) => (
          <span>{row.txnCount.toLocaleString("en-US")}</span>
        ),
      },
    ],
    [selectedYear]
  );

  return (
    <div
      id="main-content"
      className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8"
    >
      <SectionHeader
        eyebrow="Vendors"
        title="Vendor spending explorer"
        description="See which vendors receive the most spending for the selected fiscal year, and drill into their transactions."
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
        accentColor={accentColor}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-2 px-1 text-sm text-slate-600"
      >
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href={cityHref("/overview")}
              className="hover:text-slate-800"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-500">
            ›
          </li>
          <li aria-current="page">
            <span className="font-medium text-slate-700">Vendors</span>
          </li>
        </ol>
      </nav>

      <CardContainer>
        <section
          aria-label="Vendor filters and summary"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Filters
              </h2>
              <p className="text-sm text-slate-600">
                Search vendors by name. Fiscal year is controlled in the
                header above.
              </p>
            </div>

            <form
              onSubmit={handleVendorSearchSubmit}
              className="flex w-full flex-col gap-1 sm:w-72"
              aria-label="Vendor search"
            >
              <label
                htmlFor="vendor-filter"
                className="text-xs font-medium text-slate-700"
              >
                Vendor contains
              </label>
              <div className="flex gap-2">
                <input
                  id="vendor-filter"
                  type="search"
                  value={vendorInput}
                  onChange={(e) => setVendorInput(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="e.g. Utilities Inc"
                />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                >
                  Apply
                </button>
              </div>
              {vendorQuery && vendorQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="self-start text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Clear vendor filter
                </button>
              )}
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Vendors with spend
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalVendors.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Vendors with at least one transaction in{" "}
                {yearLabel ?? "the selected year"}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Total spend
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(totalSpend)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Sum of all vendor payments for{" "}
                {yearLabel ?? "the selected year"}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Top vendor
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {topVendor ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Ranked by total spend for{" "}
                {yearLabel ?? "the selected year"}.
              </p>
            </div>
          </div>
        </section>
      </CardContainer>

      <CardContainer>
        <section aria-label="Vendor list" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Vendors
              </h2>
              <p className="text-sm text-slate-600">
                Click a vendor name to jump to their transactions in the
                Transactions explorer.
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              No vendor summary data available for{" "}
              {yearLabel ?? "the selected year"}. Try a different
              fiscal year or adjust your search.
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
