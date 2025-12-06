// components/City/HomeRecentTransactionsCard.tsx
"use client";

import type { TransactionRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

type Props = {
  year?: number;
  transactions: TransactionRow[];
  limit?: number;
};

export default function RecentTransactionsCard({
  year,
  transactions,
  limit = 8,
}: Props) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const rows = sorted.slice(0, limit);

  return (
    <section aria-label="Recent Transactions" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Recent transactions{year ? ` – ${year}` : ""}
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          No transactions available for this year.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((tx, idx) => {
            const vendor =
              tx.vendor && tx.vendor.trim().length > 0
                ? tx.vendor.trim()
                : "Unspecified vendor";
            const department = tx.department_name || null;

            return (
              <li
                key={`${tx.date}-${tx.vendor}-${idx}`}
                className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
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
                    {vendor}
                  </div>
                  {tx.description && (
                    <div className="line-clamp-2 text-[11px] text-slate-500">
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
