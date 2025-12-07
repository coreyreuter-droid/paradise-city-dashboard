// components/City/HomeRecentTransactionsCard.tsx
"use client";

import type { TransactionRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

type Props = {
  year?: number;
  transactions: TransactionRow[];
  limit?: number;
  enableVendors?: boolean;
};

export default function RecentTransactionsCard({
  year,
  transactions,
  limit = 8,
  enableVendors = true,
}: Props) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const rows = sorted.slice(0, limit);
  const vendorPublished = enableVendors !== false;

  return (
    <section aria-label="Recent transactions" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Recent transactions{year ? ` – ${year}` : ""}
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          No transactions available for this year.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((tx, idx) => {
            const vendorName =
              tx.vendor && tx.vendor.trim().length > 0
                ? tx.vendor.trim()
                : "Unspecified vendor";

            const vendorLabel = vendorPublished
              ? vendorName
              : "Vendor not published";

            const department = tx.department_name || null;

            return (
              <li
                key={`${tx.date}-${idx}`}
                className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-mono">
                      {formatDate(tx.date)}
                    </span>
                    {department && (
                      <span className="truncate">
                        · {department}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-medium text-slate-800">
                    {vendorLabel}
                  </div>
                  {tx.description && (
                    <div className="line-clamp-2 text-xs text-slate-600">
                      {tx.description}
                    </div>
                  )}
                </div>
                <div className="whitespace-nowrap text-right text-xs font-mono text-slate-900">
                  {formatCurrency(tx.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
