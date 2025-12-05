// components/City/RevenuesDashboardClient.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { RevenueRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";

type Props = {
  years: number[];
  selectedYear: number | null;
  revenues: RevenueRow[];
  sourceQuery: string | null;
};

type RevenueSourceRow = {
  source: string;
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

export default function RevenuesDashboardClient({
  years,
  selectedYear,
  revenues,
  sourceQuery,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [queryInput, setQueryInput] = useState<string>(
    sourceQuery ?? ""
  );

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const sourceRows: RevenueSourceRow[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const r of revenues) {
      const raw =
        r.category && r.category.trim().length > 0
          ? r.category.trim()
          : "Unspecified";
      const amt = Number(r.amount || 0);
      const current = map.get(raw) ?? { total: 0, count: 0 };
      current.total += amt;
      current.count += 1;
      map.set(raw, current);
    }

    let rows: RevenueSourceRow[] = Array.from(map.entries()).map(
      ([source, v]) => ({
        source,
        total: v.total,
        count: v.count,
        avg: v.count > 0 ? v.total / v.count : 0,
      })
    );

    const q = sourceQuery?.trim().toLowerCase();
    if (q && q.length > 0) {
      rows = rows.filter((row) =>
        row.source.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [revenues, sourceQuery]);

  const totalSources = sourceRows.length;
  const totalRevenue = sourceRows.reduce(
    (sum, r) => sum + r.total,
    0
  );
  const topSource = sourceRows[0]?.source ?? null;

  const columns: DataTableColumn<RevenueSourceRow>[] = [
    {
      key: "source",
      header: "Revenue source",
      sortable: true,
      sortAccessor: (row) => row.source.toLowerCase(),
      cell: (row) => (
        <span className="text-sm text-slate-900">{row.source}</span>
      ),
    },
    {
      key: "total",
      header: "Total revenue",
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
      header: "Records",
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
      header: "Avg per record",
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

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = buildSearchUrl(pathname, searchParams, {
      q: queryInput,
    });
    router.push(url);
  };

  const handleClearFilters = () => {
    setQueryInput("");
    const url = buildSearchUrl(pathname, searchParams, {
      q: null,
    });
    router.push(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Revenues"
        title="Revenue by source"
        description="Explore revenue by source for the selected fiscal year. Data typically includes taxes, fees, grants, and other income."
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
      />

      <CardContainer>
        <section aria-label="Revenue summary" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Fiscal year
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {yearLabel ?? "Latest"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Revenue records grouped by source.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Revenue sources
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalSources.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sources with at least one record this year.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total revenue (filtered)
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sum of all records in the current view.
              </p>
            </div>
          </div>

          {topSource && (
            <p className="text-xs text-slate-600">
              Top revenue source:{" "}
              <span className="font-semibold text-slate-900">
                {topSource}
              </span>
              .
            </p>
          )}
        </section>
      </CardContainer>

      <CardContainer>
        <section
          aria-label="Revenue filters and table"
          className="space-y-4"
        >
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 space-y-1"
            >
              <label
                htmlFor="revenue-source-search"
                className="text-xs font-medium text-slate-700"
              >
                Search revenue sources
              </label>
              <input
                id="revenue-source-search"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder='e.g. "Sales Tax", "Grants"'
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </form>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearchSubmit}
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
          {sourceQuery && sourceQuery.trim().length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Active filters:</span>{" "}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                <span>Source contains “{sourceQuery.trim()}”</span>
              </span>
            </div>
          )}

          {/* Table */}
          <DataTable<RevenueSourceRow>
            data={sourceRows}
            columns={columns}
            getRowKey={(row) => row.source}
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
