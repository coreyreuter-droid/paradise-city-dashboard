"use client";

import { useMemo, useState, ReactNode } from "react";

type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey?: (row: T, index: number) => string;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  /**
   * Hide pagination controls when the parent is doing server-side pagination.
   */
  showPagination?: boolean;
  /**
   * Accessible caption for the table (visible to screen readers).
   */
  caption?: string;
};

export default function DataTable<T>({
  data,
  columns,
  getRowKey,
  pageSize = 50,
  initialSortKey,
  initialSortDirection = "asc",
  showPagination = true,
  caption,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(
    initialSortKey ?? null
  );
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);
  const [page, setPage] = useState(1);

  const columnsByKey = useMemo(() => {
    const map = new Map<string, DataTableColumn<T>>();
    for (const col of columns) {
      map.set(col.key, col);
    }
    return map;
  }, [columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return [...data];

    const col = columnsByKey.get(sortKey);
    if (!col || !col.sortable) return [...data];

    const dirMultiplier = sortDirection === "desc" ? -1 : 1;

    return [...data].sort((a, b) => {
      const avRaw =
        col.sortAccessor?.(a) ?? (a as any)[sortKey as keyof T];
      const bvRaw =
        col.sortAccessor?.(b) ?? (b as any)[sortKey as keyof T];

      // Handle null/undefined
      if (avRaw == null && bvRaw == null) return 0;
      if (avRaw == null) return 1;
      if (bvRaw == null) return -1;

      const av =
        typeof avRaw === "number"
          ? avRaw
          : String(avRaw).toLowerCase();
      const bv =
        typeof bvRaw === "number"
          ? bvRaw
          : String(bvRaw).toLowerCase();

      if (av < bv) return -1 * dirMultiplier;
      if (av > bv) return 1 * dirMultiplier;
      return 0;
    });
  }, [data, sortKey, sortDirection, columnsByKey]);

  const total = sorted.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const handleHeaderClick = (key: string, col: DataTableColumn<T>) => {
    if (!col.sortable) return;

    setPage(1);
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDirection("asc");
        return key;
      }

      setSortDirection((prevDir) =>
        prevDir === "asc" ? "desc" : "asc"
      );
      return key;
    });
  };

  const renderSortIcon = (key: string) => {
    if (!sortKey || sortKey !== key) {
      return (
        <>
          <span className="ml-1 text-[10px] text-slate-400" aria-hidden="true">
            ↕
          </span>
          <span className="sr-only">Click to sort</span>
        </>
      );
    }

    if (sortDirection === "asc") {
      return (
        <>
          <span
            aria-hidden="true"
            className="ml-1 text-[10px] text-slate-600"
          >
            ▲
          </span>
          <span className="sr-only">Sorted ascending, click to sort descending</span>
        </>
      );
    }

    return (
      <>
        <span
          aria-hidden="true"
          className="ml-1 text-[10px] text-slate-600"
        >
          ▼
        </span>
        <span className="sr-only">Sorted descending, click to sort ascending</span>
      </>
    );
  };

  return (
    <>
      {/* Screen reader announcement for table state changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Showing ${paged.length} of ${total} records${sortKey ? `, sorted by ${sortKey} ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}
      </div>

      <div className="relative">
        <div className="overflow-x-auto">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const ariaSort: "none" | "ascending" | "descending" =
                    !col.sortable || !isSorted
                      ? "none"
                      : sortDirection === "asc"
                      ? "ascending"
                      : "descending";

                  const baseClasses =
                    "px-3 py-2 align-bottom text-xs";
                  const className = [
                    baseClasses,
                    col.headerClassName ?? "",
                    col.sortable ? "whitespace-nowrap" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  // Check if header should be right-aligned
                  const isRightAligned = col.headerClassName?.includes("text-right");

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={className}
                      aria-sort={ariaSort}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleHeaderClick(col.key, col)
                          }
                          className={`inline-flex items-center gap-1 ${isRightAligned ? "ml-auto" : ""}`}
                        >
                          <span>{col.header}</span>
                          {renderSortIcon(col.key)}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No records to display.
                  </td>
                </tr>
              ) : (
                paged.map((row, rowIndex) => {
                  const key =
                    getRowKey?.(row, rowIndex) ??
                    String(rowIndex);

                  return (
                    <tr
                      key={key}
                      className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/40"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={[
                            "px-3 py-2 align-top text-sm text-slate-700",
                            col.cellClassName ?? "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobile scroll indicator - shows fade on right edge */}
      <div 
        className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent sm:hidden" 
        aria-hidden="true"
      />
    </div>

      {showPagination && total > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page{" "}
            <span className="font-semibold">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold">{totalPages}</span>{" "}
            • Showing{" "}
            <span className="font-semibold">{paged.length}</span>{" "}
            of{" "}
            <span className="font-semibold">{total}</span> records
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              disabled={currentPage <= 1}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[44px] disabled:opacity-40"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              disabled={currentPage >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[44px] disabled:opacity-40"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}