// components/City/VendorsDashboardClient.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { TransactionRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  years: number[];
  selectedYear: number | null;
  transactions: TransactionRow[];
  vendorQuery: string | null;
};

type VendorRow = {
  name: string;
  total: number;
  count: number;
  avg: number;
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
    if (trimmed.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function VendorsDashboardClient({
  years,
  selectedYear,
  transactions,
  vendorQuery,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vendorInput, setVendorInput] = useState<string>(
    vendorQuery ?? ""
  );

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const vendorRows: VendorRow[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const tx of transactions) {
      const raw =
        tx.vendor && tx.vendor.trim().length > 0
          ? tx.vendor.trim()
          : "Unspecified";
      const amt = Number(tx.amount || 0);
      const entry = map.get(raw) ?? { total: 0, count: 0 };
      entry.total += amt;
      entry.count += 1;
      map.set(raw, entry);
    }

    let rows: VendorRow[] = Array.from(map.entries()).map(
      ([name, v]) => ({
        name,
        total: v.total,
        count: v.count,
        avg: v.count > 0 ? v.total / v.count : 0,
      })
    );

    const q = vendorQuery?.trim().toLowerCase();
    if (q && q.length > 0) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }

    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [transactions, vendorQuery]);

  const totalVendors = vendorRows.length;
  const totalSpend = vendorRows.reduce((sum, v) => sum + v.total, 0);
  const topVendor = vendorRows[0]?.name ?? null;

  const columns: DataTableColumn<VendorRow>[] = [
    {
      key: "name",
      header: "Vendor",
      sortable: true,
      sortAccessor: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-slate-900">{row.name}</span>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (yearLabel != null) {
                params.set("year", String(yearLabel));
              }
              params.set("q", row.name);
              const qs = params.toString();
              const href = cityHref(
                qs ? `/transactions?${qs}` : "/transactions"
              );
              router.push(href);
            }}
            className="inline-flex w-fit text-[0.75rem] font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            View transactions
          </button>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total spend",
      sortable: true,
      sortAccessor: (row) => row.total,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: "count",
      header: "Transactions",
      sortable: true,
      sortAccessor: (row) => row.count,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="text-sm">
          {row.count.toLocaleString("en-US")}
        </span>
      ),
    },
    {
      key: "avg",
      header: "Average amount",
      sortable: true,
      sortAccessor: (row) => row.avg,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.avg)}
        </span>
      ),
    },
  ];

  const handleVendorSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = buildSearchUrl(pathname, searchParams, {
      q: vendorInput,
    });
    router.push(url);
  };

  const handleClearFilters = () => {
    setVendorInput("");
    const url = buildSearchUrl(pathname, searchParams, {
      q: null,
    });
    router.push(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Vendors"
        title="Vendor spending explorer"
        description="See which vendors receive the most spending for the selected fiscal year, and drill into their transactions."
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
      />

      <CardContainer>
        <section aria-label="Vendor summary" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Fiscal year
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {yearLabel ?? "Latest"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Transactions grouped by vendor.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total vendors
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalVendors.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                With at least one transaction this year.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total spend (filtered)
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(totalSpend)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sum of amounts for vendors in the current view.
              </p>
            </div>
          </div>

          {topVendor && (
            <p className="text-xs text-slate-600">
              Top vendor by spend:{" "}
              <span className="font-semibold text-slate-900">
                {topVendor}
              </span>
              .
            </p>
          )}
        </section>
      </CardContainer>

      <CardContainer>
        <section
          aria-label="Vendor filters and table"
          className="space-y-4"
        >
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form
              onSubmit={handleVendorSearchSubmit}
              className="flex-1 space-y-1"
            >
              <label
                htmlFor="vendor-search"
                className="text-xs font-medium text-slate-700"
              >
                Search vendors
              </label>
              <input
                id="vendor-search"
                type="text"
                value={vendorInput}
                onChange={(e) => setVendorInput(e.target.value)}
                placeholder="e.g. Waste Management"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </form>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVendorSearchSubmit}
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Active filter summary */}
          {vendorQuery && vendorQuery.trim().length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Active filters:</span>{" "}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                <span>Vendor contains “{vendorQuery.trim()}”</span>
              </span>
            </div>
          )}

          {/* Table */}
          <DataTable<VendorRow>
            data={vendorRows}
            columns={columns}
            getRowKey={(row) => row.name}
            pageSize={50}
            showPagination={false}
            initialSortKey="total"
            initialSortDirection="desc"
          />
        </section>
      </CardContainer>
    </div>
  );
}
