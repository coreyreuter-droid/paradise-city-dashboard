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

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey?: (row: T, index: number) => string;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  showPagination?: boolean; // allow hiding footer when using server-side pagination
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

  // Reset page when data changes (filters changed upstream)
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
          ⇅
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
      <div className="overflow-x-auto text-sm">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 border-b bg-slate-100 text-xs uppercase text-slate-600">
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
                  className={[
                    "hover:bg-slate-50",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                  ].join(" ")}
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
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && (
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
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page{" "}
              <span className="font-mono">
                {currentPage}
              </span>{" "}
              /{" "}
              <span className="font-mono">
                {totalPages}
              </span>
            </span>
            <button
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
