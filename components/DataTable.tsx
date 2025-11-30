"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from "react";

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
  showPagination?: boolean; // hide when using server-side pagination upstream
};

export default function DataTable<T>({
  data,
  columns,
  getRowKey,
  pageSize = 50,
  initialSortKey,
  initialSortDirection = "asc",
  showPagination = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(
    initialSortKey ?? null
  );
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);
  const [page, setPage] = useState(1);

  // Reset page when upstream filters change
  useEffect(() => {
    setPage(1);
  }, [data]);

  const columnsByKey = useMemo(() => {
    const map: Record<string, DataTableColumn<T>> = {};
    columns.forEach((c) => {
      map[c.key] = c;
    });
    return map;
  }, [columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return data;

    const col = columnsByKey[sortKey];
    if (!col || !col.sortable || !col.sortAccessor) return data;

    const dirMultiplier = sortDirection === "desc" ? -1 : 1;

    return [...data].sort((a, b) => {
      const av = col.sortAccessor!(a);
      const bv = col.sortAccessor!(b);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dirMultiplier;
      }

      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();

      if (as < bs) return -1 * dirMultiplier;
      if (as > bs) return 1 * dirMultiplier;
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

    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const renderSortIcon = (key: string) => {
    if (!sortKey || sortKey !== key) {
      return (
        <span className="ml-1 text-[10px] text-slate-400">
          ↕
        </span>
      );
    }

    return (
      <span className="ml-1 text-[10px] text-slate-500">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={[
                      "px-3 py-2",
                      col.headerClassName ?? "",
                      col.sortable ? "cursor-pointer select-none" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      handleHeaderClick(col.key, col)
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {col.sortable && renderSortIcon(col.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((row, idx) => (
                <tr
                  key={
                    getRowKey
                      ? getRowKey(row, idx)
                      : String(idx)
                  }
                  className="odd:bg-slate-50/40 hover:bg-sky-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        "px-3 py-2 align-top",
                        col.cellClassName ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No records to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && total > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-mono">
              {total === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            –{" "}
            <span className="font-mono">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of{" "}
            <span className="font-mono">
              {total.toLocaleString("en-US")}
            </span>{" "}
            rows
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page{" "}
              <span className="font-semibold">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {totalPages}
              </span>
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
